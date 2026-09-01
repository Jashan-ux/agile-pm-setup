"""
UserStory model - the middle of the hierarchy.

A User Story lives inside a Project and contains Tasks.
Follows the standard agile format: "As a [user], I want [feature], so that [benefit]"

Priority levels follow standard agile conventions (MoSCoW-inspired):
CRITICAL > HIGH > MEDIUM > LOW

Status lifecycle: BACKLOG → READY → IN_PROGRESS → IN_REVIEW → DONE → CANCELLED
"""
import enum

from sqlalchemy import Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class StoryStatus(str, enum.Enum):
    BACKLOG = "backlog"
    READY = "ready"           # Groomed and ready to be picked up
    IN_PROGRESS = "in_progress"
    IN_REVIEW = "in_review"   # Code review / QA
    DONE = "done"
    CANCELLED = "cancelled"


class StoryPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class UserStory(Base, UUIDMixin, TimestampMixin):
    """
    Represents an agile user story within a project.

    Story points use Fibonacci sequence (1,2,3,5,8,13,21) conventionally.
    We store as integer and validate in the schema layer.
    """
    __tablename__ = "user_stories"

    # ─── Core Fields ─────────────────────────────────────────────────────────
    title: Mapped[str] = mapped_column(
        String(300),
        nullable=False,
        index=True,
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Full user story description: As a... I want... So that...",
    )
    acceptance_criteria: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Definition of Done for this story",
    )
    status: Mapped[StoryStatus] = mapped_column(
        Enum(StoryStatus),
        default=StoryStatus.BACKLOG,
        nullable=False,
        index=True,
    )
    priority: Mapped[StoryPriority] = mapped_column(
        Enum(StoryPriority),
        default=StoryPriority.MEDIUM,
        nullable=False,
        index=True,
    )
    story_points: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        comment="Fibonacci: 1,2,3,5,8,13,21",
    )
    assignee_name: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    # ─── Foreign Key ─────────────────────────────────────────────────────────
    # ondelete="CASCADE" tells the DB to delete stories if project is deleted
    # This is a DB-level constraint (belt AND suspenders with the ORM cascade)
    project_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ─── Relationships ────────────────────────────────────────────────────────
    project: Mapped["Project"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Project",
        back_populates="stories",
    )
    tasks: Mapped[list["Task"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Task",
        back_populates="story",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<UserStory id={self.id!r} title={self.title!r} status={self.status!r}>"