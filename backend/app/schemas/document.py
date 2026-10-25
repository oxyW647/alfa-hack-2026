from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, Field

from app.core.enums import CreditHistory, DocumentSource, DocumentType
from app.schemas.base import ORMModel

INN_PATTERN = r"^\d{10}(\d{2})?$"


class EgrulDocument(BaseModel):
    document_type: Literal[DocumentType.EGRUL]
    company_name: str = Field(min_length=1, max_length=255)
    inn: str = Field(pattern=INN_PATTERN)
    ogrn: str = Field(pattern=r"^\d{13}(\d{2})?$")
    age_months: int = Field(ge=0)
    registration_active: bool
    director: str = Field(min_length=1, max_length=255)


class BkiDocument(BaseModel):
    document_type: Literal[DocumentType.BKI]
    credit_history_status: CreditHistory
    active_loans_count: int = Field(ge=0)
    total_debt_rub: float = Field(ge=0)


class FinancialDocument(BaseModel):
    document_type: Literal[DocumentType.FINANCIAL]
    period: str = Field(min_length=1, max_length=64)
    revenues_last_6_months_rub: list[float] = Field(min_length=6, max_length=6)
    average_monthly_operating_expenses_rub: float = Field(ge=0)
    equity_rub: float
    current_assets_rub: float = Field(ge=0)
    current_liabilities_rub: float = Field(ge=0)
    outstanding_debt_before_new_loan_rub: float = Field(ge=0)
    existing_monthly_debt_payments_rub: float = Field(ge=0)


DocumentIn = Annotated[
    EgrulDocument | BkiDocument | FinancialDocument, Field(discriminator="document_type")
]

DOCUMENT_MODELS: dict[DocumentType, type[BaseModel]] = {
    DocumentType.EGRUL: EgrulDocument,
    DocumentType.BKI: BkiDocument,
    DocumentType.FINANCIAL: FinancialDocument,
}


class DocumentOut(ORMModel):
    doc_type: DocumentType
    source: DocumentSource
    payload: dict
    created_at: datetime
