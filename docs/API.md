# API

Базовый путь — `/api/v1`. Swagger UI: `/api/docs`, спецификация: [openapi.json](openapi.json),
готовые запросы: [requests/](requests).

## Конвенции

- Аутентификация: `Authorization: Bearer <jwt>`, токен выдаёт `POST /auth/login`.
  Фронтенд входит демо-аккаунтами сам, регистрации в системе нет.
- Ошибки: `{"detail": "текст на русском"}`; для `422` дополнительно `field` — путь поля
  (`company.inn`, `loan.term_months`).
- Чужая заявка — `404`. Недоступное действие роли — `403`. Нарушение порядка этапов или состояния
  заявки — `409`. Заявка с принятым предложением неизменяема, а после ручного решения
  сотрудника её изменять (правка, документы, сброс, запуск этапов) может только сотрудник.
- Деньги — числа в рублях. Списки: `{"items": [...], "total": N}`, параметры `page`, `size`, `q`.
- Ответы по заявке зависят от роли: клиент получает `ClientApplicationOut`, сотрудник —
  `EmployeeApplicationOut` (то же плюс оценки, проверки, документы, анкета, решение).

## Эндпоинты

| Метод и путь | Роль | Назначение |
|---|---|---|
| `GET /system/health` | — | Проверка живости |
| `POST /auth/login` | — | Вход, возвращает токен |
| `GET /auth/me` | любая | Текущий пользователь |
| `GET /demo/scenarios` | любая | Готовые наборы данных для заполнения анкеты |
| `GET /applications` | любая | Список: клиенту свои, сотруднику все |
| `POST /applications` | любая | Создать заявку |
| `GET /applications/{id}` | владелец, сотрудник | Заявка |
| `PATCH /applications/{id}` | владелец, сотрудник | Изменить сумму, срок, цель, анкету; сбрасывает все этапы |
| `PUT /applications/{id}/documents` | владелец, сотрудник | Загрузить документ, заменяет документ того же типа; сбрасывает этапы с получения документов. Клиент не может заменить документ из реестра (`409`). Загрузка клиентом даёт источник `upload` (заявка уйдёт на ручное рассмотрение), сотрудником — `employee` (доверенный) |
| `POST /applications/{id}/reset` | владелец, сотрудник | Удалить документы и результаты этапов |
| `GET /applications/{id}/pipeline` | владелец, сотрудник | Состояние конвейера |
| `POST /applications/{id}/stages/{stage}/run` | владелец, сотрудник | Выполнить этап |
| `POST /applications/{id}/run` | владелец, сотрудник | Выполнить все невыполненные этапы до первой ошибки |
| `POST /applications/{id}/offer/accept` | владелец, сотрудник | Принять предложение (`requested` или `alternative`) |
| `POST /applications/{id}/manual-review` | сотрудник | Ручное решение по заявке в `MANUAL_REVIEW` |

`stage`: `preliminary_scoring`, `documents`, `verification`, `final_scoring`, `decision`.

## Создание заявки

```json
{
  "company": {"inn": "781045678123", "name": "ИП Уют Кофе", "legal_form": "IP"},
  "loan": {"amount_rub": 1200000, "term_months": 24, "purpose": "Расширение кофейни"},
  "declared": {
    "age_months": 48,
    "financials": {
      "revenues_last_6_months_rub": [850000, 1200000, 1100000, 980000, 1100000, 770000],
      "average_monthly_operating_expenses_rub": 780000,
      "existing_monthly_debt_payments_rub": 50000,
      "outstanding_debt_before_new_loan_rub": 300000,
      "equity_rub": 4000000,
      "current_assets_rub": 1100000,
      "current_liabilities_rub": 1000000
    },
    "credit_history": "no_overdues_12m"
  }
}
```

Ставку клиент не передаёт — она берётся из продукта. Поля `declared` можно оставить
незаполненными: ошибка появится на этапе предварительной оценки с указанием поля.
`credit_history`: `no_overdues_12m`, `no_history`, `closed_overdue_under_30`,
`closed_overdue_30_89`, `current_or_90plus_overdue`.

## Документы

`PUT /applications/{id}/documents`, тело определяется полем `document_type`:

```json
{"document_type": "egrul_extract", "company_name": "ИП Уют Кофе", "inn": "781045678123",
 "ogrn": "315784701234567", "age_months": 48, "registration_active": true,
 "director": "Орлова Мария Сергеевна"}
```

```json
{"document_type": "bki_report", "credit_history_status": "no_overdues_12m",
 "active_loans_count": 2, "total_debt_rub": 1500000}
```

```json
{"document_type": "financial_report", "period": "last_6_months",
 "revenues_last_6_months_rub": [400000, 1800000, 300000, 1700000, 400000, 1100000],
 "average_monthly_operating_expenses_rub": 795000,
 "existing_monthly_debt_payments_rub": 50000,
 "outstanding_debt_before_new_loan_rub": 1500000,
 "equity_rub": 1800000, "current_assets_rub": 2200000, "current_liabilities_rub": 2000000}
```

Мок-реестр по ИНН: `7701234561` (low_risk), `8579875343` (medium_risk), `3405120002`
(high_risk), `781045678123` (cafe). Для других ИНН этап `documents` завершится ошибкой со
списком недостающих документов, их нужно загрузить вручную.

## Клиентский ответ

```json
{
  "id": 1,
  "status": "APPROVED_DEMO",
  "status_title": "Демонстрационное предложение готово",
  "status_text": "Проверьте условия и примите предложение. Это не выдача средств.",
  "actions": [{"code": "UPLOAD_DOCUMENT", "document_type": "bki_report", "field": null}],
  "offer": {"amount_rub": 1000000, "term_months": 12, "annual_rate_percent": 24,
            "monthly_payment_rub": 94559.6},
  "alternative_offer": null
}
```

Статусы клиента: `DRAFT`, `IN_PROGRESS`, `MORE_INFO_REQUIRED`, `UNDER_REVIEW`, `APPROVED_DEMO`,
`NOT_APPROVED_DEMO`, `OFFER_ACCEPTED_DEMO`. Действия (`actions`): `UPLOAD_DOCUMENT`
(`document_type`), `FILL_FIELD` (`field`), `REUPLOAD_DOCUMENTS`. `offer` заполнен только в
`APPROVED_DEMO`, `alternative_offer` — только в `NOT_APPROVED_DEMO`, когда у банка есть
встречные условия.

## Конвейер

`GET /applications/{id}/pipeline` и запуск этапов возвращают:

```json
{
  "application_id": 1,
  "status": "IN_PROGRESS",
  "next_stage": "documents",
  "stages": [
    {"stage": "preliminary_scoring", "title": "Предварительная оценка", "state": "done",
     "finished_at": "2026-10-25T05:43:06Z", "result": null}
  ]
}
```

`state`: `done`, `failed`, `available`, `locked`. `result` — JSON этапа, заполнен только для
сотрудника. Запуск этапа до выполнения предыдущего — `409 «Сначала выполните этап …»`.

Ошибка этапа не даёт HTTP-ошибку: этап получает `state: failed`, а в `result.error` лежат
`code` (`INSUFFICIENT_DATA`, `INVALID_INPUT`, `DOCUMENTS_MISSING`), `message` и `field`.
