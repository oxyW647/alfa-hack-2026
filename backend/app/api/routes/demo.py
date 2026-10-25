from fastapi import APIRouter

from app.api.deps import CurrentUser
from app.schemas.demo import DemoScenarioOut
from app.services.demo import DemoService

router = APIRouter(prefix="/demo", tags=["demo"])


@router.get("/scenarios", response_model=list[DemoScenarioOut])
async def scenarios(user: CurrentUser):
    return DemoService.scenarios()
