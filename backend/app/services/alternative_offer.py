"""Conditional alternative loan terms, re-scored using verified backend data.

Alternative terms are suggestions for a demonstration product only. They are
never produced for missing/failed identity, fraud or other stop-factor checks.
"""

import math
from typing import Any

from app.core.enums import Route
from app.core.policy import POLICY, CreditPolicy
from app.services.routing import RouteChecks, evaluate_route
from app.services.scoring import ScoringError, annuity_payment, score_application


def _valid_checks(checks: RouteChecks) -> bool:
    return (
        checks.documents_verified is True
        and checks.registration_active is True
        and checks.product_eligible is True
        and checks.fraud_check_passed is True
        and checks.documents_trusted is True
    )


def _terms(requested: int, policy: CreditPolicy) -> list[int]:
    product = policy.product
    step = product.term_step_months
    if (
        step <= 0
        or product.min_term_months <= 0
        or product.max_term_months < product.min_term_months
    ):
        return []
    # Only terms from the configured product grid; never exceed its bounds.
    return [
        term
        for term in range(product.min_term_months, product.max_term_months + 1, step)
        if term >= requested
    ]


def _amounts(requested: float, policy: CreditPolicy) -> list[int]:
    product = policy.product
    step = product.amount_step_rub
    if step <= 0 or product.min_amount_rub <= 0 or product.max_amount_rub < product.min_amount_rub:
        return []
    return [
        amount
        for amount in range(product.min_amount_rub, product.max_amount_rub + 1, step)
        if amount <= requested
    ][::-1]


def find_alternative_offer(
    application: dict[str, Any], checks: RouteChecks, policy: CreditPolicy = POLICY
) -> dict[str, Any] | None:
    """Choose greatest approved amount, then shortest valid duration.

    Candidates must respect the configured product grid, use the original rate,
    and pass a FRESH scoring + final policy evaluation. No fictional collateral
    or blanket '-30% amount' proposals are generated.
    """
    if not _valid_checks(checks):
        return None
    try:
        loan = application["loan"]
        history = application["credit_history"]
        requested_amount = loan["amount_rub"]
        requested_term = loan["term_months"]
        rate = loan["annual_rate_percent"]
    except (KeyError, TypeError):
        return None
    if not isinstance(history, str) or history in policy.manual_review_credit_histories:
        return None
    if (
        isinstance(requested_amount, bool)
        or not isinstance(requested_amount, (int, float))
        or isinstance(requested_term, bool)
        or type(requested_term) is not int
        or isinstance(rate, bool)
        or not isinstance(rate, (int, float))
    ):
        return None
    if not (math.isfinite(requested_amount) and math.isfinite(rate)):
        return None
    product = policy.product
    if (
        requested_amount < product.min_amount_rub
        or requested_amount > product.max_amount_rub
        or requested_term < product.min_term_months
        or requested_term > product.max_term_months
        or rate != product.annual_rate_percent
    ):
        return None

    # No alternative is needed when the original requested terms are already approved.
    try:
        original = score_application(application)
    except ScoringError:
        return None
    initial_route = evaluate_route(
        original["score"],
        original["warnings"],
        checks,
        policy,
        credit_history=history,
    )
    if initial_route.route == Route.APPROVED:
        return None

    amounts = _amounts(requested_amount, policy)
    terms = _terms(requested_term, policy)
    if not amounts or not terms:
        return None

    # A candidate with an equal amount and/or longer term can be sufficient;
    # never increase principal beyond the original request.
    for amount in amounts:
        for term in terms:
            if amount == requested_amount and term == requested_term:
                continue
            candidate = {
                **application,
                "loan": {**loan, "amount_rub": amount, "term_months": term},
            }
            try:
                scored = score_application(candidate)
            except ScoringError:
                return None  # Missing/invalid financial data: never invent an offer.
            decision = evaluate_route(
                scored["score"],
                scored["warnings"],
                checks,
                policy,
                credit_history=history,
            )
            if decision.route != Route.APPROVED:
                continue
            return {
                "amount_rub": amount,
                "term_months": term,
                "annual_rate_percent": rate,
                "monthly_payment_rub": round(annuity_payment(amount, term, rate), 2),
                "score": scored["score"],
                "risk_level": scored["risk_level"],
            }
    return None
