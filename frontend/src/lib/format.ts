import type { ClientStatus, DocumentType, Route, StageState } from "@/lib/types";

export const money = (value: number | null | undefined): string =>
  value == null ? "—" : `${Math.round(value).toLocaleString("ru-RU")} ₽`;

export const dateTime = (value: string | null | undefined): string =>
  value ? new Date(value).toLocaleString("ru-RU") : "—";

export const STATUS_LABEL: Record<ClientStatus, string> = {
  DRAFT: "Черновик",
  IN_PROGRESS: "В обработке",
  MORE_INFO_REQUIRED: "Нужны уточнения",
  UNDER_REVIEW: "На рассмотрении",
  APPROVED_DEMO: "Одобрено (демо)",
  NOT_APPROVED_DEMO: "Не одобрено (демо)",
  OFFER_ACCEPTED_DEMO: "Предложение принято",
};

export const STATUS_TONE: Record<ClientStatus, string> = {
  DRAFT: "bg-neutral-200 text-neutral-700",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  MORE_INFO_REQUIRED: "bg-amber-100 text-amber-800",
  UNDER_REVIEW: "bg-violet-100 text-violet-800",
  APPROVED_DEMO: "bg-emerald-100 text-emerald-800",
  NOT_APPROVED_DEMO: "bg-red-100 text-red-800",
  OFFER_ACCEPTED_DEMO: "bg-emerald-200 text-emerald-900",
};

export const STATE_LABEL: Record<StageState, string> = {
  done: "Выполнен",
  failed: "Ошибка",
  available: "Доступен",
  locked: "Заблокирован",
};

export const STATE_TONE: Record<StageState, string> = {
  done: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-800",
  available: "bg-blue-100 text-blue-800",
  locked: "bg-neutral-200 text-neutral-500",
};

export const ROUTE_LABEL: Record<Route, string> = {
  APPROVED: "APPROVED",
  MANUAL_REVIEW: "MANUAL_REVIEW",
  DECLINED: "DECLINED",
  REQUEST_DOCUMENTS: "REQUEST_DOCUMENTS",
};

export const DOCUMENT_LABEL: Record<DocumentType, string> = {
  egrul_extract: "Выписка ЕГРЮЛ/ЕГРИП",
  bki_report: "Отчёт БКИ",
  financial_report: "Финансовая отчётность",
};

export const DOCUMENT_TEMPLATES: Record<DocumentType, Record<string, unknown>> = {
  egrul_extract: {
    document_type: "egrul_extract",
    company_name: "",
    inn: "",
    ogrn: "",
    age_months: 0,
    registration_active: true,
    director: "",
  },
  bki_report: {
    document_type: "bki_report",
    credit_history_status: "no_overdues_12m",
    active_loans_count: 0,
    total_debt_rub: 0,
  },
  financial_report: {
    document_type: "financial_report",
    period: "last_6_months",
    revenues_last_6_months_rub: [0, 0, 0, 0, 0, 0],
    average_monthly_operating_expenses_rub: 0,
    equity_rub: 0,
    current_assets_rub: 0,
    current_liabilities_rub: 0,
    outstanding_debt_before_new_loan_rub: 0,
    existing_monthly_debt_payments_rub: 0,
  },
};
