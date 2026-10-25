# CLAUDE.md

Умный кредитный кабинет предпринимателя (Альфа-Хак 2026): `backend/` (FastAPI + SQLAlchemy async +
PostgreSQL), `frontend/` (React + TypeScript + Vite), `nginx/`, `docs/`. Архитектура и API —
`docs/ARCHITECTURE.md`, `docs/API.md`; запуск — `README.md`. Исходные материалы кейса лежат в
`docs/alfa/` и не правятся.

Стек и структура повторяют `iosource/media-flow` (референс команды): слои, конвенции и формат
ошибок оттуда.

## UI copy — ОЧЕНЬ ВАЖНО

Никогда не добавляй в UI пояснительные подписи («капитан очевидность»): текст под
таблицами, формами и кнопками, который пересказывает очевидное. Статус виден через бейджи и
доступность кнопок. Исключение — тексты, которые продукт обязан отдавать клиенту через API
(`status_title`, `status_text`), они приходят от backend.

## Комментарии — ОЧЕНЬ ВАЖНО

В проекте нет комментариев и докстрингов, добавлять их запрещено — ни в Python, ни в
TypeScript, ни в конфигах. Код объясняет себя именами, остальное идёт в `.md`. Исключение —
машинные директивы (`# noqa`, `// eslint-disable-next-line`, `@ts-*`, шебанг) и шапки миграций
Alembic.

`from __future__ import annotations` не используется: опережающие ссылки — кавычками
(`Mapped[list["Document"]]`).

## `__init__.py` — ОЧЕНЬ ВАЖНО

В `backend/` нет `__init__.py` и создавать их запрещено (namespace-пакеты PEP 420). Импорт всегда
из модуля: `from app.models.document import Document`. Единственное место с агрегированным
импортом моделей — `alembic/env.py`; добавил модель — допиши её туда и проверь
`uv run alembic check` («No new upgrade operations detected»).

## Команды

```bash
cd backend
uv sync
uv run alembic upgrade head
uv run alembic revision --autogenerate -m "message"   # затем ruff format на файле миграции
uv run uvicorn app.main:app --reload --port 8000
uv run ruff check .                                    # должно быть "All checks passed!"

cd frontend
npm run dev
npm run build        # tsc -b && vite build
npm run lint         # eslint . --max-warnings 0
```

Локально backend читает `../.env`, но `DATABASE_URL` и `MOCK_DOCS_DIR`
нужно переопределить переменными окружения (см. README). `Settings` не имеет дефолтов.

## Архитектура backend

Слои: **роут → сервис → репозиторий → модель**, каждый знает только про соседа снизу.

- `api/routes/*.py` — вход, вызов сервиса, схема ответа; без `select()` и бизнес-правил.
  Сервисы собираются в `api/services.py` как `Annotated[X, Depends(X)]`.
- `services/` — один файл на предметную область, без подпапок. Класс — там, где есть сессия или
  зависимости (`BaseService`), чистая функция — для предметной логики без I/O (`scoring.py`,
  `routing.py`, `verification.py`, `alternative_offer.py`, `statuses.py`).
- `repositories/` — единственное место SQLAlchemy-запросов, наследники `BaseRepository`.
- `core/policy.py` — продукт и пороги кредитной политики; числа не размазываются по сервисам.
- Формат ошибок — `{"detail": "текст на русском"}`, для 422 добавляется `field`. Чужая заявка —
  всегда `404`.
- Деньги — `Decimal` в БД, числа в JSON. Статусы клиента не хранятся, а вычисляются
  (`services/statuses.py`).

`services/scoring.py` и `services/routing.py` — перенос модели из `docs/alfa/`. Алгоритм не
менять; эталон поведения — датасет `docs/alfa/synthetic_borrowers.json` (поле `expected`).

## Frontend

`features/<область>/` — экраны, `components/` — примитивы, `lib/` — api (axios, `/api/v1`),
auth (zustand + persist), session (автовход демо-клиентом и переключение роли), типы, запросы (react-query). Автотестов в проекте нет — backend и UI
проверяются интерактивно через Playwright MCP.
