"""
Project service - all business logic for projects.

Why a service layer?
- Endpoints are thin (just HTTP plumbing)
- Services are testable without HTTP
- Complex business logic is isolated
- Easy to reuse across different endpoints

Pattern: All methods are async, take a db session, return domain objects or raise exceptions.
"""
import logging
from typing import Any

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import ConflictError, NotFoundError
from app.models.project import Project, ProjectStatus
from app.models.task import Task, TaskStatus
from app.models.user_story import StoryStatus, UserStory
from app.schemas.common import PaginationParams
from app.schemas.project import (
    ProjectCreate,
    ProjectListResponse,
    ProjectResponse,
    ProjectUpdate,
)

logger = logging.getLogger(__name__)


class ProjectService:
    """
    Service class for project operations.
    Takes db session as constructor parameter (dependency injection).
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ─── Create ───────────────────────────────────────────────────────────────
    async def create_project(self, data: ProjectCreate) -> ProjectResponse:
        """
        Create a new project.

        Business rules:
        - Project names should be unique (warn but don't block - teams may have similar names)
        - Initial status defaults to PLANNING
        """
        logger.info(f"Creating project: {data.name}")

        # Check for duplicate name - soft warning, not hard block
        existing = await self.db.execute(
            select(Project).where(Project.name == data.name)
        )
        if existing.scalar_one_or_none():
            logger.warning(f"Project with name '{data.name}' already exists")
            # Note: We allow duplicates but warn. A stricter system would raise ConflictError.

        project = Project(
            name=data.name,
            description=data.description,
            status=data.status,
            owner_name=data.owner_name,
        )
        self.db.add(project)
        await self.db.flush()  # flush to get the generated ID without committing
        await self.db.refresh(project)

        logger.info(f"Created project id={project.id}")
        return self._to_response(project)

    # ─── Read ─────────────────────────────────────────────────────────────────
    async def get_project(self, project_id: str) -> ProjectResponse:
        """
        Get a single project by ID with full stats.
        Raises NotFoundError if not found.
        """
        project = await self._get_project_or_404(project_id)
        return self._to_response(project)

    async def list_projects(
        self,
        pagination: PaginationParams,
        status: ProjectStatus | None = None,
        search: str | None = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> dict[str, Any]:
        """
        List projects with filtering, searching, and pagination.

        Filtering: by status
        Searching: by name (case-insensitive contains)
        Sorting: by any field, asc or desc
        Pagination: page + page_size
        """
        # Build base query
        query = select(Project)

        # Apply filters
        query = self._apply_filters(query, status=status, search=search)

        # Count total (before pagination)
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar_one()

        # Apply sorting
        query = self._apply_sorting(query, sort_by, sort_order)

        # Apply pagination
        query = query.offset(pagination.offset).limit(pagination.limit)

        # Execute
        result = await self.db.execute(query)
        projects = result.scalars().all()

        # Build list responses with story counts
        items = []
        for project in projects:
            # Count stories for this project
            story_count_result = await self.db.execute(
                select(func.count(UserStory.id)).where(
                    UserStory.project_id == project.id
                )
            )
            story_count = story_count_result.scalar_one()

            items.append(
                ProjectListResponse(
                    id=project.id,
                    name=project.name,
                    description=project.description,
                    status=project.status,
                    owner_name=project.owner_name,
                    created_at=project.created_at,
                    updated_at=project.updated_at,
                    story_count=story_count,
                )
            )

        return {
            "items": items,
            "total": total,
            "page": pagination.page,
            "page_size": pagination.page_size,
            "pages": (total + pagination.page_size - 1) // pagination.page_size if pagination.page_size > 0 else 0,
            "has_next": pagination.page < ((total + pagination.page_size - 1) // pagination.page_size),
            "has_prev": pagination.page > 1,
        }

    # ─── Update ───────────────────────────────────────────────────────────────
    async def update_project(
        self, project_id: str, data: ProjectUpdate
    ) -> ProjectResponse:
        """
        Partially update a project (PATCH semantics).

        Only updates fields that are explicitly provided (not None).
        This is the correct PATCH behavior.

        Business rules:
        - Cannot transition from ARCHIVED back to ACTIVE directly
        """
        project = await self._get_project_or_404(project_id)

        # Business rule: archived projects can only be unarchived to planning
        if (
            project.status == ProjectStatus.ARCHIVED
            and data.status is not None
            and data.status not in (ProjectStatus.ARCHIVED, ProjectStatus.PLANNING)
        ):
            raise ConflictError(
                message="Archived projects can only be moved back to PLANNING status",
                details={
                    "current_status": project.status,
                    "requested_status": data.status,
                },
            )

        # Apply updates - only update non-None fields
        update_data = data.model_dump(exclude_none=True)
        for field, value in update_data.items():
            setattr(project, field, value)

        await self.db.flush()
        await self.db.refresh(project)

        logger.info(f"Updated project id={project_id}, fields={list(update_data.keys())}")
        return self._to_response(project)

    # ─── Delete ───────────────────────────────────────────────────────────────
    async def delete_project(self, project_id: str) -> None:
        """
        Delete a project and all its stories/tasks (cascade).

        Business rules:
        - ACTIVE projects cannot be deleted directly (must archive first)
        - This protects against accidental deletion
        """
        project = await self._get_project_or_404(project_id)

        if project.status == ProjectStatus.ACTIVE:
            raise ConflictError(
                message="Cannot delete an ACTIVE project. Archive it first.",
                details={
                    "project_id": project_id,
                    "status": project.status,
                    "hint": "Set status to 'archived' before deleting",
                },
            )

        await self.db.delete(project)
        await self.db.flush()
        logger.info(f"Deleted project id={project_id}")

    # ─── Private Helpers ──────────────────────────────────────────────────────
    async def _get_project_or_404(self, project_id: str) -> Project:
        """Fetch project by ID or raise NotFoundError."""
        result = await self.db.execute(
            select(Project)
            .where(Project.id == project_id)
            .options(selectinload(Project.stories).selectinload(UserStory.tasks))
        )
        project = result.scalar_one_or_none()
        if project is None:
            raise NotFoundError(
                message=f"Project with id '{project_id}' not found",
                details={"project_id": project_id},
            )
        return project

    def _apply_filters(
        self,
        query: Select,
        status: ProjectStatus | None = None,
        search: str | None = None,
    ) -> Select:
        """Apply WHERE clauses to query."""
        if status is not None:
            query = query.where(Project.status == status)
        if search:
            # Case-insensitive search on name
            query = query.where(Project.name.ilike(f"%{search}%"))
        return query

    def _apply_sorting(
        self, query: Select, sort_by: str, sort_order: str
    ) -> Select:
        """Apply ORDER BY clause to query."""
        # Whitelist of sortable columns (prevents SQL injection)
        sortable_columns = {
            "name": Project.name,
            "status": Project.status,
            "created_at": Project.created_at,
            "updated_at": Project.updated_at,
        }
        column = sortable_columns.get(sort_by, Project.created_at)
        if sort_order.lower() == "asc":
            return query.order_by(column.asc())
        return query.order_by(column.desc())

    def _to_response(self, project: Project) -> ProjectResponse:
        """
        Convert ORM Project to ProjectResponse schema.
        Computes stats from loaded relationships.
        """
        stories = project.stories or []
        all_tasks = [task for story in stories for task in (story.tasks or [])]

        completed_stories = sum(
            1 for s in stories if s.status == StoryStatus.DONE
        )
        completed_tasks = sum(
            1 for t in all_tasks if t.status == TaskStatus.DONE
        )

        return ProjectResponse(
            id=project.id,
            name=project.name,
            description=project.description,
            status=project.status,
            owner_name=project.owner_name,
            created_at=project.created_at,
            updated_at=project.updated_at,
            total_stories=len(stories),
            total_tasks=len(all_tasks),
            completed_stories=completed_stories,
            completed_tasks=completed_tasks,
        )