from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base, TimestampMixin, pg_enum
from app.core.enums import ClientStatus, ManualDecision, Route, Stage, StageStatus


class Application(Base, TimestampMixin):
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id", ondelete="RESTRICT"), index=True
    )

    loan_amount_rub: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    term_months: Mapped[int]
    annual_rate_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2))
    purpose: Mapped[str | None] = mapped_column(String(500), default=None)

    declared: Mapped[dict] = mapped_column(JSONB, default=dict)
    checks: Mapped[dict | None] = mapped_column(JSONB, default=None)
    bank_offer: Mapped[dict | None] = mapped_column(JSONB, default=None)

    manual_decision: Mapped[ManualDecision | None] = mapped_column(
        pg_enum(ManualDecision, "manual_decision"), default=None
    )
    manual_comment: Mapped[str | None] = mapped_column(String(1000), default=None)
    manual_decided_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), default=None
    )
    manual_decided_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None
    )

    accepted_offer: Mapped[dict | None] = mapped_column(JSONB, default=None)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)

    company: Mapped["Company"] = relationship(lazy="joined")
    documents: Mapped[list["Document"]] = relationship(
        back_populates="application", cascade="all, delete-orphan", order_by="Document.id"
    )
    stage_runs: Mapped[list["StageRun"]] = relationship(
        back_populates="application", cascade="all, delete-orphan", order_by="StageRun.id"
    )
    assessments: Mapped[list["Assessment"]] = relationship(
        back_populates="application", cascade="all, delete-orphan", order_by="Assessment.id"
    )

    def run_of(self, stage: Stage) -> "StageRun | None":
        return next((run for run in self.stage_runs if run.stage == stage), None)

    def done(self, stage: Stage) -> bool:
        run = self.run_of(stage)
        return run is not None and run.status == StageStatus.DONE

    @property
    def final_assessment(self) -> "Assessment | None":
        verified = [a for a in self.assessments if a.kind.value == "verified"]
        return verified[-1] if verified else None

    @property
    def preliminary_assessment(self) -> "Assessment | None":
        preliminary = [a for a in self.assessments if a.kind.value == "preliminary"]
        return preliminary[-1] if preliminary else None

    @property
    def route(self) -> Route | None:
        decision_run = self.run_of(Stage.DECISION)
        if decision_run is not None and decision_run.status == StageStatus.DONE:
            return Route(decision_run.result["route"])
        preliminary = self.run_of(Stage.PRELIMINARY_SCORING)
        if preliminary is not None and preliminary.status == StageStatus.DONE:
            route = preliminary.result.get("route")
            if preliminary.result.get("review_decision") == "decline":
                return Route.DECLINED
            if route in (Route.DECLINED.value, Route.MANUAL_REVIEW.value):
                return Route(route)
        return None

    @property
    def client_status(self) -> ClientStatus:
        from app.services.statuses import resolve_client_status

        return resolve_client_status(self)


from app.models.assessment import Assessment
from app.models.company import Company
from app.models.document import Document
from app.models.stage_run import StageRun
