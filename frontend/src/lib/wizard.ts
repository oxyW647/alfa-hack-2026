import type {
  ApplicationDraft,
  AnyApplication,
  CreditHistory,
  Declared,
  Financials,
  Scenario,
} from "@/lib/types";

export const STEPS = ["Компания", "Условия кредита", "Сведения о бизнесе", "Отправка"] as const;

export type StepErrors = Record<string, string>;

export interface WizardValues {
  inn: string;
  name: string;
  legalForm: "IP" | "OOO";
  amount: string;
  term: string;
  purpose: string;
  age: string;
  revenues: string[];
  opex: string;
  payments: string;
  debt: string;
  equity: string;
  assets: string;
  liabilities: string;
  history: CreditHistory | "";
}

export const EMPTY_VALUES: WizardValues = {
  inn: "",
  name: "",
  legalForm: "OOO",
  amount: "",
  term: "",
  purpose: "",
  age: "",
  revenues: ["", "", "", "", "", ""],
  opex: "",
  payments: "",
  debt: "",
  equity: "",
  assets: "",
  liabilities: "",
  history: "",
};

const text = (value: number | null | undefined): string => (value == null ? "" : String(value));

function declaredToValues(declared: Declared): Partial<WizardValues> {
  const fin: Financials = declared.financials ?? {};
  const revenues = Array.from({ length: 6 }, (_, index) =>
    text(fin.revenues_last_6_months_rub?.[index]),
  );
  return {
    age: text(declared.age_months),
    revenues,
    opex: text(fin.average_monthly_operating_expenses_rub),
    payments: text(fin.existing_monthly_debt_payments_rub),
    debt: text(fin.outstanding_debt_before_new_loan_rub),
    equity: text(fin.equity_rub),
    assets: text(fin.current_assets_rub),
    liabilities: text(fin.current_liabilities_rub),
    history: declared.credit_history ?? "",
  };
}

export function valuesFromScenario(scenario: Scenario): WizardValues {
  return {
    ...EMPTY_VALUES,
    inn: scenario.company.inn,
    name: scenario.company.name,
    legalForm: scenario.company.legal_form,
    amount: text(scenario.loan.amount_rub),
    term: text(scenario.loan.term_months),
    purpose: scenario.loan.purpose ?? "",
    ...declaredToValues(scenario.declared),
  };
}

export function valuesFromApplication(app: AnyApplication): WizardValues {
  return {
    ...EMPTY_VALUES,
    inn: app.company.inn,
    name: app.company.name,
    legalForm: app.company.legal_form,
    amount: text(app.loan.amount_rub),
    term: text(app.loan.term_months),
    purpose: app.loan.purpose ?? "",
    ...declaredToValues(app.declared),
  };
}

const num = (value: string): number | null => (value.trim() === "" ? null : Number(value));

export function valuesToDraft(values: WizardValues): ApplicationDraft {
  const anyRevenue = values.revenues.some((item) => item !== "");
  const financials: Financials = {
    revenues_last_6_months_rub: anyRevenue ? values.revenues.map(num) : null,
    average_monthly_operating_expenses_rub: num(values.opex),
    existing_monthly_debt_payments_rub: num(values.payments),
    outstanding_debt_before_new_loan_rub: num(values.debt),
    equity_rub: num(values.equity),
    current_assets_rub: num(values.assets),
    current_liabilities_rub: num(values.liabilities),
  };
  return {
    company: { inn: values.inn.trim(), name: values.name.trim(), legal_form: values.legalForm },
    loan: {
      amount_rub: Number(values.amount),
      term_months: Number(values.term),
      purpose: values.purpose.trim() || null,
    },
    declared: {
      age_months: num(values.age),
      financials,
      credit_history: values.history === "" ? null : values.history,
    },
  };
}

export function validateStep(step: number, values: WizardValues): StepErrors {
  const errors: StepErrors = {};
  if (step === 0) {
    if (!/^\d{10}(\d{2})?$/.test(values.inn.trim())) errors["company.inn"] = "ИНН: 10 или 12 цифр";
    if (!values.name.trim()) errors["company.name"] = "Укажите наименование";
  }
  if (step === 1) {
    if (!(Number(values.amount) > 0)) errors["loan.amount_rub"] = "Укажите сумму кредита";
    const term = Number(values.term);
    if (!values.term || !Number.isInteger(term) || term <= 0) {
      errors["loan.term_months"] = "Укажите срок кредита";
    }
  }
  return errors;
}

export function stepOfField(field: string): number {
  if (field.startsWith("company.")) return 0;
  if (field.startsWith("loan.")) return 1;
  return 2;
}

export function revenueIncomplete(values: WizardValues): boolean {
  const filled = values.revenues.filter((item) => item !== "").length;
  return filled > 0 && filled < 6;
}

export function errorsForSteps(errors: StepErrors): Set<number> {
  return new Set(Object.keys(errors).map(stepOfField));
}
