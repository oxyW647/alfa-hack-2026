from datetime import datetime
from typing import Any

from pydantic import BaseModel

from app.core.enums import ClientStatus, Stage, StageState


class PipelineStageOut(BaseModel):
    stage: Stage
    title: str
    state: StageState
    finished_at: datetime | None
    result: dict[str, Any] | None


class PipelineOut(BaseModel):
    application_id: int
    status: ClientStatus
    next_stage: Stage | None
    stages: list[PipelineStageOut]
