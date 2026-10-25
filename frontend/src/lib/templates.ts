import type { DocumentType } from "@/lib/types";

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
