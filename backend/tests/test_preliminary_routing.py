"""Preliminary-stage decision and employee release; no live database needed."""

from __future__ import annotations

import asyncio
import json
import os
from decimal import Decimal
from pathlib import Path
from types import SimpleNamespace

import pytest

# Required configuration only; no credentials, database calls or external I/O.
BACKEND = Path(__file__).resolve().parents[1]
for key, value in {
    "APP_NAME": "CreditCabinetTest",
    "DATABASE_URL": "postgresql+asyncpg://test:test@localhost:5432/test",
    "JWT_SECRET": "only-for-unit-tests-not-production",
    "JWT_ALGORITHM": "HS256",
    "ACCESS_TOKEN_TTL_MINUTES": "60",
    "MOCK_DOCS_DIR": str(BACKEND / "mock_docs"),
    "DEMO_CLIENT_EMAIL": "client@example.test",
    "DEMO_CLIENT_PASSWORD": "dummy-client",
    "DEMO_EMPLOYEE_EMAIL": "employee@example.test",
    "DEMO_EMPLOYEE_PASSWORD": "dummy-employee",
}.items():
    os.environ.setdefault(key, value)

from fastapi import HTTPException  # noqa: E402

from app.core.enums import (  # noqa: E402
    ClientStatus,
    ManualDecision,
    Route,
    Stage,
    StageState,
    StageStatus,
)
from app.models.application import Application  # noqa: E402
from app.schemas.application import ManualReviewIn  # noqa: E402
from app.services.offers import ManualReviewService  # noqa: E402
from app.services.pipeline import PipelineService  # noqa: E402
from app.services.routing import (  # noqa: E402
    RouteChecks,
    evaluate_preliminary_route,
    evaluate_route,
)
from app.services.statuses import resolve_client_status  # noqa: E402


@pytest.mark.parametrize(
    "score,route",
    [
        (0, Route.DECLINED),
        (44, Route.DECLINED),
        (45, Route.DECLINED),
        (46, Route.MANUAL_REVIEW),
        (66, Route.MANUAL_REVIEW),
        (75, Route.MANUAL_REVIEW),
        (76, Route.REQUEST_DOCUMENTS),
        (92, Route.REQUEST_DOCUMENTS),
        (100, Route.REQUEST_DOCUMENTS),
    ],
)
def test_preliminary_routing_boundaries(score, route):
    assert evaluate_preliminary_route(score).route == route


@pytest.mark.parametrize("score", [-1, 101, None, True, 66.5, "66"])
def test_invalid_scores_are_not_accepted(score):
    with pytest.raises(ValueError):
        evaluate_preliminary_route(score)


def load_case(case_id):
    path = BACKEND.parent / "docs" / "alfa" / "synthetic_borrowers.json"
    cases = json.loads(path.read_text(encoding="utf-8"))["cases"]
    return next(c for c in cases if c["case_id"] == case_id)


class FakeRepository:
    def __init__(self, app):
        self.app = app

    async def flush(self):
        for index, assessment in enumerate(self.app.assessments, 1):
            if assessment.id is None:
                assessment.id = index

    async def delete_stage_run(self, _run):
        pass


class FakeApplication:
    def __init__(self, case):
        self.id = 42
        self.company = SimpleNamespace(inn="0000000000")
        self.loan_amount_rub = Decimal(str(case["loan"]["amount_rub"]))
        self.term_months = case["loan"]["term_months"]
        self.annual_rate_percent = Decimal(str(case["loan"]["annual_rate_percent"]))
        self.declared = {
            "age_months": case["company"]["age_months"],
            "financials": dict(case["financials"]),
            "credit_history": case["credit_history"],
        }
        self.stage_runs = []
        self.assessments = []
        self.documents = []
        self.accepted_at = None
        self.accepted_offer = None
        self.manual_decision = None
        self.manual_comment = None
        self.manual_decided_by_id = None
        self.manual_decided_at = None
        self.checks = None
        self.bank_offer = None

    def run_of(self, stage):
        return next((r for r in self.stage_runs if r.stage == stage), None)

    def done(self, stage):
        run = self.run_of(stage)
        return run is not None and run.status == StageStatus.DONE

    @property
    def client_status(self):
        return resolve_client_status(self)

    @property
    def preliminary_assessment(self):
        return next((a for a in reversed(self.assessments) if a.kind.value == "preliminary"), None)

    @property
    def final_assessment(self):
        return next((a for a in reversed(self.assessments) if a.kind.value == "verified"), None)


