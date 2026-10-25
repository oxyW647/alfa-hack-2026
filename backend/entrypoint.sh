#!/usr/bin/env bash
set -e

echo "[entrypoint] Применяем миграции Alembic…"
alembic upgrade head

workers="${GUNICORN_WORKERS:-2}"
echo "[entrypoint] Старт gunicorn (workers=${workers})"
exec gunicorn app.main:app \
    -k uvicorn.workers.UvicornWorker \
    -w "${workers}" \
    -b 0.0.0.0:8000
