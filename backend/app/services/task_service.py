"""
Task service - business logic for tasks.

Tasks are the leaf nodes. Most straightforward service.
Key rules:
- Tasks must belong to a story that belongs to the right project
- Status transitions are validated
- Actual hours can be logged incrementally
"""
import logging
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BusinessRuleError, NotFoundError
from app.models.project import Project
from app.models.task import Task, TaskStatus
from app.models.user_story import UserStory
from app.schemas.common import PaginationParams
from app.schemas.task import (
    TaskCreate,
    TaskListResponse,
    TaskResponse,
    TaskUpdate,
)

logger = logging.getLogger(__name__)

# Valid task status transitions
VALID_TASK_TRANSITIONS: dict[TaskStatus, set[TaskStatus]] = {
    TaskStatus.TODO: {TaskStatus.IN_PROGRESS, TaskStatus.DONE},
    TaskStatus.IN_PROGRESS: {TaskStatus.BLOCKED, TaskStatus.IN_REVIEW, TaskStatus.TODO},
    TaskStatus.BLOCKED: {TaskStatus.IN_PROGRESS, TaskStatus.TODO},
    TaskStatus.IN_REVIEW: {TaskStatus.IN_PROGRESS, TaskStatus.DONE},
    TaskStatus.DONE: {TaskStatus.IN_PROGRESS, TaskStatus.TODO},  # Can reopen
}


class TaskService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ─── Create ───────────────────────────────────────────────────────────────
    async def create_task(
        self,
        project_id: str,
        story_id: str,
        data: TaskCreate,
    ) -> TaskResponse:
        """Create a task, verifying the full hierarchy exists."""
        # Validate full hierarchy: project → story
        await self._validate_hierarchy(project_id, story_id)

        task = Task(
            story_id=story_id,
            title=data.title,
            description=data.description,
            status=data.status,
            priority=data.priority,
            estimated_hours=data.estimated_hours,
            actual_hours=data.actual_hours,
            assignee_name=data.assignee_name,
        )
        self.db.add(task)
        await self.db.flush()
        await self.db.refresh(task)

        logger.info(f"Created task id={task.id} in story id={story_id}")
        return self._to_response(task)

    # ─── Read ─────────────────────────────────────────────────────────────────
    async def get_task(
        self, project_id: str, story_id: str, task_id: str
    ) -> TaskResponse:
        task = await self._get_task_or_404(project_id, story_id, task_id)
        return self._to_response(task)

    async def list_tasks(
        self,
        project_id: str,
        story_id: str,
        pagination: PaginationParams,
        status: TaskStatus | None = None,
        assignee_name: str | None = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> dict[str, Any]:
        """List tasks for a story."""
        await self._validate_hierarchy(project_id, story_id)

        query = select(Task).where(Task.story_id == story_id)

        if status is not None:
            query = query.where(Task.status == status)
        if assignee_name:
            query = query.where(Task.assignee_name.ilike(f"%{assignee_name}%"))

        # Count
        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.db.execute(count_query)).scalar_one()

        # Sort
        sortable = {
            "title": Task.title,
            "status": Task.status,
            "priority": Task.priority,
            "estimated_hours": Task.estimated_hours,
            "created_at": Task.created_at,
        }
        col = sortable.get(sort_by, Task.created_at)
        query = query.order_by(col.asc() if sort_order == "asc" else col.desc())

        # Paginate
        query = query.offset(pagination.offset).limit(pagination.limit)
        result = await self.db.execute(query)
        tasks = result.scalars().all()

        items = [self._to_list_response(t) for t in tasks]

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
    async def update_task(
        self,
        project_id: str,
        story_id: str,
        task_id: str,
        data: TaskUpdate,
    ) -> TaskResponse:
        """Update task with status transition validation."""
        task = await self._get_task_or_404(project_id, story_id, task_id)

        # Validate status transition
        if data.status is not None and data.status != task.status:
            allowed = VALID_TASK_TRANSITIONS.get(task.status, set())
            if data.status not in allowed:
                raise BusinessRuleError(
                    message=f"Invalid status transition: {task.status} → {data.status}",
                    details={
                        "current_status": task.status,
                        "requested_status": data.status,
                        "allowed_transitions": [s.value for s in allowed],
                    },
                )

        update_data = data.model_dump(exclude_none=True)
        for field, value in update_data.items():
            setattr(task, field, value)

        await self.db.flush()
        await self.db.refresh(task)

        logger.info(f"Updated task id={task_id}")
        return self._to_response(task)

    # ─── Delete ───────────────────────────────────────────────────────────────
    async def delete_task(
        self, project_id: str, story_id: str, task_id: str
    ) -> None:
        """Delete a task."""
        task = await self._get_task_or_404(project_id, story_id, task_id)
        await self.db.delete(task)
        await self.db.flush()
        logger.info(f"Deleted task id={task_id}")

    # ─── Private Helpers ──────────────────────────────────────────────────────
    async def _validate_hierarchy(
        self, project_id: str, story_id: str
    ) -> UserStory:
        """
        Validate that story belongs to project.
        This is critical for security - prevents accessing other project's data.
        """
        result = await self.db.execute(
            select(UserStory).where(
                UserStory.id == story_id,
                UserStory.project_id == project_id,
            )
        )
        story = result.scalar_one_or_none()
        if story is None:
            # Check if story exists at all to give better error message
            story_check = await self.db.execute(
                select(UserStory).where(UserStory.id == story_id)
            )
            if story_check.scalar_one_or_none() is None:
                raise NotFoundError(
                    message=f"Story with id '{story_id}' not found",
                    details={"story_id": story_id},
                )
            raise NotFoundError(
                message=f"Story '{story_id}' does not belong to project '{project_id}'",
                details={"story_id": story_id, "project_id": project_id},
            )
        return story

    async def _get_task_or_404(
        self, project_id: str, story_id: str, task_id: str
    ) -> Task:
        """
        Fetch task with full hierarchy validation.
        Uses a JOIN to verify the complete chain in one query.
        """
        result = await self.db.execute(
            select(Task)
            .join(UserStory, Task.story_id == UserStory.id)
            .where(
                Task.id == task_id,
                Task.story_id == story_id,
                UserStory.project_id == project_id,
            )
        )
        task = result.scalar_one_or_none()
        if task is None:
            raise NotFoundError(
                message=f"Task with id '{task_id}' not found",
                details={
                    "task_id": task_id,
                    "story_id": story_id,
                    "project_id": project_id,
                },
            )
        return task

    def _to_response(self, task: Task) -> TaskResponse:
        return TaskResponse(
            id=task.id,
            story_id=task.story_id,
            title=task.title,
            description=task.description,
            status=task.status,
            priority=task.priority,
            estimated_hours=task.estimated_hours,
            actual_hours=task.actual_hours,
            assignee_name=task.assignee_name,
            created_at=task.created_at,
            updated_at=task.updated_at,
        )

    def _to_list_response(self, task: Task) -> TaskListResponse:
        return TaskListResponse(
            id=task.id,
            story_id=task.story_id,
            title=task.title,
            status=task.status,
            priority=task.priority,
            estimated_hours=task.estimated_hours,
            actual_hours=task.actual_hours,
            assignee_name=task.assignee_name,
            created_at=task.created_at,
            updated_at=task.updated_at,
        )