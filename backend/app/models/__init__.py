"""
Import all models here so SQLAlchemy can discover them.
This is important for Alembic migrations to detect all models.
"""
from app.models.base import Base
from app.models.project import Project, ProjectStatus
from app.models.task import Task, TaskPriority, TaskStatus
from app.models.user_story import StoryPriority, StoryStatus, UserStory

__all__ = [
    "Base",
    "Project",
    "ProjectStatus",
    "UserStory",
    "StoryStatus",
    "StoryPriority",
    "Task",
    "TaskStatus",
    "TaskPriority",
]