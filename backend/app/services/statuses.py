from typing import Any

from app.core.enums import ClientStatus, ManualDecision, Route, Stage, StageStatus
from app.core.policy import CLIENT_STATUS_BY_ROUTE

STAGE_TITLES = {
    Stage.PRELIMINARY_SCORING: "Предварительная оценка",
    Stage.DOCUMENTS: "Получение документов",
    Stage.VERIFICATION: "Проверка данных",
    Stage.FINAL_SCORING: "Итоговая оценка",
    Stage.DECISION: "Решение по заявке",
}

STATUS_MESSAGES = {
    ClientStatus.DRAFT: (
        "Заявка создана",
        "Запустите проверку заявки.",
    ),
    ClientStatus.IN_PROGRESS: (
        "Данные проверяются",
        "Мы обрабатываем заявку, итог появится в кабинете.",
    ),
    ClientStatus.MORE_INFO_REQUIRED: (
        "Нужны уточнения",
        "Дополните сведения или загрузите документы, затем повторите проверку.",
    ),
    ClientStatus.UNDER_REVIEW: (
        "Заявка на дополнительном рассмотрении",
        "Сотрудник банка рассматривает заявку, решение появится в кабинете.",
    ),
    ClientStatus.APPROVED_DEMO: (
        "Демонстрационное предложение готово",
        "Проверьте условия и примите предложение. Это не выдача средств.",
    ),
    ClientStatus.NOT_APPROVED_DEMO: (
        "Заявка не одобрена",
        "По вашей заявке нельзя предложить запрошенные условия.",
    ),
    ClientStatus.OFFER_ACCEPTED_DEMO: (
        "Предложение принято",
        "Демонстрационная заявка завершена, средства не выдаются.",
    ),
}


def resolve_client_status(application: Any) -> ClientStatus:
    if application.accepted_at is not None:
        return ClientStatus.OFFER_ACCEPTED_DEMO
    runs = application.stage_runs
    if not runs:
        return ClientStatus.DRAFT
    if any(run.status == StageStatus.FAILED for run in runs):
        return ClientStatus.MORE_INFO_REQUIRED
    decision = application.run_of(Stage.DECISION)
    if decision is None:
        return ClientStatus.IN_PROGRESS
    route = Route(decision.result["route"])
    if route == Route.MANUAL_REVIEW:
        if application.manual_decision == ManualDecision.APPROVE:
            return ClientStatus.APPROVED_DEMO
        if application.manual_decision == ManualDecision.DECLINE:
            return ClientStatus.NOT_APPROVED_DEMO
        return ClientStatus.UNDER_REVIEW
    return CLIENT_STATUS_BY_ROUTE[route]


def required_actions(application: Any) -> list[dict[str, Any]]:
    actions: list[dict[str, Any]] = []
    for run in application.stage_runs:
        if run.status != StageStatus.FAILED:
            continue
        error = run.result.get("error") or {}
        for document_type in run.result.get("missing_documents", []):
            actions.append(
                {"code": "UPLOAD_DOCUMENT", "document_type": document_type, "field": None}
            )
        if error.get("field"):
            actions.append(
                {"code": "FILL_FIELD", "document_type": None, "field": error["field"]}
            )
    decision = application.run_of(Stage.DECISION)
    if decision is not None and decision.result.get("route") == Route.REQUEST_DOCUMENTS:
        actions.append({"code": "REUPLOAD_DOCUMENTS", "document_type": None, "field": None})
    return actions
