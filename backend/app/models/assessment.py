from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base, pg_enum
from app.core.enums import AssessmentKind, RiskLevel, Route


class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[int] = mapped_column(primary_key=True)
    application_id: Mapped[int] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE"), index=True
    )
    kind: Mapped[AssessmentKind] = mapped_column(pg_enum(AssessmentKind, "assessment_kind"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    data_source: Mapped[str] = mapped_column(String(32))
    input_snapshot: Mapped[dict] = mapped_column(JSONB)
    model_version: Mapped[str] = mapped_column(String(16))
    schema_version: Mapped[str] = mapped_column(String(16))

    score: Mapped[int]
    risk_level: Mapped[RiskLevel] = mapped_column(pg_enum(RiskLevel, "risk_level"))
    breakdown: Mapped[dict] = mapped_column(JSONB)
    metrics: Mapped[dict] = mapped_column(JSONB)
    factors: Mapped[list] = mapped_column(JSONB)
    main_risk_factors: Mapped[list] = mapped_column(JSONB)
    warnings: Mapped[list] = mapped_column(JSONB)

    route: Mapped[Route] = mapped_column(pg_enum(Route, "route"))
    route_reason: Mapped[str] = mapped_column(String(255))
    policy_version: Mapped[str] = mapped_column(String(32))

    application: Mapped["Application"] = relationship(back_populates="assessments")


from app.models.application import Application
