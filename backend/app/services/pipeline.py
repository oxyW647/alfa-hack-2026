from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status

from app.core.db import SessionDep
from app.core.enums import (
    AssessmentKind,
    DocumentSource,
    DocumentType,
    Route,
    Stage,
    StageState,
    StageStatus,
)
from app.core.policy import POLICY
from app.models.application import Application
from app.models.assessment import Assessment
from app.models.document import Document
from app.models.stage_run import StageRun
from app.repositories.application import ApplicationRepository
from app.schemas.pipeline import PipelineOut, PipelineStageOut
from app.services.alternative_offer import find_alternative_offer
from app.services.base import BaseService
from app.services.registry import registry
from app.services.routing import RouteChecks, evaluate_route
from app.services.scoring import ScoringError, annuity_payment, score_application
from app.services.statuses import STAGE_TITLES
from app.services.verification import VerificationInput, verify_documents

ORDER = list(Stage)

StageOutcome = tuple[StageStatus, dict[str, Any]]


def loan_input(application: Application) -> dict[str, Any]:
    return {
        "amount_rub": float(application.loan_amount_rub),
        "term_months": application.term_months,
        "annual_rate_percent": float(application.annual_rate_percent),
    }


def declared_input(application: Application) -> dict[str, Any]:
    declared = application.declared
    return {
        "company": {"age_months": declared.get("age_months")},
        "financials": declared.get("financials") or {},
        "loan": loan_input(application),
        "credit_history": declared.get("credit_history"),
    }


def verified_input(application: Application) -> dict[str, Any]:
    documents = {doc.doc_type: doc.payload for doc in application.documents}
    egrul = documents[DocumentType.EGRUL]
    financial = documents[DocumentType.FINANCIAL]
    return {
        "company": {"age_months": egrul["age_months"]},
        "financials": {
            key: value for key, value in financial.items() if key not in ("document_type", "period")
        },
        "loan": loan_input(application),
        "credit_history": documents[DocumentType.BKI]["credit_history_status"],
    }


def route_checks(checks: dict[str, Any]) -> RouteChecks:
    return RouteChecks(
        documents_verified=checks.get("documents_verified", False),
        registration_active=checks.get("registration_active"),
        product_eligible=checks.get("product_eligible"),
        fraud_check_passed=checks.get("fraud_check_passed"),
        documents_trusted=checks.get("documents_trusted", False),
    )


def requested_terms(application: Application) -> dict[str, float | int]:
    amount = float(application.loan_amount_rub)
    rate = float(application.annual_rate_percent)
    return {
        "amount_rub": amount,
        "term_months": application.term_months,
        "annual_rate_percent": rate,
        "monthly_payment_rub": round(annuity_payment(amount, application.term_months, rate), 2),
    }


