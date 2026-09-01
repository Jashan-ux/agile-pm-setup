"""
Task Pydantic schemas.

Tasks are the leaf nodes - simplest schemas.
estimated_hours and actual_hours must be positive integers.
"""
from datetime import datetime

from pydantic import Field, field_validator

from app.models.task import TaskPriority, TaskStatus
from app.schemas.common import BaseSchema


# ─── Create Schema ────────────────────────────────────────────────────────────
class TaskCreate(BaseSchema):
    title: str = Field(
        ...,
        min_length=1,
        max_length=300,
        description="Task title - should be actionable",
        examples=["Implement password reset email template"],
    )
    description: str | None = Field(
        default=None,
        max_length=5000,
    )
    status: TaskStatus = Field(default=TaskStatus.TODO)
    priority: TaskPriority = Field(default=TaskPriority.MEDIUM)
    estimated_hours: int | None = Field(
        default=None,
        ge=1,
        le=200,
        description="Estimated hours (1-200)",
    )
    actual_hours: int | None = Field(
        default=None,
        ge=0,
        le=999,
        description="Actual hours spent",
    )
    assignee_name: str | None = Field(
        default=None,
        max_length=100,
    )

    @field_validator("title")
    @classmethod
    def title_must_not_be_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Title cannot be blank")
        return v.strip()


# ─── Update Schema ────────────────────────────────────────────────────────────
class TaskUpdate(BaseSchema):
    title: str | None = Field(default=None, min_length=1, max_length=300)
    description: str | None = Field(default=None, max_length=5000)
    status: TaskStatus | None = Field(default=None)
    priority: TaskPriority | None = Field(default=None)
    estimated_hours: int | None = Field(default=None, ge=1, le=200)
    actual_hours: int | None = Field(default=None, ge=0, le=999)
    assignee_name: str | None = Field(default=None, max_length=100)


# ─── Response Schemas ─────────────────────────────────────────────────────────
class TaskResponse(BaseSchema):
    """Full task response."""
    id: str
    story_id: str
    title: str
    description: str | None
    status: TaskStatus
    priority: TaskPriority
    estimated_hours: int | None
    actual_hours: int | None
    assignee_name: str | None
    created_at: datetime
    updated_at: datetime


class TaskListResponse(BaseSchema):
    """Task in list view."""
    id: str
    story_id: str
    title: str
    status: TaskStatus
    priority: TaskPriority
    estimated_hours: int | None
    actual_hours: int | None
    assignee_name: str | None
    created_at: datetime
    updated_at: datetime