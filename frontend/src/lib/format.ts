import type {
  ClientStatus,
  CreditHistory,
  DocumentSource,
  DocumentType,
  RiskLevel,
  Route,
  StageKey,
} from "@/lib/types";

const NBSP = " ";

export function groupDigits(value: number | string): string {
  const digits = String(Math.round(Number(value))).replace(/[^\d-]/g, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

export const money = (value: number | null | undefined): string =>
  value == null ? "—" : `${groupDigits(value)}${NBSP}₽`;

export const months = (value: number): string => `${value}${NBSP}мес.`;

export const dateLong = (value: string | null | undefined): string =>
  value
    ? new Date(value).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
    : "—";

export const dateTime = (value: string | null | undefined): string =>
  value
    ? new Date(value).toLocaleString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export const timeShort = (value: string | null | undefined): string =>
  value
    ? new Date(value).toLocaleString("ru-RU", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export function applicationNumber(id: number, createdAt: string): string {
  return `№${NBSP}${new Date(createdAt).getFullYear()}-${String(id).padStart(5, "0")}`;
}

export interface Tone {
  label: string;
  badge: string;
  dot: string;
}

export const STATUS_TONE: Record<ClientStatus, Tone> = {
  DRAFT: { label: "Черновик", badge: "bg-mist-200 text-ink-600", dot: "bg-mist-400" },
  IN_PROGRESS: { label: "В обработке", badge: "bg-sky-100 text-sky-900", dot: "bg-sky-500" },
  MORE_INFO_REQUIRED: {
    label: "Нужны уточнения",
    badge: "bg-amber-100 text-amber-900",
    dot: "bg-amber-500",
  },
  UNDER_REVIEW: {
    label: "На рассмотрении",
    badge: "bg-violet-100 text-violet-900",
    dot: "bg-violet-500",
  },
  APPROVED_DEMO: {
    label: "Одобрено (демо)",
    badge: "bg-lime-100 text-lime-900",
    dot: "bg-lime-700",
  },
  NOT_APPROVED_DEMO: {
    label: "Не одобрено (демо)",
    badge: "bg-red-50 text-red-700",
    dot: "bg-red-500",
  },
  OFFER_ACCEPTED_DEMO: {
    label: "Предложение принято",
    badge: "bg-pine text-white",
    dot: "bg-lime-500",
  },
};

export const RISK_TONE: Record<RiskLevel, string> = {
  LOW: "bg-lime-100 text-lime-900",
  MEDIUM: "bg-amber-100 text-amber-900",
  HIGH: "bg-red-500 text-white",
};

export const ROUTE_TONE: Record<Route, string> = {
  APPROVED: "bg-lime-100 text-lime-900",
  MANUAL_REVIEW: "bg-violet-100 text-violet-900",
  DECLINED: "bg-red-50 text-red-700",
  REQUEST_DOCUMENTS: "bg-amber-100 text-amber-900",
};

export const SOURCE_TONE: Record<DocumentSource, { label: string; badge: string }> = {
  registry: { label: "Реестр", badge: "bg-ink-900 text-white" },
  upload: { label: "Клиент", badge: "bg-sky-100 text-sky-900" },
  employee: { label: "Сотрудник", badge: "bg-violet-100 text-violet-900" },
};

export const DOCUMENT_LABEL: Record<DocumentType, string> = {
  egrul_extract: "Выписка ЕГРЮЛ/ЕГРИП",
  bki_report: "Отчёт БКИ",
  financial_report: "Финансовая отчётность",
};

export const CREDIT_HISTORY_LABEL: Record<CreditHistory, string> = {
  no_overdues_12m: "Нет просрочек за 12 мес.",
  no_history: "Истории нет",
  closed_overdue_under_30: "Закрытые просрочки до 30 дней",
  closed_overdue_30_89: "Закрытые просрочки 30–89 дней",
  current_or_90plus_overdue: "Текущая просрочка или 90+ дней",
};

export const STAGE_ORDER: StageKey[] = [
  "preliminary_scoring",
  "documents",
  "verification",
  "final_scoring",
  "decision",
];

export const STAGE_TITLE: Record<StageKey, string> = {
  preliminary_scoring: "Предварительная оценка",
  documents: "Получение документов",
  verification: "Проверка данных",
  final_scoring: "Итоговая оценка",
  decision: "Решение",
};

export const FIELD_LABEL: Record<string, string> = {
  "company.age_months": "Возраст бизнеса",
  "financials.revenues_last_6_months_rub": "Выручка за 6 месяцев",
  "financials.average_monthly_operating_expenses_rub": "Операционные расходы",
  "financials.existing_monthly_debt_payments_rub": "Платежи по долгам",
  "financials.outstanding_debt_before_new_loan_rub": "Остаток долга до нового кредита",
  "financials.equity_rub": "Собственный капитал",
  "financials.current_assets_rub": "Оборотные активы",
  "financials.current_liabilities_rub": "Краткосрочные обязательства",
  credit_history: "Кредитная история",
};

export const FACTOR_LABEL: Record<string, string> = {
  dscr: "Покрытие долговых платежей денежным потоком",
  credit_history: "Кредитная история",
  debt_to_equity: "Долговая нагрузка относительно капитала",
  liquidity: "Текущая ликвидность",
  revenue_stability: "Стабильность выручки",
  business_age: "Срок работы бизнеса",
};

export const METRIC_LABEL: Record<string, string> = {
  dscr: "DSCR",
  debt_to_equity: "Долг / капитал",
  liquidity: "Ликвидность",
  revenue_cv_pct: "CV выручки",
  new_payment_rub: "Платёж",
  mean_monthly_revenue_rub: "Средняя выручка",
  cf_proxy_rub: "Денежный поток",
};

export function metricValue(key: string, value: number | null): string {
  if (value == null) return "—";
  if (key.endsWith("_rub")) return money(value);
  if (key === "revenue_cv_pct") return `${String(value).replace(".", ",")}%`;
  return value.toFixed(2).replace(".", ",");
}

export function discrepancyValue(field: string, value: unknown): string {
  if (typeof value === "number") return field.endsWith("_rub") ? money(value) : String(value);
  if (typeof value === "string" && value in CREDIT_HISTORY_LABEL) {
    return CREDIT_HISTORY_LABEL[value as CreditHistory];
  }
  return String(value ?? "—");
}

export function monthLabels(count = 6): string[] {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - index), 1);
    const name = date.toLocaleDateString("ru-RU", { month: "long" });
    return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${date.getFullYear()}`;
  });
}
