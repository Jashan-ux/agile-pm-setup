"""
Integration tests for background job workflows.

Testing strategy for async:
- We mock Celery task dispatch (don't need a real worker)
- We test the API contract: job created, correct response shape
- We test job status polling
- We test error handling when Celery is unavailable
"""
import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, MagicMock, patch


class TestJobsAPI:
    async def test_list_jobs_empty(self, client: AsyncClient):
        response = await client.get("/api/v1/jobs/")
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0

    async def test_get_nonexistent_job(self, client: AsyncClient):
        response = await client.get("/api/v1/jobs/nonexistent-id")
        assert response.status_code == 404


class TestReportGeneration:
    async def test_trigger_report_project_not_found(self, client: AsyncClient):
        """Triggering report for nonexistent project should 404."""
        response = await client.post(
            "/api/v1/reports/projects/nonexistent-id/generate",
            json={"triggered_by": "test"},
        )
        assert response.status_code == 404

    async def test_trigger_report_creates_job(self, client: AsyncClient):
        """Triggering report should create a job and return 202."""
        # Create a project first
        proj_resp = await client.post(
            "/api/v1/projects/",
            json={"name": "Report Test Project"},
        )
        project_id = proj_resp.json()["id"]

        # Mock Celery task dispatch
        with patch(
            "app.workers.tasks.report_tasks.generate_project_report.apply_async"
        ) as mock_task:
            mock_task.return_value = MagicMock(id="celery-task-123")

            response = await client.post(
                f"/api/v1/reports/projects/{project_id}/generate",
                json={"triggered_by": "test-user"},
            )

        assert response.status_code == 202
        data = response.json()
        assert data["status"] == "pending"
        assert data["job_type"] == "project_report"
        assert data["project_id"] == project_id
        assert data["triggered_by"] == "test-user"
        assert "id" in data

        job_id = data["id"]

        # Verify job is queryable
        job_resp = await client.get(f"/api/v1/jobs/{job_id}")
        assert job_resp.status_code == 200
        assert job_resp.json()["id"] == job_id

    async def test_trigger_report_lists_in_jobs(self, client: AsyncClient):
        """Triggered jobs should appear in jobs list."""
        proj_resp = await client.post(
            "/api/v1/projects/",
            json={"name": "Project X"},
        )
        project_id = proj_resp.json()["id"]

        with patch(
            "app.workers.tasks.report_tasks.generate_project_report.apply_async"
        ) as mock_task:
            mock_task.return_value = MagicMock(id="celery-id")
            await client.post(
                f"/api/v1/reports/projects/{project_id}/generate",
                json={},
            )

        jobs_resp = await client.get("/api/v1/jobs/?job_type=project_report")
        assert jobs_resp.status_code == 200
        assert jobs_resp.json()["total"] == 1


class TestStoryCompletionCheck:
    async def test_check_story_completion(self, client: AsyncClient):
        """Should trigger async story check and return job."""
        proj = await client.post("/api/v1/projects/", json={"name": "P"})
        pid = proj.json()["id"]

        story = await client.post(
            f"/api/v1/projects/{pid}/stories/",
            json={"title": "Test Story"},
        )
        sid = story.json()["id"]

        with patch(
            "app.workers.tasks.notification_tasks.check_story_completion.apply_async"
        ) as mock_task:
            mock_task.return_value = MagicMock(id="celery-id-2")

            response = await client.post(
                f"/api/v1/reports/projects/{pid}/stories/{sid}/check-completion",
                json={},
            )

        assert response.status_code == 202
        data = response.json()
        assert data["job_type"] == "story_completion_check"
        assert data["story_id"] == sid


class TestAutoTrigger:
    async def test_marking_task_done_triggers_story_check(self, client: AsyncClient):
        """When task marked DONE, story completion check auto-dispatched."""
        # Setup hierarchy
        proj = await client.post("/api/v1/projects/", json={"name": "Auto P"})
        pid = proj.json()["id"]

        story = await client.post(
            f"/api/v1/projects/{pid}/stories/",
            json={"title": "Auto Story"},
        )
        sid = story.json()["id"]

        task = await client.post(
            f"/api/v1/projects/{pid}/stories/{sid}/tasks/",
            json={"title": "Auto Task"},
        )
        tid = task.json()["id"]

        with patch(
            "app.workers.tasks.notification_tasks.check_story_completion.apply_async"
        ) as mock_check:
            mock_check.return_value = MagicMock(id="auto-celery-id")

            # Mark task as in_review first (valid transition: todo -> in_progress -> in_review -> done)
            await client.patch(
                f"/api/v1/projects/{pid}/stories/{sid}/tasks/{tid}",
                json={"status": "in_progress"},
            )
            await client.patch(
                f"/api/v1/projects/{pid}/stories/{sid}/tasks/{tid}",
                json={"status": "in_review"},
            )

            # Now mark as done
            response = await client.patch(
                f"/api/v1/projects/{pid}/stories/{sid}/tasks/{tid}",
                json={"status": "done"},
            )

        assert response.status_code == 200
        assert response.json()["status"] == "done"

        # Verify background job was dispatched
        assert mock_check.called

    async def test_task_update_succeeds_even_if_celery_down(
        self, client: AsyncClient
    ):
        """Task update should not fail if background job dispatch fails."""
        proj = await client.post("/api/v1/projects/", json={"name": "P"})
        pid = proj.json()["id"]
        story = await client.post(
            f"/api/v1/projects/{pid}/stories/", json={"title": "S"}
        )
        sid = story.json()["id"]
        task = await client.post(
            f"/api/v1/projects/{pid}/stories/{sid}/tasks/", json={"title": "T"}
        )
        tid = task.json()["id"]

        # Transition to in_review
        await client.patch(
            f"/api/v1/projects/{pid}/stories/{sid}/tasks/{tid}",
            json={"status": "in_progress"},
        )
        await client.patch(
            f"/api/v1/projects/{pid}/stories/{sid}/tasks/{tid}",
            json={"status": "in_review"},
        )

        # Simulate Celery being down
        with patch(
            "app.workers.tasks.notification_tasks.check_story_completion.apply_async",
            side_effect=Exception("Redis connection refused"),
        ):
            response = await client.patch(
                f"/api/v1/projects/{pid}/stories/{sid}/tasks/{tid}",
                json={"status": "done"},
            )

        # Task update should still succeed!
        assert response.status_code == 200
        assert response.json()["status"] == "done"


class TestStaleTaskScan:
    async def test_manual_stale_scan(self, client: AsyncClient):
        """Manual stale task scan should create job and return 202."""
        with patch(
            "app.workers.tasks.maintenance_tasks.scan_stale_tasks.apply_async"
        ) as mock_task:
            mock_task.return_value = MagicMock(id="stale-celery-id")

            response = await client.post(
                "/api/v1/reports/maintenance/scan-stale-tasks",
                json={"triggered_by": "admin"},
            )

        assert response.status_code == 202
        data = response.json()
        assert data["job_type"] == "stale_task_scan"
        assert data["triggered_by"] == "admin"