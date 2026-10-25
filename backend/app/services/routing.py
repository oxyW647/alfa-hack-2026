from dataclasses import dataclass

from app.core.enums import Route
from app.core.policy import POLICY, CreditPolicy


@dataclass(frozen=True)
class RouteChecks:
    documents_verified: bool
    registration_active: bool | None = None
    product_eligible: bool | None = None
    fraud_check_passed: bool | None = None
    documents_trusted: bool = True


@dataclass(frozen=True)
class RouteDecision:
    route: Route
    reason: str
    policy_version: str


def evaluate_route(
    score: int,
    warnings: list[str],
    checks: RouteChecks,
    policy: CreditPolicy = POLICY,
) -> RouteDecision:
    version = policy.version
    if not checks.documents_verified:
        return RouteDecision(Route.REQUEST_DOCUMENTS, "Не подтверждены документы", version)
    if not checks.registration_active or not checks.product_eligible:
        return RouteDecision(
            Route.DECLINED, "Бизнес или продукт не соответствует обязательным условиям", version
        )
    if (
        not checks.fraud_check_passed
        or not checks.documents_trusted
        or "NON_POSITIVE_EQUITY" in warnings
    ):
        return RouteDecision(Route.MANUAL_REVIEW, "Требуется дополнительное рассмотрение", version)
    if score > policy.approve_above_score:
        return RouteDecision(
            Route.APPROVED, "Порог модели превышен; проверки пройдены", version
        )
    if score >= policy.manual_review_from_score:
        return RouteDecision(Route.MANUAL_REVIEW, "Средний скоринговый риск", version)
    return RouteDecision(Route.DECLINED, "Высокий скоринговый риск по правилам демо", version)
