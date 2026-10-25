from enum import StrEnum


class UserRole(StrEnum):
    CLIENT = "client"
    EMPLOYEE = "employee"


class LegalForm(StrEnum):
    IP = "IP"
    OOO = "OOO"


class CreditHistory(StrEnum):
    NO_OVERDUES_12M = "no_overdues_12m"
    NO_HISTORY = "no_history"
    CLOSED_OVERDUE_UNDER_30 = "closed_overdue_under_30"
    CLOSED_OVERDUE_30_89 = "closed_overdue_30_89"
    CURRENT_OR_90PLUS_OVERDUE = "current_or_90plus_overdue"


class DocumentType(StrEnum):
    EGRUL = "egrul_extract"
    BKI = "bki_report"
    FINANCIAL = "financial_report"


class DocumentSource(StrEnum):
    REGISTRY = "registry"
    UPLOAD = "upload"
    EMPLOYEE = "employee"


class Stage(StrEnum):
    PRELIMINARY_SCORING = "preliminary_scoring"
    DOCUMENTS = "documents"
    VERIFICATION = "verification"
    FINAL_SCORING = "final_scoring"
    DECISION = "decision"


class StageStatus(StrEnum):
    DONE = "done"
    FAILED = "failed"


class StageState(StrEnum):
    DONE = "done"
    FAILED = "failed"
    AVAILABLE = "available"
    LOCKED = "locked"


class AssessmentKind(StrEnum):
    PRELIMINARY = "preliminary"
    VERIFIED = "verified"


class RiskLevel(StrEnum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class Route(StrEnum):
    APPROVED = "APPROVED"
    MANUAL_REVIEW = "MANUAL_REVIEW"
    DECLINED = "DECLINED"
    REQUEST_DOCUMENTS = "REQUEST_DOCUMENTS"


class ClientStatus(StrEnum):
    DRAFT = "DRAFT"
    IN_PROGRESS = "IN_PROGRESS"
    MORE_INFO_REQUIRED = "MORE_INFO_REQUIRED"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED_DEMO = "APPROVED_DEMO"
    NOT_APPROVED_DEMO = "NOT_APPROVED_DEMO"
    OFFER_ACCEPTED_DEMO = "OFFER_ACCEPTED_DEMO"


class ManualDecision(StrEnum):
    APPROVE = "approve"
    DECLINE = "decline"


class OfferKind(StrEnum):
    REQUESTED = "requested"
    ALTERNATIVE = "alternative"


class CheckStatus(StrEnum):
    PASSED = "passed"
    WARNING = "warning"
    FAILED = "failed"
