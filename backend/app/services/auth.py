from fastapi import HTTPException, status

from app.core.db import SessionDep
from app.core.security import create_access_token, verify_password
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.auth import LoginRequest, TokenResponse
from app.services.base import BaseService


class AuthService(BaseService):
    def __init__(self, session: SessionDep) -> None:
        super().__init__(session)
        self.users = UserRepository(session)

    async def login(self, payload: LoginRequest) -> TokenResponse:
        user = await self.users.by_email(payload.email)
        if (
            user is None
            or not user.is_active
            or not verify_password(payload.password, user.password_hash)
        ):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Неверный e-mail или пароль")
        return self._token(user)

    @staticmethod
    def _token(user: User) -> TokenResponse:
        return TokenResponse(access_token=create_access_token(user.id, user.role.value))
