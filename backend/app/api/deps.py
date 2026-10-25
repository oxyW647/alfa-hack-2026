from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.db import SessionDep
from app.core.security import decode_access_token
from app.models.user import User
from app.repositories.user import UserRepository

bearer = HTTPBearer(auto_error=False)

NOT_AUTHENTICATED = "Требуется авторизация"


async def current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    session: SessionDep,
) -> User:
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, NOT_AUTHENTICATED)
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, NOT_AUTHENTICATED)
    user = await UserRepository(session).get(int(payload["sub"]))
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, NOT_AUTHENTICATED)
    return user


CurrentUser = Annotated[User, Depends(current_user)]


async def employee_user(user: CurrentUser) -> User:
    if not user.is_employee:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Недостаточно прав")
    return user


EmployeeUser = Annotated[User, Depends(employee_user)]
