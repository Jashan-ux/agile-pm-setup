"""
UserStory service - business logic for user stories.

Key business rules:
- Stories must belong to an existing project
- Story status transitions are validated
- Completing all tasks doesn't auto-complete story (human decision)
"""
import logging
from typing import Any

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import BusinessRuleError, NotFoundError
from app.models.project import Project
from app.models.task import Task, TaskStatus
from app.models.user_story import StoryStatus, UserStory
from app.schemas.common import PaginationParams
from app.schemas.user_story import (
    TaskSummaryInStory,
    UserStoryCreate,
    UserStoryResponse,
    UserStorySummary,
    UserStoryUpdate,
)

logger = logging.getLogger(__name__)

# Valid status transitions
# Key = current status, Value = allowed next statuses
VALID_STORY_TRANSITIONS: dict[StoryStatus, set[StoryStatus]] = {
    StoryStatus.BACKLOG: {StoryStatus.READY, StoryStatus.CANCELLED},
    StoryStatus.READY: {StoryStatus.BACKLOG, StoryStatus.IN_PROGRESS, StoryStatus.CANCELLED},
    StoryStatus.IN_PROGRESS: {StoryStatus.IN_REVIEW, StoryStatus.BACKLOG, StoryStatus.CANCELLED},
    StoryStatus.IN_REVIEW: {StoryStatus.IN_PROGRESS, StoryStatus.DONE, StoryStatus.CANCELLED},
    StoryStatus.DONE: {StoryStatus.IN_PROGRESS},  # Can reopen
    StoryStatus.CANCELLED: {StoryStatus.BACKLOG},  # Can restore
}


