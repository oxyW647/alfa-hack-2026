from fastapi import HTTPException, status

from app.core.db import SessionDep
from app.models.application import Application
from app.models.user import User
from app.repositories.application import ApplicationRepository
from app.services.base import BaseService


class AccessService(BaseService):
    def __init__(self, session: SessionDep) -> None:
        super().__init__(session)
        self.applications = ApplicationRepository(session)

    async def application_for(
        self, application_id: int, user: User, *, writable: bool = False
    ) -> Application:
        application = await self.applications.get_full(application_id)
        if application is None or (not user.is_employee and application.owner_id != user.id):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Заявка не найдена")
        if writable:
            self.ensure_writable(application, user)
        return application

    @staticmethod
    def ensure_writable(application: Application, user: User) -> None:
        if application.accepted_at is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, "Заявка уже завершена")
        if application.manual_decision is not None and not user.is_employee:
            raise HTTPException(
                status.HTTP_409_CONFLICT, "Решение по заявке уже принято сотрудником"
            )
