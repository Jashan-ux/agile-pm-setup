"""
Project model - the top of the hierarchy.

A Project is a container for User Stories.
Status lifecycle: PLANNING → ACTIVE → ON_HOLD → COMPLETED / ARCHIVED

Design note: Using Python Enum for status means:
- Type safety (can't set invalid status)
- Easy to add new statuses later
- Readable in code and database
"""
import enum

from sqlalchemy import Enum, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class ProjectStatus(str, enum.Enum):
    """
    Project lifecycle statuses.
    Inheriting from str makes it JSON-serializable automatically.
    """
    PLANNING = "planning"
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class Project(Base, UUIDMixin, TimestampMixin):
    """
    Represents a project - the top-level container.

    Relationships:
    - One Project has many UserStories (one-to-many)
    - cascade="all, delete-orphan" means if a project is deleted,
      all its stories are also deleted. This maintains referential integrity.
    """
    __tablename__ = "projects"

    name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        index=True,  # We'll frequently search/sort by name
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    status: Mapped[ProjectStatus] = mapped_column(
        Enum(ProjectStatus),
        default=ProjectStatus.PLANNING,
        nullable=False,
        index=True,  # We'll frequently filter by status
    )
    owner_name: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        comment="Project owner's name (simplified - no auth in Sprint 1)",
    )

    # ─── Relationships ────────────────────────────────────────────────────────
    # back_populates creates a bidirectional relationship
    # lazy="selectin" means related objects are loaded automatically
    # using a SELECT IN query (efficient for small collections)
    stories: Mapped[list["UserStory"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "UserStory",
        back_populates="project",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Project id={self.id!r} name={self.name!r} status={self.status!r}>"