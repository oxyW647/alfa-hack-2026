import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.errors import register_error_handlers
from app.api.router import api_router
from app.core.config import settings
from app.core.db import TransactionMiddleware
from app.services.seed import seed_demo_users

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await seed_demo_users()
    yield


app = FastAPI(
    title="Умный кредитный кабинет предпринимателя",
    version="0.1.0",
    description=(
        "Цифровой кредитный конвейер для малого и микробизнеса: заявка, предварительная оценка, "
        "документы, проверки, итоговая оценка и решение. Все данные синтетические."
    ),
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(TransactionMiddleware)

register_error_handlers(app)
app.include_router(api_router)


@app.get("/", tags=["root"])
async def root() -> dict:
    return {"service": settings.app_name, "version": "0.1.0"}