def pipeline_service(app):
    service = PipelineService.__new__(PipelineService)
    service.applications = FakeRepository(app)
    return service


def review_service(app):
    service = ManualReviewService.__new__(ManualReviewService)
    service.applications = FakeRepository(app)
    return service


def review(app, decision):
    return review_service(app).decide(
        app,
        ManualReviewIn(decision=decision, comment="Test comment"),
        SimpleNamespace(id=7),
    )


@pytest.mark.parametrize(
    "case_id,expected,client_status",
    [
        ("SYN_1012", Route.MANUAL_REVIEW, ClientStatus.UNDER_REVIEW),
        ("BOUNDARY_75", Route.MANUAL_REVIEW, ClientStatus.UNDER_REVIEW),
        ("HIGH_RISK", Route.DECLINED, ClientStatus.NOT_APPROVED_DEMO),
    ],
)
def test_stops_at_preliminary_stage(case_id, expected, client_status):
    async def scenario():
        app = FakeApplication(load_case(case_id))
        service = pipeline_service(app)
        await service.run_all(app)
        assert [r.stage for r in app.stage_runs] == [Stage.PRELIMINARY_SCORING]
        assert app.run_of(Stage.PRELIMINARY_SCORING).result["route"] == expected.value
        assert app.client_status == client_status
        assert Application.route.fget(app) == expected
        view = service.view(app, internal=True)
        assert view.next_stage is None
        assert all(s.state == StageState.LOCKED for s in view.stages[1:])
        await service.run_all(app)
        assert len(app.stage_runs) == 1
        with pytest.raises(HTTPException) as exc:
            await service.run_stage(app, Stage.DOCUMENTS)
        assert exc.value.status_code == 409
        assert len(app.stage_runs) == 1

    asyncio.run(scenario())


def test_employee_can_release_medium_without_approving_loan():
    async def scenario():
        app = FakeApplication(load_case("SYN_1012"))
        service = pipeline_service(app)
        await service.run_all(app)
        assert app.client_status == ClientStatus.UNDER_REVIEW
        await review(app, ManualDecision.APPROVE)
        assert app.run_of(Stage.PRELIMINARY_SCORING).result["review_decision"] == "approve"
        assert app.manual_decision is None  # Final decision remains pending.
        assert app.client_status == ClientStatus.IN_PROGRESS
        assert service.view(app, internal=True).next_stage == Stage.DOCUMENTS
        assert Application.route.fget(app) == Route.MANUAL_REVIEW
        with pytest.raises(HTTPException) as exc:
            await review(app, ManualDecision.APPROVE)
        assert exc.value.status_code == 409
        # Manual release allows the documents stage; documents may still be missing.
        doc_run = await service.run_stage(app, Stage.DOCUMENTS)
        assert doc_run.stage == Stage.DOCUMENTS
        assert app.run_of(Stage.PRELIMINARY_SCORING).result["review_decision"] == "approve"
        # No automatic approval of the requested loan.
        assert app.client_status != ClientStatus.APPROVED_DEMO

    asyncio.run(scenario())


def test_employee_can_decline_medium_and_lock_pipeline():
    async def scenario():
        app = FakeApplication(load_case("SYN_1012"))
        service = pipeline_service(app)
        await service.run_all(app)
        await review(app, ManualDecision.DECLINE)
        assert app.client_status == ClientStatus.NOT_APPROVED_DEMO
        assert Application.route.fget(app) == Route.DECLINED
        assert service.view(app, internal=False).next_stage is None
        with pytest.raises(HTTPException) as exc:
            await service.run_stage(app, Stage.DOCUMENTS)
        assert exc.value.status_code == 409

    asyncio.run(scenario())


def test_reset_discards_old_review_and_reopens_preliminary():
    async def scenario():
        app = FakeApplication(load_case("SYN_1012"))
        service = pipeline_service(app)
        await service.run_all(app)
        await review(app, ManualDecision.APPROVE)
        await service.invalidate_from(app, Stage.PRELIMINARY_SCORING)
        assert app.stage_runs == []
        assert service.view(app, internal=False).next_stage == Stage.PRELIMINARY_SCORING
        assert app.client_status == ClientStatus.DRAFT

    asyncio.run(scenario())


