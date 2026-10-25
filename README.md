# Умный кредитный кабинет предпринимателя

Прототип цифрового кредитного конвейера для малого и микробизнеса (кейс Альфа-Хакатона). Клиент
подаёт заявку и видит статус, банк обрабатывает её по этапам: предварительная оценка → документы →
проверки → итоговая оценка → решение (автоматическое или ручное) → предложение. Все данные
синтетические, внешние сервисы (ЕГРЮЛ/ЕГРИП, БКИ, антифрод) смоделированы локальными моками.

## Состав

| Каталог | Назначение |
|---|---|
| `backend/` | FastAPI + SQLAlchemy (async) + PostgreSQL + Alembic, менеджер зависимостей `uv` |
| `frontend/` | React + TypeScript + Vite + Tailwind: кабинет клиента, кабинет сотрудника, pipeline заявки |
| `nginx/` | Reverse proxy: статика фронтенда и `/api` на backend |
| `docs/` | Архитектура, API, OpenAPI, коллекции запросов, тест-сценарии и исходные материалы кейса |

Скоринг — готовая экспертная модель `docs/alfa/scoring.py` (v1.2.0), перенесённая в
`backend/app/services/scoring.py` без изменения алгоритма; правила маршрута — `credit_policy.py`
→ `backend/app/services/routing.py`. При переносе результат сверялся со всем датасетом из
`docs/alfa` (1500 валидных и 34 ошибочных кейса), расхождений не было.

## Требования

- Docker и Docker Compose — для запуска всего стека;
- для локальной разработки дополнительно: Python 3.12 и `uv`, Node.js 20+.

## Запуск (Docker)

```bash
cp .env.example .env
docker compose up --build
```

Приложение: <http://localhost:8080>. Swagger UI: <http://localhost:8080/api/docs>,
OpenAPI: <http://localhost:8080/api/openapi.json>.

Сервисы: `db` (postgres:16-alpine) → `backend` (миграции Alembic при старте, затем gunicorn) →
`frontend` (одноразовая сборка Vite в общий volume) → `nginx`.

### Демо-аккаунты

Создаются при старте backend, значения задаются в `.env`. Страницы входа во фронтенде нет:
он сам входит клиентом, роль переключается кнопками в шапке. Логин по API
(`POST /api/v1/auth/login`) нужен для Swagger и коллекции запросов.

| Роль | E-mail | Пароль |
|---|---|---|
| Клиент | `client@credit-demo.ru` | `client-demo-pass` |
| Сотрудник банка | `employee@credit-demo.ru` | `employee-demo-pass` |

## Пошаговая проверка основного сценария

1. Остаться в роли **клиента** → «Новая заявка» → на первом шаге карточка «Кофейня: оценка падает
   после проверки документов» → «Далее» до шага «Отправка» → «Создать заявку».
2. Нажать «Запустить всё»: конвейер проходит все пять этапов. Клиент видит статус «На
   рассмотрении» и не видит баллы и коэффициенты.
3. Переключить роль на **сотрудника банка** и открыть заявку: предварительная оценка 92
   (`REQUEST_DOCUMENTS`), итоговая 62 (`MANUAL_REVIEW`), расхождения анкеты с документами,
   результаты проверок, JSON каждого этапа.
4. «Одобрить» или «Отклонить» в блоке «Ручное решение».
5. Вернуться клиентом: статус «Одобрено (демо)» с условиями либо «Не одобрено (демо)» с
   альтернативным предложением банка — принять предложение.

Остальные сценарии (одобрение, отказ по неактивной регистрации, неизвестная компания и загрузка
документов, неполная анкета) — в [docs/TEST_SCENARIOS.md](docs/TEST_SCENARIOS.md).

Каждый этап можно запускать по отдельности кнопками на доске pipeline, этапы идут строго по
порядку; правка анкеты или загрузка документа сбрасывает затронутые этапы.

## Локальная разработка

```bash
cp .env.example .env
docker compose up -d db
```

Backend читает `../.env`, но подключаться к БД нужно на `localhost`, а пути к данным — локальные:

```bash
cd backend
uv sync
export DATABASE_URL=postgresql+asyncpg://credit:credit-demo-password@localhost:5432/credit_cabinet
export MOCK_DOCS_DIR=mock_docs
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000
```

```bash
cd frontend
npm install
npm run dev
```

### Проверки качества

```bash
cd backend
uv run ruff check .
cd ../frontend
npm run lint
npm run build
```

## Переменные окружения

Все переменные обязательны: у `Settings` нет значений по умолчанию, отсутствие любой роняет
старт backend.

| Переменная | Назначение |
|---|---|
| `HTTP_PORT` | Внешний порт nginx |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT` | Параметры PostgreSQL |
| `APP_NAME` | Имя приложения |
| `DATABASE_URL` | Строка подключения SQLAlchemy (`postgresql+asyncpg://…`) |
| `GUNICORN_WORKERS` | Число воркеров |
| `JWT_SECRET`, `JWT_ALGORITHM`, `ACCESS_TOKEN_TTL_MINUTES` | Параметры JWT |
| `MOCK_DOCS_DIR` | Каталог моков реестров (ЕГРЮЛ, БКИ, финотчётность) и демо-сценариев |
| `DEMO_CLIENT_EMAIL`, `DEMO_CLIENT_PASSWORD`, `DEMO_EMPLOYEE_EMAIL`, `DEMO_EMPLOYEE_PASSWORD` | Демо-аккаунты |

Данные демо-аккаунтов (`DEMO_*`) вшиваются в бандл фронтенда при сборке: он входит под ними
сам. Это допустимо только для демонстрации.

## Документация

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — архитектура, диаграмма состояний заявки, модель данных;
- [docs/API.md](docs/API.md) — описание API; [docs/openapi.json](docs/openapi.json) — спецификация OpenAPI;
- [docs/requests/](docs/requests) — коллекция Postman и файл `requests.http`;
- [docs/TEST_SCENARIOS.md](docs/TEST_SCENARIOS.md) — тестовые сценарии;
- [THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES) — сторонние компоненты, датасеты и смоделированные интеграции.

Версии зафиксированы: Python 3.12 (`backend/.python-version`), зависимости backend —
`backend/uv.lock`, frontend — `frontend/package-lock.json`, образы — теги в `docker-compose.yml`.
