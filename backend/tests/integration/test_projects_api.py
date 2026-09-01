"""Integration tests for project API endpoints."""
import pytest
from httpx import AsyncClient


class TestCreateProject:
    async def test_create_project_success(self, client: AsyncClient):
        response = await client.post(
            "/api/v1/projects/",
            json={"name": "Test Project", "description": "A test project"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test Project"
        assert data["status"] == "planning"
        assert "id" in data
        assert "created_at" in data

    async def test_create_project_minimal(self, client: AsyncClient):
        """Only name is required."""
        response = await client.post(
            "/api/v1/projects/",
            json={"name": "Minimal Project"},
        )
        assert response.status_code == 201

    async def test_create_project_missing_name(self, client: AsyncClient):
        response = await client.post("/api/v1/projects/", json={})
        assert response.status_code == 422

    async def test_create_project_blank_name(self, client: AsyncClient):
        response = await client.post(
            "/api/v1/projects/",
            json={"name": "   "},
        )
        assert response.status_code == 422


class TestListProjects:
    async def test_list_empty(self, client: AsyncClient):
        response = await client.get("/api/v1/projects/")
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0

    async def test_list_with_projects(self, client: AsyncClient):
        # Create 3 projects
        for i in range(3):
            await client.post("/api/v1/projects/", json={"name": f"Project {i}"})

        response = await client.get("/api/v1/projects/")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 3
        assert len(data["items"]) == 3

    async def test_list_filter_by_status(self, client: AsyncClient):
        await client.post("/api/v1/projects/", json={"name": "P1", "status": "planning"})
        await client.post("/api/v1/projects/", json={"name": "P2", "status": "active"})

        response = await client.get("/api/v1/projects/?status=planning")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["name"] == "P1"

    async def test_list_search(self, client: AsyncClient):
        await client.post("/api/v1/projects/", json={"name": "Alpha Project"})
        await client.post("/api/v1/projects/", json={"name": "Beta Project"})

        response = await client.get("/api/v1/projects/?search=alpha")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1

    async def test_pagination(self, client: AsyncClient):
        for i in range(5):
            await client.post("/api/v1/projects/", json={"name": f"Project {i}"})

        response = await client.get("/api/v1/projects/?page=1&page_size=2")
        data = response.json()
        assert len(data["items"]) == 2
        assert data["total"] == 5
        assert data["has_next"] is True
        assert data["has_prev"] is False


class TestGetProject:
    async def test_get_existing_project(self, client: AsyncClient):
        create_resp = await client.post(
            "/api/v1/projects/", json={"name": "My Project"}
        )
        project_id = create_resp.json()["id"]

        response = await client.get(f"/api/v1/projects/{project_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == project_id
        assert data["total_stories"] == 0

    async def test_get_nonexistent_project(self, client: AsyncClient):
        response = await client.get("/api/v1/projects/nonexistent-id")
        assert response.status_code == 404
        data = response.json()
        assert data["error"] == "not_found"


class TestUpdateProject:
    async def test_update_name(self, client: AsyncClient):
        create_resp = await client.post(
            "/api/v1/projects/", json={"name": "Old Name"}
        )
        project_id = create_resp.json()["id"]

        response = await client.patch(
            f"/api/v1/projects/{project_id}",
            json={"name": "New Name"},
        )
        assert response.status_code == 200
        assert response.json()["name"] == "New Name"

    async def test_update_status(self, client: AsyncClient):
        create_resp = await client.post(
            "/api/v1/projects/", json={"name": "Project"}
        )
        project_id = create_resp.json()["id"]

        response = await client.patch(
            f"/api/v1/projects/{project_id}",
            json={"status": "active"},
        )
        assert response.status_code == 200
        assert response.json()["status"] == "active"

    async def test_cannot_activate_archived_project(self, client: AsyncClient):
        create_resp = await client.post(
            "/api/v1/projects/", json={"name": "Project", "status": "archived"}
        )
        project_id = create_resp.json()["id"]

        response = await client.patch(
            f"/api/v1/projects/{project_id}",
            json={"status": "active"},
        )
        assert response.status_code == 409


class TestDeleteProject:
    async def test_delete_planning_project(self, client: AsyncClient):
        create_resp = await client.post(
            "/api/v1/projects/", json={"name": "To Delete"}
        )
        project_id = create_resp.json()["id"]

        response = await client.delete(f"/api/v1/projects/{project_id}")
        assert response.status_code == 200

        # Verify deleted
        get_response = await client.get(f"/api/v1/projects/{project_id}")
        assert get_response.status_code == 404

    async def test_cannot_delete_active_project(self, client: AsyncClient):
        create_resp = await client.post(
            "/api/v1/projects/", json={"name": "Active Project", "status": "active"}
        )
        project_id = create_resp.json()["id"]

        response = await client.delete(f"/api/v1/projects/{project_id}")
        assert response.status_code == 409


class TestStoryHierarchy:
    """Test the nested story endpoints."""

    async def test_create_story_in_project(self, client: AsyncClient):
        proj = await client.post("/api/v1/projects/", json={"name": "Project"})
        pid = proj.json()["id"]

        response = await client.post(
            f"/api/v1/projects/{pid}/stories/",
            json={"title": "As a user, I want to login"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["project_id"] == pid
        assert data["status"] == "backlog"
        assert data["total_tasks"] == 0

    async def test_story_not_found_in_wrong_project(self, client: AsyncClient):
        proj1 = await client.post("/api/v1/projects/", json={"name": "P1"})
        proj2 = await client.post("/api/v1/projects/", json={"name": "P2"})
        pid1 = proj1.json()["id"]
        pid2 = proj2.json()["id"]

        story = await client.post(
            f"/api/v1/projects/{pid1}/stories/",
            json={"title": "Story in P1"},
        )
        sid = story.json()["id"]

        # Try to access story from wrong project
        response = await client.get(f"/api/v1/projects/{pid2}/stories/{sid}")
        assert response.status_code == 404

    async def test_invalid_story_point_transition(self, client: AsyncClient):
        proj = await client.post("/api/v1/projects/", json={"name": "Project"})
        pid = proj.json()["id"]

        story = await client.post(
            f"/api/v1/projects/{pid}/stories/",
            json={"title": "Test Story"},
        )
        sid = story.json()["id"]

        # Try invalid transition: backlog → done (should fail)
        response = await client.patch(
            f"/api/v1/projects/{pid}/stories/{sid}",
            json={"status": "done"},
        )
        assert response.status_code == 422