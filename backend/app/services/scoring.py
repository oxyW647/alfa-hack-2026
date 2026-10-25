import math
import statistics
from collections.abc import Mapping
from typing import Any

MODEL_VERSION = "1.2.0"
SCHEMA_VERSION = "1.0.0"

MAX_POINTS = {
    "dscr": 30,
    "credit_history": 20,
    "debt_to_equity": 15,
    "liquidity": 15,
    "revenue_stability": 15,
    "business_age": 5,
}

HISTORY_POINTS = {
    "no_overdues_12m": 20,
    "no_history": 10,
    "closed_overdue_under_30": 12,
    "closed_overdue_30_89": 5,
    "current_or_90plus_overdue": 0,
}

HISTORY_EXPLANATIONS = {
    "no_overdues_12m": "За последние 12 месяцев просрочек нет",
    "no_history": "Кредитная история отсутствует",
    "closed_overdue_under_30": "Были закрытые просрочки менее 30 дней",
    "closed_overdue_30_89": "Были закрытые просрочки от 30 до 89 дней",
    "current_or_90plus_overdue": "Есть действующая просрочка или просрочка 90+ дней",
}

FACTOR_LABELS = {
    "dscr": "Покрытие долговых платежей денежным потоком (proxy)",
    "credit_history": "Кредитная история",
    "debt_to_equity": "Долговая нагрузка относительно капитала",
    "liquidity": "Текущая ликвидность",
    "revenue_stability": "Стабильность выручки",
    "business_age": "Срок работы бизнеса",
}


class ScoringError(ValueError):
    def __init__(self, code: str, message: str, field: str | None = None):
        super().__init__(message)
        self.code = code
        self.field = field

    def as_dict(self) -> dict[str, Any]:
        return {"code": self.code, "message": str(self), "field": self.field}


def _object(obj: Any, field: str) -> Mapping[str, Any]:
    if not isinstance(obj, Mapping):
        raise ScoringError("INVALID_INPUT", "Ожидается объект", field)
    return obj


def _required(obj: Mapping[str, Any], key: str, prefix: str) -> Any:
    field = f"{prefix}.{key}" if prefix else key
    if key not in obj or obj[key] is None:
        raise ScoringError("INSUFFICIENT_DATA", "Не заполнено обязательное поле", field)
    return obj[key]


def _number(
    obj: Mapping[str, Any],
    key: str,
    prefix: str,
    *,
    allow_negative: bool = False,
    positive: bool = False,
    integer: bool = False,
) -> float:
    field = f"{prefix}.{key}"
    value = _required(obj, key, prefix)
    if isinstance(value, bool) or not isinstance(value, float | int):
        raise ScoringError("INVALID_INPUT", "Поле должно быть числом, не строкой или bool", field)
    try:
        number = float(value)
    except (ValueError, OverflowError):
        raise ScoringError("INVALID_INPUT", "Число не представимо", field) from None
    if not math.isfinite(number):
        raise ScoringError("INVALID_INPUT", "Число должно быть конечным", field)
    if (not allow_negative and number < 0) or (positive and number <= 0):
        raise ScoringError("INVALID_INPUT", "Значение вне допустимого диапазона", field)
    if integer and not number.is_integer():
        raise ScoringError("INVALID_INPUT", "Требуется целое число", field)
    return number


def _sum_finite(a: float, b: float, field: str) -> float:
    result = a + b
    if not math.isfinite(result):
        raise ScoringError("INVALID_INPUT", "Числовое переполнение", field)
    return result


def _ratio(num: float, den: float, field: str) -> float:
    try:
        value = num / den
    except (ZeroDivisionError, OverflowError):
        raise ScoringError("INVALID_INPUT", "Невозможно вычислить коэффициент", field) from None
    if not math.isfinite(value):
        raise ScoringError("INVALID_INPUT", "Некорректное значение коэффициента", field)
    return value