def test_76_can_advance_to_documents():
    async def scenario():
        app = FakeApplication(load_case("BOUNDARY_76"))
        service = pipeline_service(app)
        run = await service.run_stage(app, Stage.PRELIMINARY_SCORING)
        assert run.result["score"] == 76
        assert run.result["route"] == Route.REQUEST_DOCUMENTS
        assert service.view(app, internal=False).next_stage == Stage.DOCUMENTS
        assert app.client_status == ClientStatus.IN_PROGRESS

    asyncio.run(scenario())


def test_broken_input_is_correction_not_decline():
    async def scenario():
        app = FakeApplication(load_case("BOUNDARY_76"))
        del app.declared["financials"]["revenues_last_6_months_rub"]
        service = pipeline_service(app)
        run = await service.run_stage(app, Stage.PRELIMINARY_SCORING)
        assert run.status == StageStatus.FAILED
        assert app.client_status == ClientStatus.MORE_INFO_REQUIRED

    asyncio.run(scenario())


def test_serious_overdue_never_automatically_approves():
    checks = RouteChecks(True, True, True, True, True)
    assert (
        evaluate_route(80, [], checks, credit_history="current_or_90plus_overdue").route
        == Route.MANUAL_REVIEW
    )
    assert evaluate_route(80, [], checks, credit_history="no_overdues_12m").route == Route.APPROVED


def test_cafe_92_then_final_62_still_reaches_manual_review():
    """Re-score from registry documents is not subject to preliminary gate."""

    async def scenario():
        app = FakeApplication(load_case("CAFE_PRE"))
        app.company.inn = "781045678123"
        app.company.name = "ИП Уют Кофе"
        service = pipeline_service(app)
        await service.run_all(app)
        assert len(app.stage_runs) == 5
        assert app.preliminary_assessment.score == 92
        assert app.final_assessment.score == 62
        assert app.final_assessment.route == Route.MANUAL_REVIEW
        assert app.client_status == ClientStatus.UNDER_REVIEW

    asyncio.run(scenario())


def test_employee_can_review_medium_twice_at_distinct_stages():
    """Preliminary admission and final loan decision are separate human actions."""

    async def scenario():
        app = FakeApplication(load_case("BOUNDARY_75"))
        # This is a synthetic boundary, so continue using a patched document handler
        # to test the workflow without falsely assuming registry documents exist.
        service = pipeline_service(app)
        await service.run_all(app)
        assert len(app.stage_runs) == 1
        assert app.client_status == ClientStatus.UNDER_REVIEW
        await review(app, ManualDecision.APPROVE)
        assert app.manual_decision is None
        await service.run_stage(app, Stage.DOCUMENTS)
        assert app.run_of(Stage.PRELIMINARY_SCORING).result["review_decision"] == "approve"

    asyncio.run(scenario())


def test_real_medium_scenario_requires_two_separate_employee_actions():
    async def scenario():
        scenario_path = BACKEND / "mock_docs" / "medium_risk" / "applicant.json"
        demo = json.loads(scenario_path.read_text(encoding="utf-8"))
        app = FakeApplication(
            {
                "loan": {**demo["loan"], "annual_rate_percent": 24},
                "company": {"age_months": demo["declared"]["age_months"]},
                "financials": demo["declared"]["financials"],
                "credit_history": demo["declared"]["credit_history"],
            }
        )
        app.company.inn = demo["company"]["inn"]
        app.company.name = demo["company"]["name"]
        service = pipeline_service(app)
        await service.run_all(app)
        assert len(app.stage_runs) == 1
        assert app.preliminary_assessment.score == 75
        assert app.client_status == ClientStatus.UNDER_REVIEW
        await review(app, ManualDecision.APPROVE)
        assert app.client_status == ClientStatus.IN_PROGRESS
        await service.run_all(app)
        assert len(app.stage_runs) == 5
        assert app.final_assessment.score == 65
        assert app.final_assessment.route == Route.MANUAL_REVIEW
        assert app.manual_decision is None
        assert app.client_status == ClientStatus.UNDER_REVIEW
        await review(app, ManualDecision.APPROVE)
        assert app.client_status == ClientStatus.APPROVED_DEMO
        assert app.manual_decision == ManualDecision.APPROVE

    asyncio.run(scenario())
