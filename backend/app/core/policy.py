from dataclasses import dataclass, field

from app.core.enums import ClientStatus, Route


@dataclass(frozen=True)
class CreditProduct:
    code: str
    title: str
    min_amount_rub: int
    max_amount_rub: int
    min_term_months: int
    max_term_months: int
    annual_rate_percent: float
    amount_step_rub: int
    term_step_months: int


@dataclass(frozen=True)
class CreditPolicy:
    version: str = "demo-1.2.0"
    approve_above_score: int = 75
    manual_review_from_score: int = 46
    debt_mismatch_tolerance_pct: float = 5.0
    debt_fraud_threshold_pct: float = 50.0
    discrepancy_tolerance_pct: float = 10.0
    age_tolerance_months: int = 1
    fraud_blacklist_inns: frozenset[str] = field(default_factory=frozenset)
    product: CreditProduct = CreditProduct(
        code="business_development",
        title="Кредит на развитие бизнеса",
        min_amount_rub=300_000,
        max_amount_rub=25_000_000,
        min_term_months=6,
        max_term_months=60,
        annual_rate_percent=24.0,
        amount_step_rub=50_000,
        term_step_months=6,
    )


POLICY = CreditPolicy()

CLIENT_STATUS_BY_ROUTE = {
    Route.REQUEST_DOCUMENTS: ClientStatus.MORE_INFO_REQUIRED,
    Route.MANUAL_REVIEW: ClientStatus.UNDER_REVIEW,
    Route.APPROVED: ClientStatus.APPROVED_DEMO,
    Route.DECLINED: ClientStatus.NOT_APPROVED_DEMO,
}
