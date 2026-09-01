"""
Task API endpoints.

Tasks are nested under stories which are under projects:
  POST   /projects/{project_id}/stories/{story_id}/tasks
  GET    /projects/{project_id}/stories/{story_id}/tasks
  GET    /projects/{project_id}/stories/{story_id}/tasks/{task_id}
  PATCH  /projects/{project_id}/stories/{story_id}/tasks/{task_id}
  DELETE /projects/{project_id}/stories/{story_id}/tasks/{task_id}
"""
from typing import Literal

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.task import TaskStatus
from app.schemas.common import PaginationParams, StatusMessage
from app.schemas.task import TaskCreate, TaskListResponse, TaskResponse, TaskUpdate
from app.services.task_service import TaskService

router = APIRouter(
    prefix="/projects/{project_id}/stories/{story_id}/tasks",
    tags=["Tasks"],
)


def get_task_service(db: AsyncSession = Depends(get_db)) -> TaskService:
    return TaskService(db)


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
    description="Returns paginated tasks for a user story.",
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
    description="Partial update. Status transitions are validated.",
)
async def update_task(
    project_id: str,
    story_id: str,
    task_id: str,
    data: TaskUpdate,
    service: TaskService = Depends(get_task_service),
) -> TaskResponse:
    return await service.update_task(project_id, story_id, task_id, data)


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