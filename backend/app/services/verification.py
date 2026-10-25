from dataclasses import dataclass
from typing import Any

from app.core.enums import CheckStatus, DocumentType
from app.core.policy import POLICY, CreditPolicy

FINANCIAL_KEYS = (
    "average_monthly_operating_expenses_rub",
    "existing_monthly_debt_payments_rub",
    "outstanding_debt_before_new_loan_rub",
    "equity_rub",
    "current_assets_rub",
    "current_liabilities_rub",
)


@dataclass(frozen=True)
class VerificationInput:
    inn: str
    name: str
    loan_amount_rub: float
    term_months: int
    declared: dict[str, Any]
    documents: dict[DocumentType, dict]
    client_supplied: tuple[DocumentType, ...] = ()


def normalize_name(name: str) -> str:
    cleaned = name.replace("«", "").replace("»", "").replace('"', "").replace("'", "")
    return " ".join(cleaned.casefold().split())


def percent_difference(left: float, right: float) -> float:
    base = max(abs(left), abs(right))
    return 0.0 if base == 0 else abs(left - right) / base * 100


def _check(code: str, title: str, status: CheckStatus, details: str) -> dict[str, str]:
    return {"code": code, "title": title, "status": status.value, "details": details}


def _differs(declared: float, documented: float, tolerance_pct: float) -> bool:
    return percent_difference(declared, documented) > tolerance_pct


def find_discrepancies(
    declared: dict[str, Any], documents: dict[DocumentType, dict], policy: CreditPolicy
) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    egrul = documents.get(DocumentType.EGRUL)
    bki = documents.get(DocumentType.BKI)
    financial = documents.get(DocumentType.FINANCIAL)

    declared_age = declared.get("age_months")
    if egrul and declared_age is not None:
        if abs(declared_age - egrul["age_months"]) > policy.age_tolerance_months:
            result.append(
                {"field": "company.age_months", "declared": declared_age,
                 "documented": egrul["age_months"]}
            )
    declared_history = declared.get("credit_history")
    if bki and declared_history is not None and declared_history != bki["credit_history_status"]:
        result.append(
            {"field": "credit_history", "declared": declared_history,
             "documented": bki["credit_history_status"]}
        )
    declared_fin = declared.get("financials") or {}
    if financial:
        declared_revenues = declared_fin.get("revenues_last_6_months_rub")
        if declared_revenues and all(v is not None for v in declared_revenues):
            declared_mean = sum(declared_revenues) / len(declared_revenues)
            documented = financial["revenues_last_6_months_rub"]
            documented_mean = sum(documented) / len(documented)
            if _differs(declared_mean, documented_mean, policy.discrepancy_tolerance_pct):
                result.append(
                    {"field": "financials.revenues_last_6_months_rub",
                     "declared": round(declared_mean, 2),
                     "documented": round(documented_mean, 2)}
                )
        for key in FINANCIAL_KEYS:
            value = declared_fin.get(key)
            if value is not None and _differs(
                value, financial[key], policy.discrepancy_tolerance_pct
            ):
                result.append(
                    {"field": f"financials.{key}", "declared": value, "documented": financial[key]}
                )
    return result


def verify_documents(data: VerificationInput, policy: CreditPolicy = POLICY) -> dict[str, Any]:
    checks: list[dict[str, str]] = []
    egrul = data.documents.get(DocumentType.EGRUL)
    bki = data.documents.get(DocumentType.BKI)
    financial = data.documents.get(DocumentType.FINANCIAL)

    missing = [t.value for t in DocumentType if t not in data.documents]
    complete = not missing
    checks.append(
        _check(
            "documents_complete",
            "Комплект документов",
            CheckStatus.PASSED if complete else CheckStatus.FAILED,
            "Все документы получены" if complete else f"Не хватает: {', '.join(missing)}",
        )
    )

    identity_match = False
    registration_active = False
    if egrul:
        inn_match = egrul["inn"] == data.inn
        name_match = normalize_name(egrul["company_name"]) == normalize_name(data.name)
        identity_match = inn_match and name_match
        mismatches = [label for label, ok in (("ИНН", inn_match), ("наименование", name_match))
                      if not ok]
        checks.append(
            _check(
                "identity_match",
                "Совпадение с ЕГРЮЛ/ЕГРИП",
                CheckStatus.PASSED if identity_match else CheckStatus.FAILED,
                "ИНН и наименование совпадают"
                if identity_match
                else f"Не совпадает: {', '.join(mismatches)}",
            )
        )
        registration_active = egrul["registration_active"]
        checks.append(
            _check(
                "registration_active",
                "Регистрация действует",
                CheckStatus.PASSED if registration_active else CheckStatus.FAILED,
                "Регистрация активна" if registration_active else "Регистрация прекращена",
            )
        )

    product = policy.product
    amount_ok = product.min_amount_rub <= data.loan_amount_rub <= product.max_amount_rub
    term_ok = product.min_term_months <= data.term_months <= product.max_term_months
    product_eligible = amount_ok and term_ok
    checks.append(
        _check(
            "product_eligible",
            "Соответствие продукту",
            CheckStatus.PASSED if product_eligible else CheckStatus.FAILED,
            "Сумма и срок в границах продукта"
            if product_eligible
            else (
                f"Сумма {product.min_amount_rub}–{product.max_amount_rub} ₽, "
                f"срок {product.min_term_months}–{product.max_term_months} мес."
            ),
        )
    )

    debt_failed = False
    if bki and financial:
        difference = percent_difference(
            bki["total_debt_rub"], financial["outstanding_debt_before_new_loan_rub"]
        )
        debt_failed = difference > policy.debt_fraud_threshold_pct
        status = (
            CheckStatus.FAILED
            if debt_failed
            else CheckStatus.WARNING
            if difference > policy.debt_mismatch_tolerance_pct
            else CheckStatus.PASSED
        )
        checks.append(
            _check(
                "debt_consistency",
                "Долг в БКИ и в финансовой отчётности",
                status,
                f"Расхождение {difference:.1f}%",
            )
        )

    blacklisted = data.inn in policy.fraud_blacklist_inns
    checks.append(
        _check(
            "blacklist",
            "Стоп-лист",
            CheckStatus.FAILED if blacklisted else CheckStatus.PASSED,
            "ИНН в стоп-листе" if blacklisted else "ИНН не найден в стоп-листе",
        )
    )

    documents_trusted = not data.client_supplied
    checks.append(
        _check(
            "documents_trusted",
            "Источник документов",
            CheckStatus.PASSED if documents_trusted else CheckStatus.WARNING,
            "Документы получены из реестра или подтверждены сотрудником"
            if documents_trusted
            else f"Загружены клиентом: {', '.join(t.value for t in data.client_supplied)}",
        )
    )

    discrepancies = find_discrepancies(data.declared, data.documents, policy)
    checks.append(
        _check(
            "declared_vs_documented",
            "Анкета и документы",
            CheckStatus.WARNING if discrepancies else CheckStatus.PASSED,
            f"Расхождений: {len(discrepancies)}" if discrepancies else "Расхождений нет",
        )
    )

    return {
        "documents_verified": complete and identity_match,
        "registration_active": registration_active,
        "product_eligible": product_eligible,
        "fraud_check_passed": not blacklisted and not debt_failed,
        "documents_trusted": documents_trusted,
        "missing_documents": missing,
        "checks": checks,
        "discrepancies": discrepancies,
    }
