"""
User Story API endpoints.

Stories are nested under projects:
  POST   /projects/{project_id}/stories
  GET    /projects/{project_id}/stories
  GET    /projects/{project_id}/stories/{story_id}
  PATCH  /projects/{project_id}/stories/{story_id}
  DELETE /projects/{project_id}/stories/{story_id}

Nested URLs make the hierarchy explicit.
project_id in the URL enforces scoping at the routing level.
"""
from typing import Literal

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user_story import StoryStatus
from app.schemas.common import PaginationParams, StatusMessage
from app.schemas.user_story import (
    UserStoryCreate,
    UserStoryResponse,
    UserStoryUpdate,
)
from app.services.story_service import StoryService

router = APIRouter(
    prefix="/projects/{project_id}/stories",
    tags=["User Stories"],
)


def get_story_service(db: AsyncSession = Depends(get_db)) -> StoryService:
    return StoryService(db)


@router.post(
    "/",
    response_model=UserStoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a user story",
)
async def create_story(
    project_id: str,
    data: UserStoryCreate,
    service: StoryService = Depends(get_story_service),
) -> UserStoryResponse:
    return await service.create_story(project_id, data)


@router.get(
    "/",
    response_model=dict,
    summary="List user stories",
    description="Returns paginated user stories for a project.",
)
async def list_stories(
    project_id: str,
    pagination: PaginationParams = Depends(),
    status: StoryStatus | None = Query(default=None),
    assignee_name: str | None = Query(default=None, max_length=100),
    sort_by: Literal["title", "status", "priority", "story_points", "created_at", "updated_at"] = Query(
        default="created_at"
    ),
    sort_order: Literal["asc", "desc"] = Query(default="desc"),
    service: StoryService = Depends(get_story_service),
) -> dict:
    return await service.list_stories(
        project_id=project_id,
        pagination=pagination,
        status=status,
        assignee_name=assignee_name,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get(
    "/{story_id}",
    response_model=UserStoryResponse,
    summary="Get a user story",
)
async def get_story(
    project_id: str,
    story_id: str,
    service: StoryService = Depends(get_story_service),
) -> UserStoryResponse:
    return await service.get_story(project_id, story_id)


@router.patch(
    "/{story_id}",
    response_model=UserStoryResponse,
    summary="Update a user story",
    description="Partial update. Status transitions are validated.",
)
async def update_story(
    project_id: str,
    story_id: str,
    data: UserStoryUpdate,
    service: StoryService = Depends(get_story_service),
) -> UserStoryResponse:
    return await service.update_story(project_id, story_id, data)


@router.delete(
    "/{story_id}",
    response_model=StatusMessage,
    summary="Delete a user story",
    description="Deletes a story and all its tasks. IN_PROGRESS stories cannot be deleted.",
)
async def delete_story(
    project_id: str,
    story_id: str,
    service: StoryService = Depends(get_story_service),
) -> StatusMessage:
    await service.delete_story(project_id, story_id)
    return StatusMessage(message=f"Story '{story_id}' deleted successfully")