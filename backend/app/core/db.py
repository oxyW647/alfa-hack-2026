from datetime import datetime
from enum import Enum
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy import Enum as SAEnum
from sqlalchemy import MetaData, func
from sqlalchemy.ext.asyncio import (
    AsyncAttrs,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.config import settings

NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(AsyncAttrs, DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)


def pg_enum(enum_cls: type[Enum], name: str) -> SAEnum:
    return SAEnum(enum_cls, name=name, values_callable=lambda cls: [m.value for m in cls])


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now()
    )


engine = create_async_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    future=True,
)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


_SESSION_KEY = "db"


class TransactionMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async with SessionLocal() as session:
            scope.setdefault("state", {})[_SESSION_KEY] = session
            settled = False

            async def send_wrapper(message: Message) -> None:
                nonlocal settled
                if message["type"] == "http.response.start" and not settled:
                    settled = True
                    if session.in_transaction():
                        if message["status"] < 400:
                            await session.commit()
                        else:
                            await session.rollback()
                await send(message)

            try:
                await self.app(scope, receive, send_wrapper)
            except Exception:
                await session.rollback()
                raise


def get_session(request: Request) -> AsyncSession:
    session = getattr(request.state, _SESSION_KEY, None)
    if session is None:
        raise RuntimeError("TransactionMiddleware не подключён — сессии запроса нет")
    return session


SessionDep = Annotated[AsyncSession, Depends(get_session)]
