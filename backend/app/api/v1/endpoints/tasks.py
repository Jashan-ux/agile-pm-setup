"""
Task API endpoints - updated with async trigger.
"""
from typing import Literal

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.task import TaskStatus
from app.schemas.common import PaginationParams, StatusMessage
from app.schemas.task import TaskCreate, TaskListResponse, TaskResponse, TaskUpdate
from app.services.job_service import JobService
from app.services.task_service import TaskService

router = APIRouter(
    prefix="/projects/{project_id}/stories/{story_id}/tasks",
    tags=["Tasks"],
)


def get_task_service(db: AsyncSession = Depends(get_db)) -> TaskService:
    return TaskService(db)


def get_job_service(db: AsyncSession = Depends(get_db)) -> JobService:
    return JobService(db)


@router.post(
    "/",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a task",
)
async def create_task(
    project_id: str,
    story_id: str,
    data: TaskCreate,
    service: TaskService = Depends(get_task_service),
) -> TaskResponse:
    return await service.create_task(project_id, story_id, data)


@router.get(
    "/",
    response_model=dict,
    summary="List tasks",
)
async def list_tasks(
    project_id: str,
    story_id: str,
    pagination: PaginationParams = Depends(),
    status: TaskStatus | None = Query(default=None),
    assignee_name: str | None = Query(default=None, max_length=100),
    sort_by: Literal["title", "status", "priority", "estimated_hours", "created_at"] = Query(
        default="created_at"
    ),
    sort_order: Literal["asc", "desc"] = Query(default="desc"),
    service: TaskService = Depends(get_task_service),
) -> dict:
    return await service.list_tasks(
        project_id=project_id,
        story_id=story_id,
        pagination=pagination,
        status=status,
        assignee_name=assignee_name,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get(
    "/{task_id}",
    response_model=TaskResponse,
    summary="Get a task",
)
async def get_task(
    project_id: str,
    story_id: str,
    task_id: str,
    service: TaskService = Depends(get_task_service),
) -> TaskResponse:
    return await service.get_task(project_id, story_id, task_id)


@router.patch(
    "/{task_id}",
    response_model=TaskResponse,
    summary="Update a task",
    description="""
    Partial update with status transition validation.

    **Auto-trigger:** When a task is marked as DONE,
    a background job is automatically dispatched to check
    if the parent story is ready for completion.
    Check `GET /api/v1/jobs/` for the triggered job.
    """,
)
async def update_task(
    project_id: str,
    story_id: str,
    task_id: str,
    data: TaskUpdate,
    task_service: TaskService = Depends(get_task_service),
    job_service: JobService = Depends(get_job_service),
) -> TaskResponse:
    # Get current task state before update
    current_task = await task_service.get_task(project_id, story_id, task_id)
    previous_status = current_task.status

    # Perform the update
    updated_task = await task_service.update_task(project_id, story_id, task_id, data)

    # Auto-trigger story completion check when task is marked DONE
    if (
        data.status == TaskStatus.DONE
        and previous_status != TaskStatus.DONE
    ):
        try:
            await job_service.trigger_story_completion_check(
                project_id=project_id,
                story_id=story_id,
                triggered_by="system:task_completion",
            )
        except Exception as e:
            # Don't fail the task update if the background job fails to dispatch
            import logging
            logging.getLogger(__name__).warning(
                f"Failed to dispatch story completion check: {e}"
            )

    return updated_task


@router.delete(
    "/{task_id}",
    response_model=StatusMessage,
    summary="Delete a task",
)
async def delete_task(
    project_id: str,
    story_id: str,
    task_id: str,
    service: TaskService = Depends(get_task_service),
) -> StatusMessage:
    await service.delete_task(project_id, story_id, task_id)
    return StatusMessage(message=f"Task '{task_id}' deleted successfully")