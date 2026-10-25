from fastapi import APIRouter, Query, status

from app.api.deps import CurrentUser, EmployeeUser
from app.api.services import (
    AccessDep,
    ApplicationDep,
    ManualReviewDep,
    OfferDep,
    PipelineDep,
)
from app.core.enums import Stage
from app.schemas.application import (
    AcceptOfferIn,
    ApplicationCreate,
    ApplicationListItem,
    ApplicationUpdate,
    ClientApplicationOut,
    EmployeeApplicationOut,
    ManualReviewIn,
)
from app.schemas.base import Page
from app.schemas.document import DocumentIn
from app.schemas.pipeline import PipelineOut

router = APIRouter(prefix="/applications", tags=["applications"])

ApplicationOut = EmployeeApplicationOut | ClientApplicationOut


@router.get("", response_model=Page[ApplicationListItem])
async def list_applications(
    service: ApplicationDep,
    user: CurrentUser,
    q: str | None = Query(default=None, max_length=255),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=25, ge=1, le=100),
):
    return await service.list_page(user, q=q, page=page, size=size)


@router.post("", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
async def create_application(
    payload: ApplicationCreate, service: ApplicationDep, user: CurrentUser
):
    return service.present(await service.create(payload, user), user)


@router.get("/{application_id}", response_model=ApplicationOut)
async def get_application(
    application_id: int, service: ApplicationDep, access: AccessDep, user: CurrentUser
):
    return service.present(await access.application_for(application_id, user), user)


@router.patch("/{application_id}", response_model=ApplicationOut)
async def update_application(
    application_id: int,
    payload: ApplicationUpdate,
    service: ApplicationDep,
    access: AccessDep,
    user: CurrentUser,
):
    application = await access.application_for(application_id, user)
    return service.present(await service.update(application, payload), user)


@router.put("/{application_id}/documents", response_model=ApplicationOut)
async def put_document(
    application_id: int,
    payload: DocumentIn,
    service: ApplicationDep,
    access: AccessDep,
    user: CurrentUser,
):
    application = await access.application_for(application_id, user)
    return service.present(await service.put_document(application, payload, user), user)


@router.post("/{application_id}/reset", response_model=ApplicationOut)
async def reset_application(
    application_id: int, service: ApplicationDep, access: AccessDep, user: CurrentUser
):
    application = await access.application_for(application_id, user)
    return service.present(await service.reset(application), user)


@router.get("/{application_id}/pipeline", response_model=PipelineOut)
async def get_pipeline(
    application_id: int, pipeline: PipelineDep, access: AccessDep, user: CurrentUser
):
    application = await access.application_for(application_id, user)
    return pipeline.view(application, internal=user.is_employee)


@router.post("/{application_id}/stages/{stage}/run", response_model=PipelineOut)
async def run_stage(
    application_id: int,
    stage: Stage,
    pipeline: PipelineDep,
    access: AccessDep,
    user: CurrentUser,
):
    application = await access.application_for(application_id, user)
    await pipeline.run_stage(application, stage)
    return pipeline.view(application, internal=user.is_employee)


@router.post("/{application_id}/run", response_model=PipelineOut)
async def run_pipeline(
    application_id: int, pipeline: PipelineDep, access: AccessDep, user: CurrentUser
):
    application = await access.application_for(application_id, user)
    await pipeline.run_all(application)
    return pipeline.view(application, internal=user.is_employee)


@router.post("/{application_id}/offer/accept", response_model=ApplicationOut)
async def accept_offer(
    application_id: int,
    payload: AcceptOfferIn,
    service: ApplicationDep,
    offers: OfferDep,
    access: AccessDep,
    user: CurrentUser,
):
    application = await access.application_for(application_id, user)
    return service.present(await offers.accept(application, payload), user)


@router.post("/{application_id}/manual-review", response_model=EmployeeApplicationOut)
async def manual_review(
    application_id: int,
    payload: ManualReviewIn,
    service: ApplicationDep,
    reviews: ManualReviewDep,
    access: AccessDep,
    employee: EmployeeUser,
):
    application = await access.application_for(application_id, employee)
    return service.to_employee(await reviews.decide(application, payload, employee))
