from sqlalchemy import Select, select
from sqlalchemy.orm import selectinload

from app.core.enums import Route
from app.models.application import Application
from app.models.company import Company
from app.models.document import Document
from app.models.stage_run import StageRun
from app.repositories.base import BaseRepository

FULL = (
    selectinload(Application.documents),
    selectinload(Application.stage_runs),
    selectinload(Application.assessments),
)


class ApplicationRepository(BaseRepository[Application]):
    model = Application

    async def get_full(self, application_id: int) -> Application | None:
        return await self.scalar_one_or_none(
            select(Application)
            .where(Application.id == application_id)
            .options(*FULL)
            .execution_options(populate_existing=True)
        )

    @staticmethod
    def listing(
        owner_id: int | None, q: str | None, route: Route | None = None
    ) -> Select:
        stmt = (
            select(Application)
            .join(Company, Company.id == Application.company_id)
            .options(selectinload(Application.stage_runs), selectinload(Application.assessments))
            .order_by(Application.id.desc())
        )
        if owner_id is not None:
            stmt = stmt.where(Application.owner_id == owner_id)
        if q and q.strip():
            pattern = f"%{q.strip()}%"
            stmt = stmt.where(Company.name.ilike(pattern) | Company.inn.ilike(pattern))
        return stmt

    def add_document(self, document: Document) -> None:
        self.session.add(document)

    async def delete_document(self, document: Document) -> None:
        await self.session.delete(document)

    async def delete_stage_run(self, run: StageRun) -> None:
        await self.session.delete(run)
