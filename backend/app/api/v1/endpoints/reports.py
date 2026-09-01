"""
Reports & async workflow trigger endpoints.

These endpoints:
1. Accept a trigger request
2. Create a job record
3. Dispatch to Celery
4. Return job_id immediately (202 Accepted)

Client then polls GET /jobs/{job_id} for status and result.
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.job import (
    JobResponse,
    TriggerReportRequest,
    TriggerStaleTaskScanRequest,
    TriggerStoryCheckRequest,
)
from app.services.job_service import JobService

router = APIRouter(prefix="/reports", tags=["Reports & Async Jobs"])


def get_job_service(db: AsyncSession = Depends(get_db)) -> JobService:
    return JobService(db)


@router.post(
    "/projects/{project_id}/generate",
    response_model=JobResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Generate project report (async)",
    description="""
    Triggers async generation of a comprehensive project report.

    Returns **202 Accepted** with a `job_id` immediately.
    Poll `GET /api/v1/jobs/{job_id}` to check progress.
    When status is `completed`, the report is in `result_data.report_markdown`.

    Report includes:
    - Project overview
    - Story and task breakdown
    - Completion rates and velocity
    - Blocked tasks list
    - Time estimates vs actuals
    """,
)
async def generate_project_report(
    project_id: str,
    request: TriggerReportRequest,
    service: JobService = Depends(get_job_service),
) -> JobResponse:
    return await service.trigger_project_report(
        project_id=project_id,
        triggered_by=request.triggered_by,
    )


@router.post(
    "/projects/{project_id}/stories/{story_id}/check-completion",
    response_model=JobResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Check story completion status (async)",
    description="""
    Asynchronously checks if a story is ready to be marked complete.

    Analyzes:
    - How many tasks are done vs total
    - Whether any tasks are blocked
    - Current story status

    Returns a `finding` and `suggestion` in the result.
    """,
)
async def check_story_completion(
    project_id: str,
    story_id: str,
    request: TriggerStoryCheckRequest,
    service: JobService = Depends(get_job_service),
) -> JobResponse:
    return await service.trigger_story_completion_check(
        project_id=project_id,
        story_id=story_id,
        triggered_by=request.triggered_by,
    )


@router.post(
    "/maintenance/scan-stale-tasks",
    response_model=JobResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Manually trigger stale task scan",
    description="""
    Manually triggers the stale task scanner.
    (Also runs automatically every hour via Celery Beat)

    A task is "stale" if it has been IN_PROGRESS for more than 48 hours.
    """,
)
async def trigger_stale_task_scan(
    request: TriggerStaleTaskScanRequest,
    service: JobService = Depends(get_job_service),
) -> JobResponse:
    return await service.trigger_stale_task_scan(
        triggered_by=request.triggered_by,
    )