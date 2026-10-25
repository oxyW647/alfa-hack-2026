from typing import Any

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import Base


class BaseRepository[ModelT: Base]:
    model: type[ModelT]

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def add(self, entity: ModelT) -> None:
        self.session.add(entity)

    async def flush(self) -> None:
        await self.session.flush()

    async def delete(self, entity: ModelT) -> None:
        await self.session.delete(entity)

    async def get(self, entity_id: Any) -> ModelT | None:
        if entity_id is None:
            return None
        return await self.session.get(self.model, entity_id)

    async def list_by_ids(self, ids: set[int] | list[int]) -> list[ModelT]:
        if not ids:
            return []
        return await self.scalars(select(self.model).where(self.model.id.in_(ids)))

    async def scalars(self, stmt: Select) -> list[Any]:
        return list((await self.session.execute(stmt)).scalars().all())

    async def scalar_one_or_none(self, stmt: Select) -> Any:
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def first_scalar(self, stmt: Select) -> Any:
        return (await self.session.execute(stmt)).scalars().first()

    async def rows(self, stmt: Select) -> list[Any]:
        return list((await self.session.execute(stmt)).all())

    async def count(self, stmt: Select) -> int:
        return (
            await self.session.execute(select(func.count()).select_from(stmt.subquery()))
        ).scalar_one()

    async def paginate(self, stmt: Select, page: int, page_size: int) -> tuple[list[Any], int]:
        total = await self.count(stmt)
        items = await self.scalars(stmt.offset((page - 1) * page_size).limit(page_size))
        return items, total
