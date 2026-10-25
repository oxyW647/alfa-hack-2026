import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger("credit.errors")

GENERIC_INVALID = "Проверьте правильность заполнения полей"
GENERIC_FAILURE = "Что-то пошло не так, попробуйте позже"
CUSTOM_ERROR_PREFIX = "Value error, "

BY_TYPE: dict[str, str] = {
    "missing": "Заполните обязательное поле",
    "string_too_short": "Значение слишком короткое",
    "string_too_long": "Значение слишком длинное",
    "string_type": "Ожидается текст",
    "too_short": "Добавлено слишком мало элементов",
    "int_parsing": "Введите целое число",
    "int_type": "Введите целое число",
    "float_parsing": "Введите число",
    "float_type": "Введите число",
    "decimal_parsing": "Введите число",
    "decimal_type": "Введите число",
    "bool_parsing": "Ожидается «да» или «нет»",
    "bool_type": "Ожидается «да» или «нет»",
    "date_parsing": "Неверная дата",
    "date_type": "Неверная дата",
    "date_from_datetime_parsing": "Неверная дата",
    "datetime_parsing": "Неверная дата или время",
    "datetime_type": "Неверная дата или время",
    "enum": "Недопустимое значение",
    "literal_error": "Недопустимое значение",
    "json_invalid": "Тело запроса не является корректным JSON",
    "list_type": "Ожидается список",
    "dict_type": "Ожидается объект",
    "model_attributes_type": "Ожидается объект",
    "url_parsing": "Неверная ссылка",
    "uuid_parsing": "Неверный идентификатор",
}


def _limit(ctx: dict, *keys: str) -> str:
    for key in keys:
        value = ctx.get(key)
        if value is not None:
            return str(value)
    return ""


def _from_value_error(message: str) -> str:
    if message.startswith(CUSTOM_ERROR_PREFIX):
        return message[len(CUSTOM_ERROR_PREFIX) :]
    if "email" in message.lower():
        return "Укажите корректный e-mail"
    return GENERIC_INVALID


def message_for(error: dict) -> str:
    kind = error.get("type", "")
    ctx = error.get("ctx") or {}

    if kind == "value_error":
        return _from_value_error(error.get("msg", ""))
    if kind == "too_long":
        limit = _limit(ctx, "max_length")
        return f"Можно добавить не более {limit} элементов" if limit else GENERIC_INVALID
    if kind in ("greater_than_equal", "greater_than"):
        edge = _limit(ctx, "ge", "gt")
        return f"Значение не может быть меньше {edge}" if edge else GENERIC_INVALID
    if kind in ("less_than_equal", "less_than"):
        edge = _limit(ctx, "le", "lt")
        return f"Значение не может быть больше {edge}" if edge else GENERIC_INVALID
    return BY_TYPE.get(kind, GENERIC_INVALID)


def field_path(error: dict) -> str | None:
    parts = [str(part) for part in error.get("loc", ()) if part not in ("body", "query", "path")]
    return ".".join(parts) or None


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def _on_validation_error(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        errors = exc.errors()
        logger.info(
            "422 %s %s: %s",
            request.method,
            request.url.path,
            [(e.get("type"), ".".join(str(part) for part in e.get("loc", ()))) for e in errors],
        )
        return JSONResponse(
            status_code=422,
            content={
                "detail": message_for(errors[0]) if errors else GENERIC_INVALID,
                "field": field_path(errors[0]) if errors else None,
            },
        )

    @app.exception_handler(Exception)
    async def _on_unhandled_error(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("500 %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": GENERIC_FAILURE},
        )
