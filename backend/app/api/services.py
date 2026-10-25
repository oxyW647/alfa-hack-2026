from typing import Annotated

from fastapi import Depends

from app.services.access import AccessService
from app.services.applications import ApplicationService
from app.services.auth import AuthService
from app.services.offers import ManualReviewService, OfferService
from app.services.pipeline import PipelineService

AuthDep = Annotated[AuthService, Depends(AuthService)]
AccessDep = Annotated[AccessService, Depends(AccessService)]
ApplicationDep = Annotated[ApplicationService, Depends(ApplicationService)]
PipelineDep = Annotated[PipelineService, Depends(PipelineService)]
OfferDep = Annotated[OfferService, Depends(OfferService)]
ManualReviewDep = Annotated[ManualReviewService, Depends(ManualReviewService)]
