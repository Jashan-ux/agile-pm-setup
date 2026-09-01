"""
Periodic maintenance tasks.

These run on a schedule (via Celery Beat) without being triggered by users.

Tasks:
1. scan_stale_tasks - Find tasks stuck IN_PROGRESS for too long
2. daily_project_health_check - Overall system health summary
"""
import logging
from datetime import datetime, timedelta, timezone

from app.models.job import Job, JobStatus, JobType
from app.models.task import Task, TaskStatus
from app.models.user_story import UserStory
from app.workers.celery_app import celery_app
from app.workers.db_helper import get_worker_db, update_job_status

logger = logging.getLogger(__name__)

# Tasks stale after this many hours in IN_PROGRESS
STALE_THRESHOLD_HOURS = 48


@celery_app.task(
    bind=True,
    name="app.workers.tasks.maintenance_tasks.scan_stale_tasks",
    max_retries=2,
    soft_time_limit=120,
    time_limit=180,
)
def scan_stale_tasks(self, job_id: str | None = None) -> dict:
    """
    Scan for tasks that have been IN_PROGRESS for too long.

    Stale definition: IN_PROGRESS for > 48 hours.
    This runs hourly via Celery Beat.

    When run via Beat (scheduled), job_id is None.
    We create our own job record in that case.
    """
    logger.info("Starting stale task scan")

    # For scheduled runs, create a job record
    with get_worker_db() as db:
        if job_id is None:
            job = Job(
                job_type=JobType.STALE_TASK_SCAN,
                status=JobStatus.PROCESSING,
                celery_task_id=self.request.id,
                triggered_by="celery_beat",
            )
            db.add(job)
            db.flush()
            job_id = job.id
        else:
            update_job_status(
                job_id=job_id,
                status=JobStatus.PROCESSING,
                celery_task_id=self.request.id,
            )

    try:
        stale_cutoff = datetime.now(timezone.utc) - timedelta(
            hours=STALE_THRESHOLD_HOURS
        )

        with get_worker_db() as db:
            from sqlalchemy import select
            from sqlalchemy.orm import selectinload

            # Find tasks stuck in IN_PROGRESS
            stale_tasks = db.execute(
                select(Task)
                .where(
                    Task.status == TaskStatus.IN_PROGRESS,
                    Task.updated_at < stale_cutoff,
                )
                .options(selectinload(Task.story))
            ).scalars().all()

            findings = []
            for task in stale_tasks:
                hours_stale = (
                    datetime.now(timezone.utc) - task.updated_at.replace(tzinfo=timezone.utc)
                ).total_seconds() / 3600

                findings.append({
                    "task_id": task.id,
                    "task_title": task.title,
                    "story_id": task.story_id,
                    "story_title": task.story.title if task.story else "Unknown",
                    "assignee": task.assignee_name or "Unassigned",
                    "hours_in_progress": round(hours_stale, 1),
                    "last_updated": task.updated_at.isoformat(),
                })

            result = {
                "scan_time": datetime.now(timezone.utc).isoformat(),
                "stale_threshold_hours": STALE_THRESHOLD_HOURS,
                "stale_tasks_found": len(findings),
                "findings": findings,
            }

            if findings:
                logger.warning(
                    f"Found {len(findings)} stale tasks: "
                    f"{[f['task_title'] for f in findings]}"
                )
            else:
                logger.info("No stale tasks found")

        update_job_status(
            job_id=job_id,
            status=JobStatus.COMPLETED,
            result_data=result,
        )
        return result

    except Exception as exc:
        logger.error(f"Stale task scan failed: {exc}")
        update_job_status(
            job_id=job_id,
            status=JobStatus.FAILED,
            error_message=str(exc),
        )
        raise


