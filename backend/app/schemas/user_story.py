"""
UserStory Pydantic schemas.

Notable: story_points uses a validator to enforce Fibonacci sequence.
This is a business rule enforced at the schema level.
"""
from datetime import datetime

from pydantic import Field, field_validator

from app.models.user_story import StoryPriority, StoryStatus
from app.schemas.common import BaseSchema

# Valid Fibonacci story points
VALID_STORY_POINTS = {1, 2, 3, 5, 8, 13, 21}


# ─── Create Schema ────────────────────────────────────────────────────────────
class UserStoryCreate(BaseSchema):
    title: str = Field(
        ...,
        min_length=1,
        max_length=300,
        description="Story title",
        examples=["As a user, I want to reset my password via email"],
    )
    description: str | None = Field(
        default=None,
        max_length=5000,
        description="Full story description",
    )
    acceptance_criteria: str | None = Field(
        default=None,
        max_length=5000,
        description="Definition of Done - bullet points of acceptance criteria",
        examples=["- User receives email within 2 minutes\n- Link expires after 24 hours"],
    )
    status: StoryStatus = Field(default=StoryStatus.BACKLOG)
    priority: StoryPriority = Field(default=StoryPriority.MEDIUM)
    story_points: int | None = Field(
        default=None,
        description="Fibonacci story points: 1, 2, 3, 5, 8, 13, 21",
    )
    assignee_name: str | None = Field(
        default=None,
        max_length=100,
    )

    @field_validator("story_points")
    @classmethod
    def validate_story_points(cls, v: int | None) -> int | None:
        """Enforce Fibonacci sequence for story points."""
        if v is not None and v not in VALID_STORY_POINTS:
            raise ValueError(
                f"Story points must be a Fibonacci number: {sorted(VALID_STORY_POINTS)}"
            )
        return v

    @field_validator("title", mode="before")
    @classmethod
    def title_must_not_be_blank(cls, v: str) -> str:
        if isinstance(v, str) and not v.strip():
            raise ValueError("Title cannot be blank")
        return v.strip() if isinstance(v, str) else v


# ─── Update Schema ────────────────────────────────────────────────────────────
class UserStoryUpdate(BaseSchema):
    title: str | None = Field(default=None, min_length=1, max_length=300)
    description: str | None = Field(default=None, max_length=5000)
    acceptance_criteria: str | None = Field(default=None, max_length=5000)
    status: StoryStatus | None = Field(default=None)
    priority: StoryPriority | None = Field(default=None)
    story_points: int | None = Field(default=None)
    assignee_name: str | None = Field(default=None, max_length=100)

    @field_validator("story_points")
    @classmethod
    def validate_story_points(cls, v: int | None) -> int | None:
        if v is not None and v not in VALID_STORY_POINTS:
            raise ValueError(
                f"Story points must be a Fibonacci number: {sorted(VALID_STORY_POINTS)}"
            )
        return v


# ─── Response Schemas ─────────────────────────────────────────────────────────
class TaskSummaryInStory(BaseSchema):
    """Minimal task info embedded inside story responses."""
    id: str
    title: str
    status: str
    assignee_name: str | None
    estimated_hours: int | None


class UserStorySummary(BaseSchema):
    """Lightweight story - used in project list views."""
    id: str
    title: str
    status: StoryStatus
    priority: StoryPriority
    story_points: int | None
    assignee_name: str | None
    created_at: datetime
    updated_at: datetime
    task_count: int = Field(default=0)


class UserStoryResponse(BaseSchema):
    """Full story response including embedded tasks."""
    id: str
    project_id: str
    title: str
    description: str | None
    acceptance_criteria: str | None
    status: StoryStatus
    priority: StoryPriority
    story_points: int | None
    assignee_name: str | None
    created_at: datetime
    updated_at: datetime

    # Computed stats
    total_tasks: int = Field(default=0)
    completed_tasks: int = Field(default=0)
    total_estimated_hours: int = Field(default=0)
    total_actual_hours: int = Field(default=0)

    # Embedded tasks
    tasks: list[TaskSummaryInStory] = Field(default_factory=list)