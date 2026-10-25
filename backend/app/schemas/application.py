from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field

from app.core.enums import (
    AssessmentKind,
    ClientStatus,
    CreditHistory,
    DocumentSource,
    DocumentType,
    LegalForm,
    ManualDecision,
    OfferKind,
    RiskLevel,
    Route,
)
from app.schemas.base import ORMModel
from app.schemas.document import INN_PATTERN


class CompanyIn(BaseModel):
    inn: str = Field(pattern=INN_PATTERN)
    name: str = Field(min_length=1, max_length=255)
    legal_form: LegalForm


class LoanIn(BaseModel):
    amount_rub: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    term_months: int = Field(gt=0, le=600)
    purpose: str | None = Field(default=None, max_length=500)


class FinancialsIn(BaseModel):
    revenues_last_6_months_rub: list[float | None] | None = None
    average_monthly_operating_expenses_rub: float | None = None
    existing_monthly_debt_payments_rub: float | None = None
    outstanding_debt_before_new_loan_rub: float | None = None
    equity_rub: float | None = None
    current_assets_rub: float | None = None
    current_liabilities_rub: float | None = None


class DeclaredIn(BaseModel):
    age_months: int | None = Field(default=None, ge=0)
    financials: FinancialsIn | None = None
    credit_history: CreditHistory | None = None


class ApplicationCreate(BaseModel):
    company: CompanyIn
    loan: LoanIn
    declared: DeclaredIn = Field(default_factory=DeclaredIn)


class ApplicationUpdate(BaseModel):
    loan: LoanIn | None = None
    declared: DeclaredIn | None = None


class CompanyOut(ORMModel):
    inn: str
    name: str
    legal_form: LegalForm


class LoanOut(BaseModel):
    amount_rub: float
    term_months: int
    annual_rate_percent: float
    purpose: str | None
    monthly_payment_rub: float


class OfferTermsOut(BaseModel):
    amount_rub: float
    term_months: int
    annual_rate_percent: float
    monthly_payment_rub: float


class AcceptedOfferOut(OfferTermsOut):
    kind: OfferKind


class ActionOut(BaseModel):
    code: str
    document_type: DocumentType | None = None
    field: str | None = None


class DocumentBriefOut(ORMModel):
    doc_type: DocumentType
    source: DocumentSource
    created_at: datetime


class ClientApplicationOut(BaseModel):
    id: int
    created_at: datetime
    company: CompanyOut
    loan: LoanOut
    status: ClientStatus
    status_title: str
    status_text: str
    actions: list[ActionOut]
    offer: OfferTermsOut | None
    alternative_offer: OfferTermsOut | None
    accepted_offer: AcceptedOfferOut | None
    accepted_at: datetime | None
    documents: list[DocumentBriefOut]


class AssessmentOut(ORMModel):
    id: int
    kind: AssessmentKind
    created_at: datetime
    data_source: str
    model_version: str
    schema_version: str
    score: int
    risk_level: RiskLevel
    breakdown: dict[str, int]
    metrics: dict[str, Any]
    factors: list[dict[str, Any]]
    main_risk_factors: list[str]
    warnings: list[str]
    route: Route
    route_reason: str
    policy_version: str
    input_snapshot: dict[str, Any]


class ScoreComparisonOut(BaseModel):
    score_before: int
    score_after: int
    delta: int


class ManualReviewOut(BaseModel):
    decision: ManualDecision
    comment: str | None
    decided_by_id: int | None
    decided_at: datetime | None


class EmployeeApplicationOut(ClientApplicationOut):
    owner_id: int
    declared: dict[str, Any]
    checks: dict[str, Any] | None
    route: Route | None
    assessments: list[AssessmentOut]
    comparison: ScoreComparisonOut | None
    bank_offer: dict[str, Any] | None
    manual_review: ManualReviewOut | None
    documents_payload: dict[str, dict[str, Any]]


class ApplicationListItem(BaseModel):
    id: int
    created_at: datetime
    company_name: str
    inn: str
    amount_rub: float
    term_months: int
    status: ClientStatus
    route: Route | None = None
    score: int | None = None


class ManualReviewIn(BaseModel):
    decision: ManualDecision
    comment: str | None = Field(default=None, max_length=1000)


class AcceptOfferIn(BaseModel):
    kind: OfferKind
