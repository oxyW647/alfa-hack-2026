from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base, pg_enum
from app.core.enums import Stage, StageStatus


class StageRun(Base):
    __tablename__ = "stage_runs"
    __table_args__ = (UniqueConstraint("application_id", "stage"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    application_id: Mapped[int] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE"), index=True
    )
    stage: Mapped[Stage] = mapped_column(pg_enum(Stage, "pipeline_stage"))
    status: Mapped[StageStatus] = mapped_column(pg_enum(StageStatus, "stage_status"))
    result: Mapped[dict] = mapped_column(JSONB, default=dict)
    finished_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    application: Mapped["Application"] = relationship(back_populates="stage_runs")


from app.models.application import Application