@celery_app.task(
    bind=True,
    name="app.workers.tasks.maintenance_tasks.daily_project_health_check",
    max_retries=1,
    soft_time_limit=180,
    time_limit=240,
)
def daily_project_health_check(self, job_id: str | None = None) -> dict:
    """
    Daily health check across all active projects.
    Generates a summary of the entire system state.
    Runs at 9am UTC via Celery Beat.
    """
    logger.info("Starting daily project health check")

    with get_worker_db() as db:
        if job_id is None:
            job = Job(
                job_type=JobType.STALE_TASK_SCAN,
                status=JobStatus.PROCESSING,
                celery_task_id=self.request.id,
                triggered_by="celery_beat",
            )
            db.add(job)
            db.flush()
            job_id = job.id
        else:
            update_job_status(
                job_id=job_id,
                status=JobStatus.PROCESSING,
                celery_task_id=self.request.id,
            )

    try:
        with get_worker_db() as db:
            from sqlalchemy import select
            from sqlalchemy.orm import selectinload

            from app.models.project import Project, ProjectStatus

            # Fetch all active projects
            projects = db.execute(
                select(Project)
                .where(Project.status == ProjectStatus.ACTIVE)
                .options(
                    selectinload(Project.stories).selectinload(UserStory.tasks)
                )
            ).scalars().all()

            project_summaries = []
            total_blocked = 0
            total_in_progress = 0

            for project in projects:
                stories = project.stories or []
                all_tasks = [t for s in stories for t in (s.tasks or [])]

                blocked = sum(1 for t in all_tasks if t.status == TaskStatus.BLOCKED)
                in_prog = sum(
                    1 for t in all_tasks if t.status == TaskStatus.IN_PROGRESS
                )
                done = sum(1 for t in all_tasks if t.status == TaskStatus.DONE)

                total_blocked += blocked
                total_in_progress += in_prog

                health_score = _calculate_health_score(
                    all_tasks, stories
                )

                project_summaries.append({
                    "project_id": project.id,
                    "project_name": project.name,
                    "health_score": health_score,
                    "health_label": _health_label(health_score),
                    "stories": len(stories),
                    "tasks": {
                        "total": len(all_tasks),
                        "done": done,
                        "in_progress": in_prog,
                        "blocked": blocked,
                    },
                })

            # Sort by health score ascending (worst first)
            project_summaries.sort(key=lambda x: x["health_score"])

            result = {
                "check_date": datetime.now(timezone.utc).date().isoformat(),
                "active_projects": len(projects),
                "total_blocked_tasks": total_blocked,
                "total_in_progress_tasks": total_in_progress,
                "projects_needing_attention": [
                    p for p in project_summaries if p["health_score"] < 60
                ],
                "all_projects": project_summaries,
            }

        update_job_status(
            job_id=job_id,
            status=JobStatus.COMPLETED,
            result_data=result,
        )
        logger.info(
            f"Health check done. {len(projects)} active projects, "
            f"{total_blocked} blocked tasks"
        )
        return result

    except Exception as exc:
        logger.error(f"Daily health check failed: {exc}")
        update_job_status(
            job_id=job_id,
            status=JobStatus.FAILED,
            error_message=str(exc),
        )
        raise


def _calculate_health_score(tasks: list, stories: list) -> int:
    """
    Calculate a 0-100 health score for a project.

    Scoring:
    - Task completion rate: 50 points
    - No blocked tasks: 30 points
    - No overdue stories: 20 points
    """
    if not tasks:
        return 50  # No data - neutral score

    score = 0

    # Completion rate (50 points)
    total = len(tasks)
    done = sum(1 for t in tasks if t.status == TaskStatus.DONE)
    completion_rate = done / total if total > 0 else 0
    score += int(completion_rate * 50)

    # No blockers (30 points)
    blocked = sum(1 for t in tasks if t.status == TaskStatus.BLOCKED)
    blocker_penalty = min(blocked * 10, 30)
    score += max(0, 30 - blocker_penalty)

    # Story progress (20 points)
    from app.models.user_story import StoryStatus
    done_stories = sum(1 for s in stories if s.status == StoryStatus.DONE)
    story_rate = done_stories / len(stories) if stories else 0
    score += int(story_rate * 20)

    return min(100, score)


def _health_label(score: int) -> str:
    if score >= 80:
        return "healthy"
    elif score >= 60:
        return "at_risk"
    elif score >= 40:
        return "concerning"
    else:
        return "critical"