def annuity_payment(amount: float, term_months: int, annual_rate_percent: float) -> float:
    if term_months <= 0 or amount <= 0 or annual_rate_percent < 0:
        raise ScoringError("INVALID_INPUT", "Некорректные параметры кредита", "loan")
    if annual_rate_percent == 0:
        payment = amount / term_months
    else:
        monthly_rate = annual_rate_percent / 1200
        denominator = -math.expm1(-term_months * math.log1p(monthly_rate))
        payment = amount * (monthly_rate / denominator)
    if not math.isfinite(payment) or payment <= 0:
        raise ScoringError("INVALID_INPUT", "Невозможно вычислить аннуитетный платёж", "loan")
    return payment


def dscr_points(value: float) -> int:
    return 30 if value >= 1.5 else 22 if value >= 1.2 else 12 if value >= 1.0 else 0


def debt_to_equity_points(value: float) -> int:
    return 15 if value <= 0.5 else 10 if value <= 1.0 else 5 if value <= 2.0 else 0


def liquidity_points(value: float) -> int:
    return (
        15 if value >= 1.5 else 12 if value >= 1.2 else 10 if value >= 1.0
        else 5 if value >= 0.8 else 0
    )


def revenue_cv_points(value: float) -> int:
    return 15 if value <= 0.10 else 12 if value <= 0.25 else 5 if value <= 0.40 else 0


def business_age_points(months: int) -> int:
    return 5 if months >= 36 else 3 if months >= 12 else 1 if months >= 6 else 0


def _factor(code: str, points: int, raw_value: Any, explanation: str) -> dict[str, Any]:
    limit = MAX_POINTS[code]
    return {
        "code": code,
        "label": FACTOR_LABELS[code],
        "points": points,
        "max_points": limit,
        "lost_points": limit - points,
        "value": raw_value,
        "explanation": explanation,
    }


