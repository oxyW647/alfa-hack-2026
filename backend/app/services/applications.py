from decimal import Decimal

from fastapi import HTTPException, status

from app.core.db import SessionDep
from app.core.enums import ClientStatus, DocumentSource, DocumentType, Stage
from app.core.policy import POLICY
from app.models.application import Application
from app.models.company import Company
from app.models.document import Document
from app.models.user import User
from app.repositories.application import ApplicationRepository
from app.repositories.company import CompanyRepository
from app.schemas.application import (
    AcceptedOfferOut,
    ApplicationCreate,
    ApplicationListItem,
    ApplicationUpdate,
    AssessmentOut,
    ClientApplicationOut,
    CompanyOut,
    DocumentBriefOut,
    EmployeeApplicationOut,
    LoanOut,
    ManualReviewOut,
    OfferTermsOut,
    ScoreComparisonOut,
)
from app.schemas.base import Page
from app.schemas.document import DocumentIn
from app.services.base import BaseService
from app.services.pipeline import PipelineService
from app.services.scoring import annuity_payment
from app.services.statuses import STATUS_MESSAGES, required_actions


class ApplicationService(BaseService):
    def __init__(self, session: SessionDep) -> None:
        super().__init__(session)
        self.applications = ApplicationRepository(session)
        self.companies = CompanyRepository(session)
        self.pipeline = PipelineService(session)

    async def create(self, payload: ApplicationCreate, user: User) -> Application:
        company = Company(
            inn=payload.company.inn,
            name=payload.company.name.strip(),
            legal_form=payload.company.legal_form,
        )
        self.companies.add(company)
        await self.companies.flush()
        application = Application(
            owner_id=user.id,
            company_id=company.id,
            loan_amount_rub=payload.loan.amount_rub,
            term_months=payload.loan.term_months,
            annual_rate_percent=Decimal(str(POLICY.product.annual_rate_percent)),
            purpose=payload.loan.purpose,
            declared=payload.declared.model_dump(mode="json"),
        )
        self.applications.add(application)
        await self.applications.flush()
        return await self.applications.get_full(application.id)

    async def update(self, application: Application, payload: ApplicationUpdate) -> Application:
        if application.accepted_at is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, "Заявка уже завершена")
        if payload.loan is not None:
            application.loan_amount_rub = payload.loan.amount_rub
            application.term_months = payload.loan.term_months
            application.purpose = payload.loan.purpose
        if payload.declared is not None:
            application.declared = payload.declared.model_dump(mode="json")
        await self.pipeline.invalidate_from(application, Stage.PRELIMINARY_SCORING)
        return application

    async def put_document(
        self, application: Application, payload: DocumentIn, user: User
    ) -> Application:
        if application.accepted_at is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, "Заявка уже завершена")
        data = payload.model_dump(mode="json")
        existing = next(
            (d for d in application.documents if d.doc_type == payload.document_type), None
        )
        if (
            existing is not None
            and existing.source == DocumentSource.REGISTRY
            and not user.is_employee
        ):
            raise HTTPException(
                status.HTTP_409_CONFLICT, "Документ получен из реестра и не может быть заменён"
            )
        if existing is not None:
            application.documents.remove(existing)
            await self.applications.delete_document(existing)
            await self.applications.flush()
        application.documents.append(
            Document(
                application_id=application.id,
                doc_type=DocumentType(payload.document_type),
                source=DocumentSource.EMPLOYEE if user.is_employee else DocumentSource.UPLOAD,
                payload=data,
            )
        )
        await self.pipeline.invalidate_from(application, Stage.DOCUMENTS)
        return application

    async def reset(self, application: Application) -> Application:
        for document in list(application.documents):
            application.documents.remove(document)
            await self.applications.delete_document(document)
        await self.pipeline.invalidate_from(application, Stage.PRELIMINARY_SCORING)
        return application

    async def list_page(
        self, user: User, *, q: str | None, page: int, size: int
    ) -> Page[ApplicationListItem]:
        stmt = self.applications.listing(None if user.is_employee else user.id, q)
        rows, total = await self.applications.paginate(stmt, page, size)
        return Page(items=[self._list_item(a, user) for a in rows], total=total)

    @staticmethod
    def _list_item(application: Application, user: User) -> ApplicationListItem:
        final = application.final_assessment or application.preliminary_assessment
        return ApplicationListItem(
            id=application.id,
            created_at=application.created_at,
            company_name=application.company.name,
            inn=application.company.inn,
            amount_rub=application.loan_amount_rub,
            term_months=application.term_months,
            status=application.client_status,
            route=application.route if user.is_employee else None,
            score=final.score if user.is_employee and final else None,
        )

    def to_client(self, application: Application) -> ClientApplicationOut:
        client_status = application.client_status
        title, text = STATUS_MESSAGES[client_status]
        decision = application.run_of(Stage.DECISION)
        offer = alternative = None
        if client_status == ClientStatus.APPROVED_DEMO and decision is not None:
            offer = OfferTermsOut(**decision.result["requested_terms"])
        if client_status == ClientStatus.NOT_APPROVED_DEMO and application.bank_offer:
            alternative = OfferTermsOut(**application.bank_offer)
        amount = float(application.loan_amount_rub)
        rate = float(application.annual_rate_percent)
        return ClientApplicationOut(
            id=application.id,
            created_at=application.created_at,
            company=CompanyOut.model_validate(application.company),
            loan=LoanOut(
                amount_rub=application.loan_amount_rub,
                term_months=application.term_months,
                annual_rate_percent=application.annual_rate_percent,
                purpose=application.purpose,
                monthly_payment_rub=round(
                    annuity_payment(amount, application.term_months, rate), 2
                ),
            ),
            status=client_status,
            status_title=title,
            status_text=text,
            actions=required_actions(application),
            offer=offer,
            alternative_offer=alternative,
            accepted_offer=(
                AcceptedOfferOut(**application.accepted_offer)
                if application.accepted_offer
                else None
            ),
            accepted_at=application.accepted_at,
            documents=[DocumentBriefOut.model_validate(d) for d in application.documents],
        )

    def to_employee(self, application: Application) -> EmployeeApplicationOut:
        base = self.to_client(application)
        preliminary = application.preliminary_assessment
        final = application.final_assessment
        comparison = None
        if preliminary is not None and final is not None:
            comparison = ScoreComparisonOut(
                score_before=preliminary.score,
                score_after=final.score,
                delta=final.score - preliminary.score,
            )
        manual = None
        if application.manual_decision is not None:
            manual = ManualReviewOut(
                decision=application.manual_decision,
                comment=application.manual_comment,
                decided_by_id=application.manual_decided_by_id,
                decided_at=application.manual_decided_at,
            )
        return EmployeeApplicationOut(
            **base.model_dump(),
            owner_id=application.owner_id,
            declared=application.declared,
            checks=application.checks,
            route=application.route,
            assessments=[AssessmentOut.model_validate(a) for a in application.assessments],
            comparison=comparison,
            bank_offer=application.bank_offer,
            manual_review=manual,
            documents_payload={d.doc_type.value: d.payload for d in application.documents},
        )

    def present(self, application: Application, user: User):
        return self.to_employee(application) if user.is_employee else self.to_client(application)

