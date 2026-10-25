from typing import Any

from app.core.enums import Route
from app.core.policy import POLICY, CreditPolicy
from app.services.routing import RouteChecks, evaluate_route
from app.services.scoring import annuity_payment, score_application


def _terms(requested: int, policy: CreditPolicy) -> list[int]:
    product = policy.product
    longer = range(requested + product.term_step_months, product.max_term_months + 1,
                   product.term_step_months)
    return [requested, *longer]


def _amounts(requested: float, policy: CreditPolicy) -> list[int]:
    product = policy.product
    top = int(requested // product.amount_step_rub) * product.amount_step_rub
    start = min(top, product.max_amount_rub)
    return list(range(start, product.min_amount_rub - 1, -product.amount_step_rub))


def find_alternative_offer(
    application: dict[str, Any], checks: RouteChecks, policy: CreditPolicy = POLICY
) -> dict[str, Any] | None:
    loan = application["loan"]
    requested_amount = loan["amount_rub"]
    requested_term = loan["term_months"]
    rate = loan["annual_rate_percent"]
    best: dict[str, Any] | None = None
    for term in _terms(requested_term, policy):
        for amount in _amounts(requested_amount, policy):
            candidate = {**application, "loan": {**loan, "amount_rub": amount, "term_months": term}}
            scored = score_application(candidate)
            decision = evaluate_route(scored["score"], scored["warnings"], checks, policy)
            if decision.route != Route.APPROVED:
                continue
            if amount == requested_amount and term == requested_term:
                continue
            if best is None or amount > best["amount_rub"] or (
                amount == best["amount_rub"] and term < best["term_months"]
            ):
                best = {
                    "amount_rub": amount,
                    "term_months": term,
                    "annual_rate_percent": rate,
                    "monthly_payment_rub": round(annuity_payment(amount, term, rate), 2),
                    "score": scored["score"],
                    "risk_level": scored["risk_level"],
                }
            break
    return best
