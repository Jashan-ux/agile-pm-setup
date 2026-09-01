"""
Jobs API - monitor background job status.

Design: Poll-based status checking.
Client submits a job → gets job_id → polls GET /jobs/{id} until done.

Alternative (not implemented here): WebSockets for push notifications.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.job import JobStatus, JobType
from app.schemas.common import PaginationParams
from app.schemas.job import JobResponse
from app.services.job_service import JobService

router = APIRouter(prefix="/jobs", tags=["Background Jobs"])


def get_job_service(db: AsyncSession = Depends(get_db)) -> JobService:
    return JobService(db)


@router.get(
    "/",
    response_model=dict,
    summary="List all background jobs",
    description="Returns paginated list of all background jobs with optional filtering.",
)
async def list_jobs(
    pagination: PaginationParams = Depends(),
    job_type: JobType | None = Query(default=None, description="Filter by job type"),
    status: JobStatus | None = Query(default=None, description="Filter by status"),
    project_id: str | None = Query(default=None, description="Filter by project"),
    service: JobService = Depends(get_job_service),
) -> dict:
    return await service.list_jobs(
        pagination=pagination,
        job_type=job_type,
        status=status,
        project_id=project_id,
    )


@router.get(
    "/{job_id}",
    response_model=JobResponse,
    summary="Get job status",
    description="""
    Poll this endpoint to check job status.

    Status lifecycle:
    - `pending` → Job is queued, worker hasn't picked it up yet
    - `processing` → Worker is actively running the task
    - `completed` → Done! Check `result_data` for output
    - `failed` → Permanently failed. Check `error_message`
    - `retrying` → Failed but will retry automatically
    """,
)
async def get_job(
    job_id: str,
    service: JobService = Depends(get_job_service),
) -> JobResponse:
    return await service.get_job(job_id)