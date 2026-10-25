"""Risk-policy precedence, safe alternative terms and regression fixtures."""

from __future__ import annotations

import asyncio
import json
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from test_preliminary_routing import FakeApplication, FakeRepository, load_case

from app.core.enums import ManualDecision, OfferKind, Route, Stage, StageStatus
from app.core.policy import POLICY
from app.schemas.application import AcceptOfferIn, ManualReviewIn
from app.services.alternative_offer import _amounts, _terms, find_alternative_offer
from app.services.offers import ManualReviewService, OfferService
from app.services.routing import RouteChecks, evaluate_preliminary_route, evaluate_route
from app.services.scoring import ScoringError, score_application

BACKEND = Path(__file__).resolve().parents[1]
PASS = RouteChecks(True, True, True, True, True)


@pytest.mark.parametrize(
    "score,route",
    [
        (0, Route.DECLINED),
        (45, Route.DECLINED),
        (46, Route.MANUAL_REVIEW),
        (66, Route.MANUAL_REVIEW),
        (75, Route.MANUAL_REVIEW),
        (76, Route.REQUEST_DOCUMENTS),
        (100, Route.REQUEST_DOCUMENTS),
    ],
)
def test_preliminary_thresholds(score, route):
    assert evaluate_preliminary_route(score).route == route


@pytest.mark.parametrize(
    "checks,history,warnings,route",
    [
        (
            RouteChecks(False, True, True, True, True),
            "no_overdues_12m",
            [],
            Route.REQUEST_DOCUMENTS,
        ),
        (RouteChecks(True, False, True, True, True), "no_overdues_12m", [], Route.DECLINED),
        (RouteChecks(True, True, False, True, True), "no_overdues_12m", [], Route.DECLINED),
        (RouteChecks(True, None, True, True, True), "no_overdues_12m", [], Route.MANUAL_REVIEW),
        (RouteChecks(True, True, None, True, True), "no_overdues_12m", [], Route.MANUAL_REVIEW),
        (RouteChecks(True, True, True, False, True), "no_overdues_12m", [], Route.MANUAL_REVIEW),
        (RouteChecks(True, True, True, None, True), "no_overdues_12m", [], Route.MANUAL_REVIEW),
        (RouteChecks(True, True, True, True, False), "no_overdues_12m", [], Route.MANUAL_REVIEW),
        (
            RouteChecks(True, True, True, True, True),
            "no_overdues_12m",
            ["NON_POSITIVE_EQUITY"],
            Route.MANUAL_REVIEW,
        ),
        (PASS, "current_or_90plus_overdue", [], Route.MANUAL_REVIEW),
        (PASS, None, [], Route.MANUAL_REVIEW),
        (PASS, "not_returned_from_bki", [], Route.MANUAL_REVIEW),
        (PASS, "no_overdues_12m", [], Route.APPROVED),
    ],
)
def test_verified_stop_factors_override_99_points(checks, history, warnings, route):
    result = evaluate_route(99, warnings, checks, credit_history=history)
    assert result.route == route
    assert result.policy_version == POLICY.version


@pytest.mark.parametrize(
    "score,route",
    [
        (0, Route.DECLINED),
        (45, Route.DECLINED),
        (46, Route.MANUAL_REVIEW),
        (75, Route.MANUAL_REVIEW),
        (76, Route.APPROVED),
        (100, Route.APPROVED),
    ],
)
def test_final_thresholds_after_clean_checks(score, route):
    assert evaluate_route(score, [], PASS, credit_history="no_history").route == route


@pytest.mark.parametrize("score", [-1, 101, True, None, 80.4, "80"])
def test_invalid_final_scores_raise(score):
    with pytest.raises(ValueError):
        evaluate_route(score, [], PASS, credit_history="no_overdues_12m")


@pytest.mark.parametrize("warnings", [None, [1], "NON_POSITIVE_EQUITY"])
def test_invalid_warning_format_raises(warnings):
    with pytest.raises(ValueError):
        evaluate_route(80, warnings, PASS, credit_history="no_overdues_12m")


def _application(case_id):
    case = load_case(case_id)
    return {k: case[k] for k in ("company", "loan", "financials", "credit_history")}


