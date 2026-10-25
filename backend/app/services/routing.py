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
    *,
    credit_history: str | None = None,
) -> RouteDecision:
    """Final decision based on VERIFIED inputs; never use on preliminary stage.

    These are demonstrator rules, not Alfa-Bank lending requirements. Mandatory
    checks override the numerical score: no compensating a hard stop with points.
    """
    if type(score) is not int or not 0 <= score <= 100:
        raise ValueError("Итоговый скоринг должен быть целым числом от 0 до 100")
    if not isinstance(warnings, list) or any(not isinstance(w, str) for w in warnings):
        raise ValueError("Некорректные предупреждения скоринга")

    version = policy.version
    if checks.documents_verified is not True:
        return RouteDecision(Route.REQUEST_DOCUMENTS, "Не подтверждены документы", version)
    if checks.registration_active is False or checks.product_eligible is False:
        return RouteDecision(
            Route.DECLINED, "Бизнес или продукт не соответствует обязательным условиям", version
        )
    if checks.registration_active is not True or checks.product_eligible is not True:
        return RouteDecision(
            Route.MANUAL_REVIEW,
            "Статус регистрации или соответствие продукту не подтверждены",
            version,
        )
    if checks.fraud_check_passed is not True:
        return RouteDecision(
            Route.MANUAL_REVIEW, "Антифрод-проверка не пройдена или не подтверждена", version
        )
    if checks.documents_trusted is not True:
        return RouteDecision(Route.MANUAL_REVIEW, "Документы требуют подтверждения", version)
    if "NON_POSITIVE_EQUITY" in warnings:
        return RouteDecision(Route.MANUAL_REVIEW, "Собственный капитал не положителен", version)
    # A missing BKI response is NOT 'no_history' and cannot be auto-approved.
    from app.services.scoring import HISTORY_POINTS

    if not isinstance(credit_history, str) or credit_history not in HISTORY_POINTS:
        return RouteDecision(Route.MANUAL_REVIEW, "Кредитная история не подтверждена", version)
    if credit_history in policy.manual_review_credit_histories:
        return RouteDecision(
            Route.MANUAL_REVIEW,
            "Действующая или длительная просрочка: автоматическое одобрение запрещено",
            version,
        )
    if score > policy.approve_above_score:
        return RouteDecision(
            Route.APPROVED, "Порог модели превышен; моковые проверки пройдены", version
        )
    if score >= policy.manual_review_from_score:
        return RouteDecision(Route.MANUAL_REVIEW, "Средний скоринговый риск", version)
    return RouteDecision(Route.DECLINED, "Высокий скоринговый риск по правилам демо", version)


def evaluate_preliminary_route(score: int, policy: CreditPolicy = POLICY) -> RouteDecision:
    """Preliminary eligibility ONLY, never loan approval.

    0..45: decline; 46..75: await employee; 76..100: documents.
    """
    if type(score) is not int or not 0 <= score <= 100:
        raise ValueError("Предварительный скоринг должен быть целым числом от 0 до 100")
    if score < policy.manual_review_from_score:
        return RouteDecision(
            Route.DECLINED,
            "Предварительный высокий риск: заявка отклонена",
            policy.version,
        )
    if score <= policy.approve_above_score:
        return RouteDecision(
            Route.MANUAL_REVIEW,
            "Средний предварительный риск: требуется решение сотрудника",
            policy.version,
        )
    return RouteDecision(
        Route.REQUEST_DOCUMENTS,
        "Предварительный отбор пройден, требуются документы",
        policy.version,
    )
