"""Unit tests for schema validation."""
import pytest
from pydantic import ValidationError

from app.schemas.project import ProjectCreate
from app.schemas.task import TaskCreate
from app.schemas.user_story import UserStoryCreate


class TestProjectCreate:
    def test_valid_project(self):
        p = ProjectCreate(name="My Project")
        assert p.name == "My Project"

    def test_name_required(self):
        with pytest.raises(ValidationError):
            ProjectCreate()

    def test_name_stripped(self):
        p = ProjectCreate(name="  My Project  ")
        assert p.name == "My Project"

    def test_name_cannot_be_blank(self):
        with pytest.raises(ValidationError, match="cannot be blank"):
            ProjectCreate(name="   ")


class TestUserStoryCreate:
    def test_valid_fibonacci_points(self):
        for points in [1, 2, 3, 5, 8, 13, 21]:
            s = UserStoryCreate(title="Test", story_points=points)
            assert s.story_points == points

    def test_invalid_story_points(self):
        with pytest.raises(ValidationError, match="Fibonacci"):
            UserStoryCreate(title="Test", story_points=4)

    def test_none_story_points_allowed(self):
        s = UserStoryCreate(title="Test", story_points=None)
        assert s.story_points is None


class TestTaskCreate:
    def test_valid_task(self):
        t = TaskCreate(title="Do something", estimated_hours=4)
        assert t.estimated_hours == 4

    def test_negative_hours_rejected(self):
        with pytest.raises(ValidationError):
            TaskCreate(title="Test", estimated_hours=-1)