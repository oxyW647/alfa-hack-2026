"""Demonstration-only routing. This is NOT part of the risk scoring engine.

In a real backend these checks come from verified company, product, KYC/fraud,
and document systems rather than from the untrusted form payload.
"""

from __future__ import annotations
from collections.abc import Mapping
from typing import Any

from .scoring import ScoringError


def _required_boolean(obj: Mapping[str, Any], key: str, path: str) -> bool:
    field = f"{path}.{key}"
    if key not in obj or obj[key] is None:
        raise ScoringError("INSUFFICIENT_DATA", "Не заполнено обязательное поле проверки", field)
    value = obj[key]
    if not isinstance(value, bool):
        raise ScoringError("INVALID_INPUT", "Требуется булево значение", field)
    return value


def evaluate_demo_route(score_result: Mapping[str, Any], application: Mapping[str, Any]) -> dict[str, Any]:
    """Use scoring output + mocked backend checks; never write decisions into scoring.py."""
    company = application.get("company")
    checks = application.get("checks")
    if not isinstance(company, Mapping) or not isinstance(checks, Mapping):
        raise ScoringError("INSUFFICIENT_DATA", "Нет данных проверок компании или документов", "checks")
    documents_verified = _required_boolean(checks, "documents_verified", "checks")
    registration_active = _required_boolean(company, "registration_active", "company")
    product_eligible = _required_boolean(checks, "product_eligible", "checks")
    fraud_check_passed = _required_boolean(checks, "fraud_check_passed", "checks")
    score = score_result.get("score")
    alternative_offer = None
    if type(score) is not int or not (0 <= score <= 100):
        raise ScoringError("INVALID_INPUT", "Некорректный результат скоринга", "score")
    warnings = score_result.get("warnings", [])
    if not isinstance(warnings, list) or any(not isinstance(w, str) for w in warnings):
        raise ScoringError("INVALID_INPUT", "Некорректные предупреждения", "warnings")

    # Preserve v1.2 fixture priority for demo route selection.
    if not documents_verified:
        route, reason = "REQUEST_DOCUMENTS", "Не подтверждены документы"
    elif not registration_active or not product_eligible:
        route, reason = "DECLINED", "Бизнес или продукт не соответствует обязательным условиям"
    elif not fraud_check_passed or "NON_POSITIVE_EQUITY" in warnings:
        route, reason = "MANUAL_REVIEW", "Требуется дополнительное рассмотрение"
    elif score > 75:
        route, reason = "APPROVED", "Порог модели превышен; моковые проверки пройдены"
    elif score >= 46:
        route, reason = "MANUAL_REVIEW", "Средний скоринговый риск"
    else:
        route, reason = "DECLINED", "Высокий скоринговый риск по правилам демо"

    if route == "MANUAL_REVIEW":
        loan = application.get("loan", {})
        amount = loan.get("amount_rub", 0)
        term = loan.get("term_months", 0)
        metrics = score_result.get("metrics", {})
        dscr = metrics.get("dscr", 0)

        if dscr < 1.2:
            alternative_offer = {
                "type": "REDUCED_AMOUNT",
                "amount_rub": int(amount * 0.7),
                "term_months": term,
                "message": "Банк готов предложить 70% от запрошенной суммы."
            }
        elif term < 12 and dscr >= 1.2:
            alternative_offer = {
                "type": "INCREASED_TERM",
                "amount_rub": amount,
                "term_months": term + 6,
                "message": "Банк готов увеличить срок кредита на 6 месяцев."
            }
        else:
            alternative_offer = {
                "type": "COLLATERAL_REQUIRED",
                "amount_rub": amount,
                "term_months": term,
                "message": "Для одобрения требуется залог."
            }

    return {"route": route, "reason": reason, "alternative_offer": alternative_offer, "policy_version": "demo-1.3.0"}
