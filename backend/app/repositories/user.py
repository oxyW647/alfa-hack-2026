from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    model = User

    async def by_email(self, email: str) -> User | None:
        return await self.scalar_one_or_none(select(User).where(User.email == email.lower()))

    async def insert_if_absent(self, **values) -> None:
        await self.session.execute(
            insert(User).values(**values).on_conflict_do_nothing(index_elements=["email"])
        )
