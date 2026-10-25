from fastapi import APIRouter

from app.api.deps import CurrentUser
from app.api.services import AuthDep
from app.schemas.auth import LoginRequest, TokenResponse, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, service: AuthDep):
    return await service.login(payload)


@router.get("/me", response_model=UserOut)
async def me(user: CurrentUser):
    return user