class PipelineService(BaseService):
    def __init__(self, session: SessionDep) -> None:
        super().__init__(session)
        self.applications = ApplicationRepository(session)

    def view(self, application: Application, *, internal: bool) -> PipelineOut:
        stages: list[PipelineStageOut] = []
        next_stage: Stage | None = None
        for index, stage in enumerate(ORDER):
            run = application.run_of(stage)
            if run is not None:
                state = StageState.DONE if run.status == StageStatus.DONE else StageState.FAILED
            elif index == 0 or application.done(ORDER[index - 1]):
                state = StageState.AVAILABLE
            else:
                state = StageState.LOCKED
            if next_stage is None and state != StageState.DONE:
                next_stage = stage if state != StageState.LOCKED else None
            stages.append(
                PipelineStageOut(
                    stage=stage,
                    title=STAGE_TITLES[stage],
                    state=state,
                    finished_at=run.finished_at if run else None,
                    result=run.result if run and internal else None,
                )
            )
        return PipelineOut(
            application_id=application.id,
            status=application.client_status,
            next_stage=next_stage,
            stages=stages,
        )

    async def run_stage(self, application: Application, stage: Stage) -> StageRun:
        index = ORDER.index(stage)
        if index > 0 and not application.done(ORDER[index - 1]):
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                f"Сначала выполните этап «{STAGE_TITLES[ORDER[index - 1]]}»",
            )
        await self.invalidate_from(application, stage)
        handler = getattr(self, f"_{stage.value}")
        outcome_status, result = await handler(application)
        run = StageRun(
            application_id=application.id,
            stage=stage,
            status=outcome_status,
            result=result,
            finished_at=datetime.now(UTC),
        )
        application.stage_runs.append(run)
        await self.applications.flush()
        return run

    async def run_all(self, application: Application) -> None:
        for stage in ORDER:
            if application.done(stage):
                continue
            run = await self.run_stage(application, stage)
            if run.status == StageStatus.FAILED:
                return

    async def invalidate_from(self, application: Application, stage: Stage) -> None:
        start = ORDER.index(stage)
        stale = [run for run in application.stage_runs if ORDER.index(run.stage) >= start]
        for run in stale:
            application.stage_runs.remove(run)
            await self.applications.delete_stage_run(run)
        if start <= ORDER.index(Stage.VERIFICATION):
            application.checks = None
        if start <= ORDER.index(Stage.DECISION):
            application.bank_offer = None
            application.manual_decision = None
            application.manual_comment = None
            application.manual_decided_by_id = None
            application.manual_decided_at = None
            application.accepted_offer = None
            application.accepted_at = None
        await self.applications.flush()

    async def _preliminary_scoring(self, application: Application) -> StageOutcome:
        data = declared_input(application)
        try:
            scored = score_application(data)
        except ScoringError as error:
            return StageStatus.FAILED, {"error": error.as_dict()}
        decision = evaluate_route(scored["score"], scored["warnings"], RouteChecks(False))
        assessment = self._add_assessment(
            application, AssessmentKind.PRELIMINARY, "declared", data, scored, decision
        )
        await self.applications.flush()
        return StageStatus.DONE, {
            "assessment_id": assessment.id,
            "score": scored["score"],
            "risk_level": scored["risk_level"],
            "route": decision.route.value,
            "warnings": scored["warnings"],
        }

    async def _documents(self, application: Application) -> StageOutcome:
        present = {doc.doc_type for doc in application.documents}
        missing = [t for t in DocumentType if t not in present]
        if missing:
            found = registry.find_documents(application.company.inn)
            for doc_type in missing:
                payload = found.get(doc_type)
                if payload is None:
                    continue
                document = Document(
                    application_id=application.id,
                    doc_type=doc_type,
                    source=DocumentSource.REGISTRY,
                    payload=payload,
                )
                application.documents.append(document)
        await self.applications.flush()
        loaded = {doc.doc_type: doc for doc in application.documents}
        still_missing = [t.value for t in DocumentType if t not in loaded]
        summary = [
            {"doc_type": doc_type.value, "source": doc.source.value}
            for doc_type, doc in loaded.items()
        ]
        if still_missing:
            return StageStatus.FAILED, {
                "error": {
                    "code": "DOCUMENTS_MISSING",
                    "message": "Документы не найдены, загрузите недостающие",
                    "field": None,
                },
                "missing_documents": still_missing,
                "documents": summary,
            }
        return StageStatus.DONE, {"documents": summary}

    async def _verification(self, application: Application) -> StageOutcome:
        declared = application.declared
        result = verify_documents(
            VerificationInput(
                inn=application.company.inn,
                name=application.company.name,
                loan_amount_rub=float(application.loan_amount_rub),
                term_months=application.term_months,
                declared=declared,
                documents={doc.doc_type: doc.payload for doc in application.documents},
                client_supplied=tuple(
                    doc.doc_type
                    for doc in application.documents
                    if doc.source == DocumentSource.UPLOAD
                ),
            )
        )
        application.checks = result
        return StageStatus.DONE, result

    async def _final_scoring(self, application: Application) -> StageOutcome:
        data = verified_input(application)
        try:
            scored = score_application(data)
        except ScoringError as error:
            return StageStatus.FAILED, {"error": error.as_dict()}
        checks = application.checks or {}
        decision = evaluate_route(
            scored["score"],
            scored["warnings"],
            route_checks(checks),
        )
        assessment = self._add_assessment(
            application, AssessmentKind.VERIFIED, "documents", {**data, "checks": checks},
            scored, decision,
        )
        await self.applications.flush()
        result: dict[str, Any] = {
            "assessment_id": assessment.id,
            "score": scored["score"],
            "risk_level": scored["risk_level"],
            "route": decision.route.value,
            "reason": decision.reason,
            "warnings": scored["warnings"],
        }
        preliminary = application.preliminary_assessment
        if preliminary is not None:
            result["score_before"] = preliminary.score
            result["delta"] = scored["score"] - preliminary.score
        return StageStatus.DONE, result

    async def _decision(self, application: Application) -> StageOutcome:
        final = application.final_assessment
        checks = application.checks or {}
        route = final.route
        offer = None
        if route in (Route.DECLINED, Route.MANUAL_REVIEW):
            offer = find_alternative_offer(
                {**final.input_snapshot, "loan": loan_input(application)},
                route_checks(checks),
                POLICY,
            )
        application.bank_offer = offer
        return StageStatus.DONE, {
            "route": route.value,
            "reason": final.route_reason,
            "score": final.score,
            "awaiting_employee": route == Route.MANUAL_REVIEW,
            "requested_terms": requested_terms(application),
            "alternative_offer": offer,
        }

    def _add_assessment(
        self,
        application: Application,
        kind: AssessmentKind,
        data_source: str,
        snapshot: dict[str, Any],
        scored: dict[str, Any],
        decision: Any,
    ) -> Assessment:
        assessment = Assessment(
            application_id=application.id,
            kind=kind,
            data_source=data_source,
            input_snapshot=snapshot,
            model_version=scored["model_version"],
            schema_version=scored["schema_version"],
            score=scored["score"],
            risk_level=scored["risk_level"],
            breakdown=scored["breakdown"],
            metrics=scored["metrics"],
            factors=scored["factors"],
            main_risk_factors=scored["main_risk_factors"],
            warnings=scored["warnings"],
            route=decision.route,
            route_reason=decision.reason,
            policy_version=decision.policy_version,
        )
        application.assessments.append(assessment)
        return assessment