class StoryService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ─── Create ───────────────────────────────────────────────────────────────
    async def create_story(
        self, project_id: str, data: UserStoryCreate
    ) -> UserStoryResponse:
        """
        Create a user story within a project.
        Validates project exists before creating.
        """
        # Verify project exists
        await self._get_project_or_404(project_id)

        story = UserStory(
            project_id=project_id,
            title=data.title,
            description=data.description,
            acceptance_criteria=data.acceptance_criteria,
            status=data.status,
            priority=data.priority,
            story_points=data.story_points,
            assignee_name=data.assignee_name,
        )
        self.db.add(story)
        await self.db.flush()
        await self.db.refresh(story, ["tasks"])

        logger.info(f"Created story id={story.id} in project id={project_id}")
        return self._to_response(story)

    # ─── Read ─────────────────────────────────────────────────────────────────
    async def get_story(self, project_id: str, story_id: str) -> UserStoryResponse:
        """Get a single story by ID, scoped to a project."""
        story = await self._get_story_or_404(project_id, story_id)
        return self._to_response(story)

    async def list_stories(
        self,
        project_id: str,
        pagination: PaginationParams,
        status: StoryStatus | None = None,
        assignee_name: str | None = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> dict[str, Any]:
        """List stories for a project with filtering and pagination."""
        # Verify project exists
        await self._get_project_or_404(project_id)

        # Base query scoped to project
        query = select(UserStory).where(UserStory.project_id == project_id)

        # Apply filters
        if status is not None:
            query = query.where(UserStory.status == status)
        if assignee_name:
            query = query.where(UserStory.assignee_name.ilike(f"%{assignee_name}%"))

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.db.execute(count_query)).scalar_one()

        # Apply sorting
        sortable = {
            "title": UserStory.title,
            "status": UserStory.status,
            "priority": UserStory.priority,
            "story_points": UserStory.story_points,
            "created_at": UserStory.created_at,
            "updated_at": UserStory.updated_at,
        }
        col = sortable.get(sort_by, UserStory.created_at)
        query = query.order_by(col.asc() if sort_order == "asc" else col.desc())

        # Paginate
        query = query.offset(pagination.offset).limit(pagination.limit)
        query = query.options(selectinload(UserStory.tasks))

        result = await self.db.execute(query)
        stories = result.scalars().all()

        items = [
            UserStorySummary(
                id=s.id,
                title=s.title,
                status=s.status,
                priority=s.priority,
                story_points=s.story_points,
                assignee_name=s.assignee_name,
                created_at=s.created_at,
                updated_at=s.updated_at,
                task_count=len(s.tasks or []),
            )
            for s in stories
        ]

        pages = (total + pagination.page_size - 1) // pagination.page_size if pagination.page_size > 0 else 0
        return {
            "items": items,
            "total": total,
            "page": pagination.page,
            "page_size": pagination.page_size,
            "pages": pages,
            "has_next": pagination.page < pages,
            "has_prev": pagination.page > 1,
        }

    # ─── Update ───────────────────────────────────────────────────────────────
    async def update_story(
        self, project_id: str, story_id: str, data: UserStoryUpdate
    ) -> UserStoryResponse:
        """
        Update a story with status transition validation.

        Business rule: Status transitions must follow allowed paths.
        e.g., Can't go from BACKLOG directly to DONE.
        """
        story = await self._get_story_or_404(project_id, story_id)

        # Validate status transition if status is being changed
        if data.status is not None and data.status != story.status:
            allowed = VALID_STORY_TRANSITIONS.get(story.status, set())
            if data.status not in allowed:
                raise BusinessRuleError(
                    message=f"Invalid status transition: {story.status} → {data.status}",
                    details={
                        "current_status": story.status,
                        "requested_status": data.status,
                        "allowed_transitions": [s.value for s in allowed],
                    },
                )

        # Apply partial update
        update_data = data.model_dump(exclude_none=True)
        for field, value in update_data.items():
            setattr(story, field, value)

        await self.db.flush()
        await self.db.refresh(story, ["tasks"])

        logger.info(f"Updated story id={story_id}")
        return self._to_response(story)

    # ─── Delete ───────────────────────────────────────────────────────────────
    async def delete_story(self, project_id: str, story_id: str) -> None:
        """
        Delete a story and all its tasks.

        Business rule: Cannot delete IN_PROGRESS stories.
        """
        story = await self._get_story_or_404(project_id, story_id)

        if story.status == StoryStatus.IN_PROGRESS:
            raise BusinessRuleError(
                message="Cannot delete a story that is IN_PROGRESS",
                details={
                    "story_id": story_id,
                    "status": story.status,
                    "hint": "Move story back to BACKLOG before deleting",
                },
            )

        await self.db.delete(story)
        await self.db.flush()
        logger.info(f"Deleted story id={story_id}")

    # ─── Private Helpers ──────────────────────────────────────────────────────
    async def _get_project_or_404(self, project_id: str) -> Project:
        result = await self.db.execute(
            select(Project).where(Project.id == project_id)
        )
        project = result.scalar_one_or_none()
        if project is None:
            raise NotFoundError(
                message=f"Project with id '{project_id}' not found",
                details={"project_id": project_id},
            )
        return project

    async def _get_story_or_404(self, project_id: str, story_id: str) -> UserStory:
        """Fetch story scoped to project - prevents accessing other project's stories."""
        result = await self.db.execute(
            select(UserStory)
            .where(
                UserStory.id == story_id,
                UserStory.project_id == project_id,  # Scope check!
            )
            .options(selectinload(UserStory.tasks))
        )
        story = result.scalar_one_or_none()
        if story is None:
            raise NotFoundError(
                message=f"Story with id '{story_id}' not found in project '{project_id}'",
                details={"story_id": story_id, "project_id": project_id},
            )
        return story

    def _to_response(self, story: UserStory) -> UserStoryResponse:
        tasks = story.tasks or []
        completed_tasks = sum(1 for t in tasks if t.status == TaskStatus.DONE)
        total_estimated = sum(t.estimated_hours or 0 for t in tasks)
        total_actual = sum(t.actual_hours or 0 for t in tasks)

        return UserStoryResponse(
            id=story.id,
            project_id=story.project_id,
            title=story.title,
            description=story.description,
            acceptance_criteria=story.acceptance_criteria,
            status=story.status,
            priority=story.priority,
            story_points=story.story_points,
            assignee_name=story.assignee_name,
            created_at=story.created_at,
            updated_at=story.updated_at,
            total_tasks=len(tasks),
            completed_tasks=completed_tasks,
            total_estimated_hours=total_estimated,
            total_actual_hours=total_actual,
            tasks=[
                TaskSummaryInStory(
                    id=t.id,
                    title=t.title,
                    status=t.status,
                    assignee_name=t.assignee_name,
                    estimated_hours=t.estimated_hours,
                )
                for t in tasks
            ],
        )