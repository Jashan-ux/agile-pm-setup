"""
Project Pydantic schemas.

We have SEPARATE schemas for:
- Create  (what client sends to create)
- Update  (what client sends to update - all fields optional)
- Response (what we send back to client)
- Summary  (lightweight version for list views)

Why separate schemas?
- Create: required fields enforced
- Update: all fields optional (PATCH semantics)
- Response: may include computed fields, excludes sensitive data
- Summary: nested in other responses, don't need full detail

This pattern is called "schema per operation" and is production standard.
"""
from datetime import datetime

from pydantic import Field, field_validator

from app.models.project import ProjectStatus
from app.schemas.common import BaseSchema


# ─── Create Schema ────────────────────────────────────────────────────────────
class ProjectCreate(BaseSchema):
    """
    Schema for creating a new project.
    Only include fields the client should set.
    ID, timestamps are set by the server.
    """
    name: str = Field(
        ...,  # ... means required
        min_length=1,
        max_length=200,
        description="Project name",
        examples=["E-Commerce Platform Redesign"],
    )
    description: str | None = Field(
        default=None,
        max_length=5000,
        description="Detailed project description",
        examples=["Redesign the checkout flow to improve conversion rates"],
    )
    status: ProjectStatus = Field(
        default=ProjectStatus.PLANNING,
        description="Initial project status",
    )
    owner_name: str | None = Field(
        default=None,
        max_length=100,
        description="Project owner's name",
        examples=["Alice Johnson"],
    )

    @field_validator("name", mode="before")
    @classmethod
    def name_must_not_be_blank(cls, v: str) -> str:
        if isinstance(v, str) and not v.strip():
            raise ValueError("Project name cannot be blank")
        return v.strip() if isinstance(v, str) else v


# ─── Update Schema ────────────────────────────────────────────────────────────
class ProjectUpdate(BaseSchema):
    """
    Schema for updating an existing project.
    ALL fields are optional - supports partial updates (PATCH).

    Design: We use `None` as "not provided" sentinel.
    If a field is None, we don't update it.
    If a field is explicitly set to a value, we update it.
    """
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
    )
    description: str | None = Field(default=None, max_length=5000)
    status: ProjectStatus | None = Field(default=None)
    owner_name: str | None = Field(default=None, max_length=100)

    @field_validator("name", mode="before")
    @classmethod
    def name_must_not_be_blank(cls, v: str | None) -> str | None:
        if v is not None and isinstance(v, str) and not v.strip():
            raise ValueError("Project name cannot be blank")
        return v.strip() if isinstance(v, str) else v


# ─── Response Schemas ─────────────────────────────────────────────────────────
class ProjectSummary(BaseSchema):
    """
    Lightweight project representation.
    Used when embedding project info inside other responses.
    Does NOT include the full stories list (would be huge).
    """
    id: str
    name: str
    status: ProjectStatus
    owner_name: str | None
    created_at: datetime
    updated_at: datetime


class ProjectResponse(BaseSchema):
    """
    Full project response with computed stats.
    Returned when viewing a single project.
    """
    id: str
    name: str
    description: str | None
    status: ProjectStatus
    owner_name: str | None
    created_at: datetime
    updated_at: datetime

    # Computed stats - calculated in the service layer
    total_stories: int = Field(default=0, description="Total number of user stories")
    total_tasks: int = Field(default=0, description="Total number of tasks across all stories")
    completed_stories: int = Field(default=0, description="Number of completed stories")
    completed_tasks: int = Field(default=0, description="Number of completed tasks")


class ProjectListResponse(BaseSchema):
    """Project summary for list views - includes story count."""
    id: str
    name: str
    description: str | None
    status: ProjectStatus
    owner_name: str | None
    created_at: datetime
    updated_at: datetime
    story_count: int = Field(default=0)