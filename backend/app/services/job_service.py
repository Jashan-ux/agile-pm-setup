"""
Job service - manages job creation and querying.

This is the bridge between FastAPI and Celery.
FastAPI creates a job record, then dispatches the Celery task.
The Celery task updates the job record as it progresses.
"""
import json
import logging
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.job import Job, JobStatus, JobType
from app.models.project import Project
from app.models.user_story import UserStory
from app.schemas.common import PaginationParams
from app.schemas.job import JobResponse, JobSummary

logger = logging.getLogger(__name__)


class JobService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_job(
        self,
        job_type: JobType,
        project_id: str | None = None,
        story_id: str | None = None,
        input_data: dict | None = None,
        triggered_by: str | None = None,
        max_retries: int = 3,
    ) -> Job:
        """
        Create a job record in the DB before dispatching to Celery.

        Why create before dispatch?
        - We always have a record even if Celery is down
        - The job_id is generated here and passed to Celery
        - Celery uses the same job_id to update the record
        """
        job = Job(
            job_type=job_type,
            status=JobStatus.PENDING,
            project_id=project_id,
            story_id=story_id,
            input_data=json.dumps(input_data) if input_data else None,
            triggered_by=triggered_by,
            max_retries=max_retries,
        )
        self.db.add(job)
        await self.db.flush()
        await self.db.refresh(job)

        logger.info(f"Created job id={job.id} type={job_type}")
        return job

    async def get_job(self, job_id: str) -> JobResponse:
        """Get job status by ID."""
        result = await self.db.execute(
            select(Job).where(Job.id == job_id)
        )
        job = result.scalar_one_or_none()
        if job is None:
            raise NotFoundError(
                message=f"Job '{job_id}' not found",
                details={"job_id": job_id},
            )
        return self._to_response(job)

    async def list_jobs(
        self,
        pagination: PaginationParams,
        job_type: JobType | None = None,
        status: JobStatus | None = None,
        project_id: str | None = None,
    ) -> dict[str, Any]:
        """List jobs with filtering."""
        from sqlalchemy import func

        query = select(Job)

        if job_type is not None:
            query = query.where(Job.job_type == job_type)
        if status is not None:
            query = query.where(Job.status == status)
        if project_id is not None:
            query = query.where(Job.project_id == project_id)

        # Count
        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.db.execute(count_query)).scalar_one()

        # Sort newest first
        query = query.order_by(Job.created_at.desc())
        query = query.offset(pagination.offset).limit(pagination.limit)

        result = await self.db.execute(query)
        jobs = result.scalars().all()

        items = [
            JobSummary(
                id=j.id,
                job_type=j.job_type,
                status=j.status,
                project_id=j.project_id,
                retry_count=j.retry_count,
                triggered_by=j.triggered_by,
                created_at=j.created_at,
                updated_at=j.updated_at,
            )
            for j in jobs
        ]

        pages = (
            (total + pagination.page_size - 1) // pagination.page_size
            if pagination.page_size > 0 else 0
        )
        return {
            "items": items,
            "total": total,
            "page": pagination.page,
            "page_size": pagination.page_size,
            "pages": pages,
            "has_next": pagination.page < pages,
            "has_prev": pagination.page > 1,
        }

    # ── Trigger Methods ────────────────────────────────────────────────────────
    async def trigger_project_report(
        self,
        project_id: str,
        triggered_by: str | None = None,
    ) -> JobResponse:
        """
        Trigger async project report generation.

        Flow:
        1. Validate project exists
        2. Create job record (PENDING)
        3. Dispatch Celery task
        4. Return job_id to caller (immediate response)
        """
        # Validate project exists
        project_check = await self.db.execute(
            select(Project).where(Project.id == project_id)
        )
        if project_check.scalar_one_or_none() is None:
            raise NotFoundError(
                message=f"Project '{project_id}' not found",
                details={"project_id": project_id},
            )

        # Create job record
        job = await self.create_job(
            job_type=JobType.PROJECT_REPORT,
            project_id=project_id,
            input_data={"project_id": project_id},
            triggered_by=triggered_by,
        )

        # Dispatch to Celery - AFTER DB flush so job exists in DB
        from app.workers.tasks.report_tasks import generate_project_report

        celery_task = generate_project_report.apply_async(
            kwargs={
                "job_id": job.id,
                "project_id": project_id,
            },
            queue="reports",
        )

        # Store Celery's task ID for cross-referencing
        job.celery_task_id = celery_task.id
        await self.db.flush()

        logger.info(
            f"Dispatched project report job={job.id} "
            f"celery_task={celery_task.id}"
        )
        return self._to_response(job)

    async def trigger_story_completion_check(
        self,
        project_id: str,
        story_id: str,
        triggered_by: str | None = None,
    ) -> JobResponse:
        """Trigger async story completion check."""
        # Validate story exists in project
        story_check = await self.db.execute(
            select(UserStory).where(
                UserStory.id == story_id,
                UserStory.project_id == project_id,
            )
        )
        if story_check.scalar_one_or_none() is None:
            raise NotFoundError(
                message=f"Story '{story_id}' not found in project '{project_id}'",
                details={"story_id": story_id, "project_id": project_id},
            )

        job = await self.create_job(
            job_type=JobType.STORY_COMPLETION_CHECK,
            project_id=project_id,
            story_id=story_id,
            triggered_by=triggered_by or "system",
        )

        from app.workers.tasks.notification_tasks import check_story_completion

        celery_task = check_story_completion.apply_async(
            kwargs={
                "job_id": job.id,
                "story_id": story_id,
                "project_id": project_id,
            },
            queue="notifications",
        )

        job.celery_task_id = celery_task.id
        await self.db.flush()

        logger.info(f"Dispatched story check job={job.id}")
        return self._to_response(job)

    async def trigger_stale_task_scan(
        self,
        triggered_by: str | None = None,
    ) -> JobResponse:
        """Manually trigger a stale task scan."""
        job = await self.create_job(
            job_type=JobType.STALE_TASK_SCAN,
            triggered_by=triggered_by or "manual",
        )

        from app.workers.tasks.maintenance_tasks import scan_stale_tasks

        celery_task = scan_stale_tasks.apply_async(
            kwargs={"job_id": job.id},
            queue="maintenance",
        )

        job.celery_task_id = celery_task.id
        await self.db.flush()

        logger.info(f"Dispatched stale task scan job={job.id}")
        return self._to_response(job)

    def _to_response(self, job: Job) -> JobResponse:
        import json as _json

        def _parse(v):
            if isinstance(v, str):
                try:
                    return _json.loads(v)
                except Exception:
                    return None
            return v

        return JobResponse(
            id=job.id,
            job_type=job.job_type,
            status=job.status,
            celery_task_id=job.celery_task_id,
            project_id=job.project_id,
            story_id=job.story_id,
            input_data=_parse(job.input_data),
            result_data=_parse(job.result_data),
            error_message=job.error_message,
            retry_count=job.retry_count,
            max_retries=job.max_retries,
            triggered_by=job.triggered_by,
            created_at=job.created_at,
            updated_at=job.updated_at,
        )