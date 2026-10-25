export type Role = "client" | "employee";

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: Role;
}

export type StageKey =
  | "preliminary_scoring"
  | "documents"
  | "verification"
  | "final_scoring"
  | "decision";

export type StageState = "done" | "failed" | "available" | "locked";

export type ClientStatus =
  | "DRAFT"
  | "IN_PROGRESS"
  | "MORE_INFO_REQUIRED"
  | "UNDER_REVIEW"
  | "APPROVED_DEMO"
  | "NOT_APPROVED_DEMO"
  | "OFFER_ACCEPTED_DEMO";

export type Route = "APPROVED" | "MANUAL_REVIEW" | "DECLINED" | "REQUEST_DOCUMENTS";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type DocumentType = "egrul_extract" | "bki_report" | "financial_report";

export type DocumentSource = "registry" | "upload" | "employee";

export type CreditHistory =
  | "no_overdues_12m"
  | "no_history"
  | "closed_overdue_under_30"
  | "closed_overdue_30_89"
  | "current_or_90plus_overdue";

export interface PipelineStage {
  stage: StageKey;
  title: string;
  state: StageState;
  finished_at: string | null;
  result: Record<string, unknown> | null;
}

export interface Pipeline {
  application_id: number;
  status: ClientStatus;
  next_stage: StageKey | null;
  stages: PipelineStage[];
}

export interface OfferTerms {
  amount_rub: number;
  term_months: number;
  annual_rate_percent: number;
  monthly_payment_rub: number;
}

export interface AcceptedOffer extends OfferTerms {
  kind: "requested" | "alternative";
}

export interface ActionItem {
  code: string;
  document_type: DocumentType | null;
  field: string | null;
}

export interface DocumentBrief {
  doc_type: DocumentType;
  source: DocumentSource;
  created_at: string;
}

export interface Financials {
  revenues_last_6_months_rub?: (number | null)[] | null;
  average_monthly_operating_expenses_rub?: number | null;
  existing_monthly_debt_payments_rub?: number | null;
  outstanding_debt_before_new_loan_rub?: number | null;
  equity_rub?: number | null;
  current_assets_rub?: number | null;
  current_liabilities_rub?: number | null;
}

export interface Declared {
  age_months?: number | null;
  financials?: Financials | null;
  credit_history?: CreditHistory | null;
}

export interface Company {
  inn: string;
  name: string;
  legal_form: "IP" | "OOO";
}

export interface Application {
  id: number;
  created_at: string;
  company: Company;
  loan: {
    amount_rub: number;
    term_months: number;
    annual_rate_percent: number;
    purpose: string | null;
    monthly_payment_rub: number;
  };
  status: ClientStatus;
  status_title: string;
  status_text: string;
  declared: Declared;
  actions: ActionItem[];
  offer: OfferTerms | null;
  alternative_offer: OfferTerms | null;
  accepted_offer: AcceptedOffer | null;
  accepted_at: string | null;
  documents: DocumentBrief[];
}

export interface Factor {
  code: string;
  label: string;
  points: number;
  max_points: number;
  lost_points: number;
  value: number | string | null;
  explanation: string;
}

export interface Assessment {
  id: number;
  kind: "preliminary" | "verified";
  created_at: string;
  data_source: string;
  model_version: string;
  score: number;
  risk_level: RiskLevel;
  breakdown: Record<string, number>;
  metrics: Record<string, number | null>;
  factors: Factor[];
  main_risk_factors: string[];
  warnings: string[];
  route: Route;
  route_reason: string;
  policy_version: string;
}

export interface CheckItem {
  code: string;
  title: string;
  status: "passed" | "warning" | "failed";
  details: string;
}

export interface Discrepancy {
  field: string;
  declared: unknown;
  documented: unknown;
}

export interface Checks {
  documents_verified: boolean;
  registration_active: boolean;
  product_eligible: boolean;
  fraud_check_passed: boolean;
  documents_trusted: boolean;
  checks: CheckItem[];
  discrepancies: Discrepancy[];
}

export interface EmployeeApplication extends Application {
  owner_id: number;
  checks: Checks | null;
  route: Route | null;
  assessments: Assessment[];
  comparison: { score_before: number; score_after: number; delta: number } | null;
  bank_offer: (OfferTerms & { score: number; risk_level: string }) | null;
  manual_review: {
    decision: "approve" | "decline";
    comment: string | null;
    decided_at: string | null;
  } | null;
  documents_payload: Record<string, Record<string, unknown>>;
}

export type AnyApplication = Application | EmployeeApplication;

export interface ApplicationListItem {
  id: number;
  created_at: string;
  company_name: string;
  inn: string;
  amount_rub: number;
  term_months: number;
  status: ClientStatus;
  route: Route | null;
  score: number | null;
}

export interface Page<T> {
  items: T[];
  total: number;
}

export interface Scenario {
  key: string;
  title: string;
  company: Company;
  loan: { amount_rub: number; term_months: number; purpose?: string };
  declared: Declared;
}

export interface ApplicationDraft {
  company: Company;
  loan: { amount_rub: number; term_months: number; purpose: string | null };
  declared: Declared;
}

export function isEmployeeApplication(app: AnyApplication): app is EmployeeApplication {
  return "assessments" in app;
}
