"""
Task model - the leaf node of the hierarchy.

Tasks are the smallest unit of work. They live inside User Stories.
Tasks should be completable in hours, not days.

Status lifecycle: TODO → IN_PROGRESS → BLOCKED → IN_REVIEW → DONE
"""
import enum

from sqlalchemy import Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class TaskStatus(str, enum.Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    BLOCKED = "blocked"       # Waiting on something external
    IN_REVIEW = "in_review"
    DONE = "done"


class TaskPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Task(Base, UUIDMixin, TimestampMixin):
    """
    Represents a concrete task within a user story.
    Tasks are actionable, specific, and estimable in hours.
    """
    __tablename__ = "tasks"

    # ─── Core Fields ─────────────────────────────────────────────────────────
    title: Mapped[str] = mapped_column(
        String(300),
        nullable=False,
        index=True,
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    status: Mapped[TaskStatus] = mapped_column(
        Enum(TaskStatus),
        default=TaskStatus.TODO,
        nullable=False,
        index=True,
    )
    priority: Mapped[TaskPriority] = mapped_column(
        Enum(TaskPriority),
        default=TaskPriority.MEDIUM,
        nullable=False,
    )
    estimated_hours: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        comment="Estimated time in hours",
    )
    actual_hours: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        comment="Actual time spent in hours",
    )
    assignee_name: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    # ─── Foreign Key ─────────────────────────────────────────────────────────
    story_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("user_stories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ─── Relationships ────────────────────────────────────────────────────────
    story: Mapped["UserStory"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "UserStory",
        back_populates="tasks",
    )

    def __repr__(self) -> str:
        return f"<Task id={self.id!r} title={self.title!r} status={self.status!r}>"