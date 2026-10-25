from datetime import UTC, datetime

from fastapi import HTTPException, status

from app.core.db import SessionDep
from app.core.enums import ClientStatus, ManualDecision, OfferKind, Route, Stage
from app.models.application import Application
from app.models.user import User
from app.repositories.application import ApplicationRepository
from app.schemas.application import AcceptOfferIn, ManualReviewIn
from app.services.base import BaseService
from app.services.pipeline import requested_terms


class OfferService(BaseService):
    def __init__(self, session: SessionDep) -> None:
        super().__init__(session)
        self.applications = ApplicationRepository(session)

    async def accept(self, application: Application, payload: AcceptOfferIn) -> Application:
        if application.accepted_at is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, "Предложение уже принято")
        current = application.client_status
        if payload.kind == OfferKind.REQUESTED:
            if current != ClientStatus.APPROVED_DEMO:
                raise HTTPException(status.HTTP_409_CONFLICT, "Предложение недоступно")
            terms = requested_terms(application)
        else:
            if current != ClientStatus.NOT_APPROVED_DEMO or not application.bank_offer:
                raise HTTPException(
                    status.HTTP_409_CONFLICT, "Альтернативное предложение недоступно"
                )
            offer = application.bank_offer
            terms = {
                "amount_rub": offer["amount_rub"],
                "term_months": offer["term_months"],
                "annual_rate_percent": offer["annual_rate_percent"],
                "monthly_payment_rub": offer["monthly_payment_rub"],
            }
        application.accepted_offer = {"kind": payload.kind.value, **terms}
        application.accepted_at = datetime.now(UTC)
        await self.applications.flush()
        return application


class ManualReviewService(BaseService):
    def __init__(self, session: SessionDep) -> None:
        super().__init__(session)
        self.applications = ApplicationRepository(session)

    async def decide(
        self, application: Application, payload: ManualReviewIn, employee: User
    ) -> Application:
        decision = application.run_of(Stage.DECISION)
        if decision is None or decision.result.get("route") != Route.MANUAL_REVIEW.value:
            raise HTTPException(
                status.HTTP_409_CONFLICT, "Заявка не ожидает ручного решения"
            )
        if application.accepted_at is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, "Предложение уже принято")
        application.manual_decision = ManualDecision(payload.decision)
        application.manual_comment = payload.comment
        application.manual_decided_by_id = employee.id
        application.manual_decided_at = datetime.now(UTC)
        await self.applications.flush()
        return application
