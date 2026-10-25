from datetime import UTC, datetime

from pydantic import BaseModel, ConfigDict, field_validator


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    @field_validator("*", mode="after")
    @classmethod
    def _mark_naive_datetime_as_utc(cls, value):
        if isinstance(value, datetime) and value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value


class Message(BaseModel):
    detail: str


class Page[ItemT](BaseModel):
    items: list[ItemT]
    total: int