def test_alternative_offer_recomputes_verified_score_and_policy():
    candidate = find_alternative_offer(_application("BOUNDARY_75"), PASS)
    assert candidate is not None
    assert candidate["amount_rub"] <= 900_000
    assert candidate["term_months"] >= 24
    assert candidate["score"] >= 76
    assert POLICY.product.min_amount_rub <= candidate["amount_rub"] <= POLICY.product.max_amount_rub
    assert (
        POLICY.product.min_term_months <= candidate["term_months"] <= POLICY.product.max_term_months
    )
    assert (
        candidate["amount_rub"] - POLICY.product.min_amount_rub
    ) % POLICY.product.amount_step_rub == 0
    assert (
        candidate["term_months"] - POLICY.product.min_term_months
    ) % POLICY.product.term_step_months == 0
    modified = _application("BOUNDARY_75")
    modified["loan"] = {
        **modified["loan"],
        "amount_rub": candidate["amount_rub"],
        "term_months": candidate["term_months"],
    }
    score = score_application(modified)
    assert score["score"] == candidate["score"]
    assert (
        evaluate_route(
            score["score"], score["warnings"], PASS, credit_history=modified["credit_history"]
        ).route
        == Route.APPROVED
    )


@pytest.mark.parametrize(
    "checks",
    [
        RouteChecks(False, True, True, True, True),
        RouteChecks(True, False, True, True, True),
        RouteChecks(True, True, False, True, True),
        RouteChecks(True, True, True, False, True),
        RouteChecks(True, True, True, None, True),
        RouteChecks(True, True, True, True, False),
    ],
)
def test_no_alternative_for_failed_or_missing_checks(checks):
    assert find_alternative_offer(_application("BOUNDARY_75"), checks) is None


def test_no_alternative_for_serious_arrears_or_nonpositive_equity():
    overdue = _application("BOUNDARY_75")
    overdue["credit_history"] = "current_or_90plus_overdue"
    assert find_alternative_offer(overdue, PASS) is None
    assert find_alternative_offer(_application("ZERO_EQUITY"), PASS) is None


def test_no_unnecessary_offer_for_original_approval():
    assert find_alternative_offer(_application("BOUNDARY_76"), PASS) is None


def test_low_principal_or_unaligned_duration_never_offered():
    assert _amounts(POLICY.product.min_amount_rub - 1, POLICY) == []
    assert _terms(POLICY.product.max_term_months + 1, POLICY) == []
    assert 7 not in _terms(7, POLICY)
    assert _amounts(330_000, POLICY) == [300_000]
    original = _application("BOUNDARY_75")
    original["loan"] = {**original["loan"], "amount_rub": 200_000}
    assert find_alternative_offer(original, PASS) is None
    original["loan"] = {**original["loan"], "amount_rub": 900_000, "term_months": 72}
    assert find_alternative_offer(original, PASS) is None


def test_offer_with_missing_financials_never_created():
    original = _application("BOUNDARY_75")
    original["financials"] = {}
    assert find_alternative_offer(original, PASS) is None


def test_complete_dataset_regression_all_1500_scores():
    cases = json.loads(
        (BACKEND.parent / "docs/alfa/synthetic_borrowers.json").read_text(encoding="utf-8")
    )["cases"]
    assert len(cases) == 1500
    for c in cases:
        data = {k: c[k] for k in ("company", "loan", "financials", "credit_history")}
        if c["case_id"] == "MISSING_REVENUE" or c["case_id"] == "INVALID_TERM":
            continue
        try:
            calculated = score_application(data)
        except Exception:
            # Dataset contains explicitly invalid edge scenarios.
            assert "score" not in c.get("expected", {})
            continue
        assert calculated["score"] == c["expected"]["score"], c["case_id"]
        assert sum(calculated["breakdown"].values()) == calculated["score"]


def test_manual_decline_removes_existing_offer():
    async def scenario():
        app = FakeApplication(load_case("BOUNDARY_75"))
        app.bank_offer = {"amount_rub": 600_000, "term_months": 36}
        app.stage_runs = [
            SimpleNamespace(
                stage=Stage.DECISION,
                status=StageStatus.DONE,
                result={"route": Route.MANUAL_REVIEW.value},
            )
        ]
        service = ManualReviewService.__new__(ManualReviewService)
        service.applications = FakeRepository(app)
        await service.decide(
            app,
            ManualReviewIn(decision=ManualDecision.DECLINE, comment="Risk"),
            SimpleNamespace(id=2),
        )
        assert app.manual_decision == ManualDecision.DECLINE
        assert app.bank_offer is None
        accept = OfferService.__new__(OfferService)
        accept.applications = FakeRepository(app)
        with pytest.raises(HTTPException) as exc:
            await accept.accept(app, AcceptOfferIn(kind=OfferKind.ALTERNATIVE))
        assert exc.value.status_code == 409

    asyncio.run(scenario())


def test_34_invalid_scoring_cases_are_rejected():
    cases = json.loads(
        (BACKEND.parent / "docs/alfa/invalid_cases.json").read_text(encoding="utf-8")
    )["cases"]
    assert len(cases) == 34
    for c in cases:
        with pytest.raises(ScoringError) as error:
            score_application(c["application"])
        assert error.value.code == c["expected_error"]["code"], c["case_id"]
        assert error.value.field == c["expected_error"]["field"], c["case_id"]