def score_application(application: Mapping[str, Any]) -> dict[str, Any]:
    body = _object(application, "application")
    company = _object(_required(body, "company", ""), "company")
    fin = _object(_required(body, "financials", ""), "financials")
    loan = _object(_required(body, "loan", ""), "loan")

    rev_obj = _required(fin, "revenues_last_6_months_rub", "financials")
    rev_field = "financials.revenues_last_6_months_rub"
    if not isinstance(rev_obj, list | tuple):
        raise ScoringError("INVALID_INPUT", "Ожидается массив выручки", rev_field)
    if len(rev_obj) < 6 or any(x is None for x in rev_obj):
        raise ScoringError("INSUFFICIENT_DATA", "Нужны 6 заполненных месяцев выручки", rev_field)
    if len(rev_obj) > 6:
        raise ScoringError("INVALID_INPUT", "Должно быть ровно 6 месяцев выручки", rev_field)
    revenues = [
        _number({"amount": value}, "amount", f"{rev_field}[{i}]") for i, value in enumerate(rev_obj)
    ]

    age = _number(company, "age_months", "company", integer=True)
    expenses = _number(fin, "average_monthly_operating_expenses_rub", "financials")
    existing_payments = _number(fin, "existing_monthly_debt_payments_rub", "financials")
    outstanding = _number(fin, "outstanding_debt_before_new_loan_rub", "financials")
    equity = _number(fin, "equity_rub", "financials", allow_negative=True)
    current_assets = _number(fin, "current_assets_rub", "financials")
    current_liabilities = _number(fin, "current_liabilities_rub", "financials")
    amount = _number(loan, "amount_rub", "loan", positive=True)
    term_months = int(_number(loan, "term_months", "loan", positive=True, integer=True))
    rate = _number(loan, "annual_rate_percent", "loan")

    history = _required(body, "credit_history", "")
    if not isinstance(history, str) or history not in HISTORY_POINTS:
        raise ScoringError(
            "INVALID_INPUT", "Неизвестное значение кредитной истории", "credit_history"
        )

    payment = annuity_payment(amount, term_months, rate)
    mean_revenue = statistics.fmean(revenues)
    if not math.isfinite(mean_revenue):
        raise ScoringError("INVALID_INPUT", "Не удалось рассчитать среднюю выручку", rev_field)
    cash_flow = mean_revenue - expenses
    total_payment = _sum_finite(
        existing_payments, payment, "financials.existing_monthly_debt_payments_rub"
    )
    dscr = _ratio(cash_flow, total_payment, "financials")
    cv: float | None = None
    if mean_revenue > 0:
        cv = _ratio(statistics.pstdev(revenues), mean_revenue, rev_field)
    warnings: list[str] = []
    debt: float | None = None
    if equity <= 0:
        debt_pts = 0
        warnings.append("NON_POSITIVE_EQUITY")
    else:
        debt = _ratio(
            _sum_finite(outstanding, amount, "financials.outstanding_debt_before_new_loan_rub"),
            equity,
            "financials.equity_rub",
        )
        debt_pts = debt_to_equity_points(debt)

    liquidity: float | None = None
    if current_liabilities == 0:
        if current_assets == 0:
            raise ScoringError(
                "INSUFFICIENT_DATA",
                "Невозможно оценить ликвидность: активы и обязательства равны нулю",
                "financials.current_liabilities_rub",
            )
        liquidity_pts = 15
        warnings.append("NO_CURRENT_LIABILITIES")
    else:
        liquidity = _ratio(
            current_assets, current_liabilities, "financials.current_liabilities_rub"
        )
        liquidity_pts = liquidity_points(liquidity)

    if cv is None:
        cv_pts = 0
        warnings.append("NO_REVENUE")
    else:
        cv_pts = revenue_cv_points(cv)

    breakdown = {
        "dscr": dscr_points(dscr),
        "credit_history": HISTORY_POINTS[history],
        "debt_to_equity": debt_pts,
        "liquidity": liquidity_pts,
        "revenue_stability": cv_pts,
        "business_age": business_age_points(int(age)),
    }
    score = sum(breakdown.values())
    risk_level = "LOW" if score >= 76 else "MEDIUM" if score >= 46 else "HIGH"

    factors = [
        _factor(
            "dscr",
            breakdown["dscr"],
            round(dscr, 4),
            "Денежный поток покрывает платежи"
            if dscr >= 1.2
            else "Недостаточное покрытие долговых платежей",
        ),
        _factor(
            "credit_history", breakdown["credit_history"], history, HISTORY_EXPLANATIONS[history]
        ),
        _factor(
            "debt_to_equity",
            breakdown["debt_to_equity"],
            None if debt is None else round(debt, 4),
            "Собственный капитал не положителен"
            if equity <= 0
            else "Высокая нагрузка на капитал"
            if debt is not None and debt > 1.0
            else "Нагрузка на капитал умеренная",
        ),
        _factor(
            "liquidity",
            breakdown["liquidity"],
            None if liquidity is None else round(liquidity, 4),
            "Краткосрочных обязательств нет"
            if liquidity is None
            else "Недостаточная текущая ликвидность"
            if liquidity < 1.0
            else "Текущая ликвидность достаточна по шкале MVP",
        ),
        _factor(
            "revenue_stability",
            breakdown["revenue_stability"],
            None if cv is None else round(cv * 100, 2),
            "Выручка отсутствует, вариация неопределена"
            if cv is None
            else "Выручка нестабильна"
            if cv > 0.25
            else "Выручка относительно стабильна",
        ),
        _factor(
            "business_age",
            breakdown["business_age"],
            int(age),
            "Бизнес существует менее года"
            if age < 12
            else "Бизнес имеет историю деятельности",
        ),
    ]
    ranked = sorted(
        (f for f in factors if f["lost_points"] > 0),
        key=lambda f: (-f["lost_points"], list(MAX_POINTS).index(f["code"])),
    )
    return {
        "schema_version": SCHEMA_VERSION,
        "model_version": MODEL_VERSION,
        "score": score,
        "risk_level": risk_level,
        "breakdown": breakdown,
        "metrics": {
            "mean_monthly_revenue_rub": round(mean_revenue, 2),
            "new_payment_rub": round(payment, 2),
            "cf_proxy_rub": round(cash_flow, 2),
            "dscr": round(dscr, 4),
            "debt_to_equity": None if debt is None else round(debt, 4),
            "liquidity": None if liquidity is None else round(liquidity, 4),
            "revenue_cv_pct": None if cv is None else round(cv * 100, 2),
        },
        "factors": factors,
        "main_risk_factors": [f["code"] for f in ranked[:3]],
        "warnings": warnings,
    }
