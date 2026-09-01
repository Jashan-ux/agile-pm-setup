"""
Report generation background tasks.

These tasks can take significant time (DB queries, formatting, etc.)
so they run asynchronously. The user gets a job_id immediately and
polls for completion.

Failure handling:
- autoretry_for: which exceptions trigger automatic retry
- max_retries: how many times to retry
- countdown: seconds to wait before retry (exponential-ish)
- On permanent failure: job marked FAILED with error details
"""
import json
import logging
from datetime import datetime, timezone

from celery import Task

from app.models.job import JobStatus
from app.models.project import Project
from app.models.task import Task as TaskModel, TaskStatus
from app.models.user_story import StoryStatus, UserStory
from app.workers.celery_app import celery_app
from app.workers.db_helper import get_worker_db, update_job_status

logger = logging.getLogger(__name__)


class BaseTaskWithDB(Task):
    """
    Base Celery Task class with DB access.

    Provides on_failure and on_retry hooks that automatically
    update the job record in the database.
    """
    abstract = True

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Called when a task fails permanently (no more retries)."""
        job_id = kwargs.get("job_id") or (args[0] if args else None)
        if job_id:
            update_job_status(
                job_id=job_id,
                status=JobStatus.FAILED,
                error_message=f"{type(exc).__name__}: {str(exc)}\n\n{einfo}",
            )
        logger.error(f"Task {task_id} failed permanently: {exc}")

    def on_retry(self, exc, task_id, args, kwargs, einfo):
        """Called when a task is about to be retried."""
        job_id = kwargs.get("job_id") or (args[0] if args else None)
        if job_id:
            update_job_status(
                job_id=job_id,
                status=JobStatus.RETRYING,
                error_message=f"Retry due to: {str(exc)}",
            )
        logger.warning(f"Task {task_id} retrying: {exc}")

    def on_success(self, retval, task_id, args, kwargs):
        """Called on success - status already updated inside the task."""
        logger.info(f"Task {task_id} completed successfully")


@celery_app.task(
    bind=True,
    base=BaseTaskWithDB,
    name="app.workers.tasks.report_tasks.generate_project_report",
    # Retry config
    autoretry_for=(Exception,),
    max_retries=3,
    retry_backoff=True,          # Exponential backoff: 2s, 4s, 8s
    retry_backoff_max=60,        # Cap at 60 seconds
    retry_jitter=True,           # Add randomness to prevent thundering herd
    # Timeout
    soft_time_limit=300,         # 5 min soft limit (raises SoftTimeLimitExceeded)
    time_limit=360,              # 6 min hard limit (kills the task)
)
def generate_project_report(self, job_id: str, project_id: str) -> dict:
    """
    Generate a comprehensive markdown report for a project.

    Report includes:
    - Project overview and status
    - Story breakdown by status
    - Task completion rates
    - Time estimates vs actuals
    - Blocked tasks list
    - Velocity metrics

    This demonstrates:
    1. Long-running background task
    2. DB access from worker
    3. Structured result storage
    4. Proper status lifecycle management
    """
    logger.info(f"[Job {job_id}] Starting report generation for project {project_id}")

    # Mark as processing
    update_job_status(
        job_id=job_id,
        status=JobStatus.PROCESSING,
        celery_task_id=self.request.id,
    )

    try:
        with get_worker_db() as db:
            # ── Fetch Project ─────────────────────────────────────────────────
            project = db.get(Project, project_id)
            if project is None:
                raise ValueError(f"Project {project_id} not found")

            # ── Fetch Stories with Tasks ──────────────────────────────────────
            from sqlalchemy import select
            from sqlalchemy.orm import selectinload

            stories = db.execute(
                select(UserStory)
                .where(UserStory.project_id == project_id)
                .options(selectinload(UserStory.tasks))
            ).scalars().all()

            # ── Compute Metrics ───────────────────────────────────────────────
            total_stories = len(stories)
            stories_by_status = {}
            for story in stories:
                s = story.status.value
                stories_by_status[s] = stories_by_status.get(s, 0) + 1

            all_tasks = [t for s in stories for t in s.tasks]
            total_tasks = len(all_tasks)
            tasks_by_status = {}
            for task in all_tasks:
                s = task.status.value
                tasks_by_status[s] = tasks_by_status.get(s, 0) + 1

            completed_tasks = tasks_by_status.get("done", 0)
            blocked_tasks = [t for t in all_tasks if t.status == TaskStatus.BLOCKED]

            total_estimated = sum(t.estimated_hours or 0 for t in all_tasks)
            total_actual = sum(t.actual_hours or 0 for t in all_tasks)

            total_points = sum(s.story_points or 0 for s in stories)
            completed_points = sum(
                s.story_points or 0
                for s in stories
                if s.status == StoryStatus.DONE
            )

            completion_rate = (
                round((completed_tasks / total_tasks) * 100, 1)
                if total_tasks > 0 else 0.0
            )

            # ── Generate Markdown Report ──────────────────────────────────────
            generated_at = datetime.now(timezone.utc).isoformat()

            report_md = _build_markdown_report(
                project=project,
                stories=stories,
                all_tasks=all_tasks,
                blocked_tasks=blocked_tasks,
                stories_by_status=stories_by_status,
                tasks_by_status=tasks_by_status,
                total_estimated=total_estimated,
                total_actual=total_actual,
                total_points=total_points,
                completed_points=completed_points,
                completion_rate=completion_rate,
                generated_at=generated_at,
            )

            # ── Build Result ──────────────────────────────────────────────────
            result = {
                "project_id": project_id,
                "project_name": project.name,
                "generated_at": generated_at,
                "metrics": {
                    "total_stories": total_stories,
                    "total_tasks": total_tasks,
                    "completed_tasks": completed_tasks,
                    "blocked_tasks": len(blocked_tasks),
                    "completion_rate_percent": completion_rate,
                    "total_story_points": total_points,
                    "completed_story_points": completed_points,
                    "total_estimated_hours": total_estimated,
                    "total_actual_hours": total_actual,
                    "hours_variance": total_actual - total_estimated,
                    "stories_by_status": stories_by_status,
                    "tasks_by_status": tasks_by_status,
                },
                "report_markdown": report_md,
                "blocked_tasks": [
                    {
                        "id": t.id,
                        "title": t.title,
                        "assignee": t.assignee_name,
                    }
                    for t in blocked_tasks
                ],
            }

        # ── Mark Complete ─────────────────────────────────────────────────────
        update_job_status(
            job_id=job_id,
            status=JobStatus.COMPLETED,
            result_data=result,
        )

        logger.info(f"[Job {job_id}] Report generated successfully")
        return result

    except Exception as exc:
        logger.error(f"[Job {job_id}] Report generation failed: {exc}")
        # Re-raise to trigger Celery's retry mechanism
        raise


def _build_markdown_report(
    project,
    stories,
    all_tasks,
    blocked_tasks,
    stories_by_status,
    tasks_by_status,
    total_estimated,
    total_actual,
    total_points,
    completed_points,
    completion_rate,
    generated_at,
) -> str:
    """Build a formatted markdown report string."""

    lines = [
        f"# Project Report: {project.name}",
        f"",
        f"**Generated:** {generated_at}",
        f"**Status:** {project.status.value.upper()}",
        f"**Owner:** {project.owner_name or 'Unassigned'}",
        f"",
        f"---",
        f"",
        f"## 📊 Summary",
        f"",
        f"| Metric | Value |",
        f"|--------|-------|",
        f"| Total Stories | {len(stories)} |",
        f"| Total Tasks | {len(all_tasks)} |",
        f"| Task Completion | {completion_rate}% |",
        f"| Story Points Done | {completed_points} / {total_points} |",
        f"| Estimated Hours | {total_estimated}h |",
        f"| Actual Hours | {total_actual}h |",
        f"| Hours Variance | {total_actual - total_estimated:+d}h |",
        f"",
        f"---",
        f"",
        f"## 📋 Stories by Status",
        f"",
    ]

    for status, count in stories_by_status.items():
        emoji = {
            "backlog": "📥",
            "ready": "🎯",
            "in_progress": "⚡",
            "in_review": "👀",
            "done": "✅",
            "cancelled": "❌",
        }.get(status, "•")
        lines.append(f"- {emoji} **{status.replace('_', ' ').title()}**: {count}")

    lines.extend([
        f"",
        f"---",
        f"",
        f"## ✅ Tasks by Status",
        f"",
    ])

    for status, count in tasks_by_status.items():
        lines.append(f"- **{status.replace('_', ' ').title()}**: {count}")

    if blocked_tasks:
        lines.extend([
            f"",
            f"---",
            f"",
            f"## 🚨 Blocked Tasks ({len(blocked_tasks)})",
            f"",
            f"These tasks need immediate attention:",
            f"",
        ])
        for task in blocked_tasks:
            assignee = task.assignee_name or "Unassigned"
            lines.append(f"- **{task.title}** (Assignee: {assignee})")

    lines.extend([
        f"",
        f"---",
        f"",
        f"## 📖 Story Details",
        f"",
    ])

    for story in stories:
        tasks = story.tasks or []
        done = sum(1 for t in tasks if t.status.value == "done")
        lines.extend([
            f"### {story.title}",
            f"- **Status:** {story.status.value} | **Priority:** {story.priority.value}",
            f"- **Points:** {story.story_points or 'unestimated'} | "
            f"**Assignee:** {story.assignee_name or 'unassigned'}",
            f"- **Tasks:** {done}/{len(tasks)} done",
            f"",
        ])

    lines.extend([
        f"---",
        f"*Report generated by Agile PM Tool*",
    ])

    return "\n".join(lines)