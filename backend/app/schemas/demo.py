from typing import Any

from pydantic import BaseModel


class DemoScenarioOut(BaseModel):
    key: str
    title: str
    company: dict[str, Any]
    loan: dict[str, Any]
    declared: dict[str, Any]
