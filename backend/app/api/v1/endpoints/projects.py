"""
Project API endpoints.

REST design:
  POST   /projects          → Create project
  GET    /projects          → List projects (paginated)
  GET    /projects/{id}     → Get single project
  PATCH  /projects/{id}     → Update project
  DELETE /projects/{id}     → Delete project

Why PATCH not PUT?
- PATCH = partial update (only send fields you want to change)
- PUT = full replacement (send entire resource)
- PATCH is almost always the right choice for update endpoints

Endpoints are intentionally thin:
- Extract params from request
- Call service
- Return response
- NO business logic here
"""
from typing import Literal

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.project import ProjectStatus
from app.schemas.common import PaginationParams, StatusMessage
from app.schemas.project import ProjectCreate, ProjectListResponse, ProjectResponse, ProjectUpdate
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects", tags=["Projects"])


# ─── Dependency ───────────────────────────────────────────────────────────────
def get_project_service(db: AsyncSession = Depends(get_db)) -> ProjectService:
    """
    Dependency that provides ProjectService.
    This is dependency injection - the service gets the db session injected.
    Easy to mock in tests: override get_project_service.
    """
    return ProjectService(db)


# ─── Endpoints ────────────────────────────────────────────────────────────────
@router.post(
    "/",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new project",
    description="Creates a new project. Initial status defaults to PLANNING.",
)
async def create_project(
    data: ProjectCreate,
    service: ProjectService = Depends(get_project_service),
) -> ProjectResponse:
    return await service.create_project(data)


@router.get(
    "/",
    response_model=dict,
    summary="List all projects",
    description="Returns a paginated list of projects with optional filtering and sorting.",
)
async def list_projects(
    # Pagination
    pagination: PaginationParams = Depends(),
    # Filters
    status: ProjectStatus | None = Query(
        default=None,
        description="Filter by project status",
    ),
    search: str | None = Query(
        default=None,
        description="Search projects by name (case-insensitive)",
        min_length=1,
        max_length=100,
    ),
    # Sorting
    sort_by: Literal["name", "status", "created_at", "updated_at"] = Query(
        default="created_at",
        description="Field to sort by",
    ),
    sort_order: Literal["asc", "desc"] = Query(
        default="desc",
        description="Sort direction",
    ),
    service: ProjectService = Depends(get_project_service),
) -> dict:
    return await service.list_projects(
        pagination=pagination,
        status=status,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get(
    "/{project_id}",
    response_model=ProjectResponse,
    summary="Get a project by ID",
    description="Returns full project details including story and task statistics.",
)
async def get_project(
    project_id: str,
    service: ProjectService = Depends(get_project_service),
) -> ProjectResponse:
    return await service.get_project(project_id)


@router.patch(
    "/{project_id}",
    response_model=ProjectResponse,
    summary="Update a project",
    description="Partially update a project. Only send the fields you want to change.",
)
async def update_project(
    project_id: str,
    data: ProjectUpdate,
    service: ProjectService = Depends(get_project_service),
) -> ProjectResponse:
    return await service.update_project(project_id, data)


@router.delete(
    "/{project_id}",
    response_model=StatusMessage,
    status_code=status.HTTP_200_OK,
    summary="Delete a project",
    description="Deletes a project and all its stories/tasks. Active projects cannot be deleted.",
)
async def delete_project(
    project_id: str,
    service: ProjectService = Depends(get_project_service),
) -> StatusMessage:
    await service.delete_project(project_id)
    return StatusMessage(message=f"Project '{project_id}' deleted successfully")