"""
Notification background tasks.

These check business conditions and record findings.
In a real system, these would send emails/Slack messages.
We record notifications in the job result for now.

Design pattern:
- Task scans for condition
- Builds a list of findings
- Stores findings in job result
- UI can then display these findings
"""
import logging
from datetime import datetime, timezone

from app.models.job import JobStatus
from app.models.task import TaskStatus
from app.models.user_story import StoryStatus, UserStory
from app.workers.celery_app import celery_app
from app.workers.db_helper import get_worker_db, update_job_status

logger = logging.getLogger(__name__)


@celery_app.task(
    bind=True,
    name="app.workers.tasks.notification_tasks.check_story_completion",
    max_retries=2,
    retry_backoff=True,
    soft_time_limit=60,
    time_limit=90,
)
def check_story_completion(self, job_id: str, story_id: str, project_id: str) -> dict:
    """
    Check if all tasks in a story are done and suggest story completion.

    Triggered automatically when a task is marked DONE.
    This is the "smart suggestion" feature:
    - All tasks done → suggest marking story as done
    - Some tasks blocked → alert about blockers

    Why async?
    - This runs after every task status change
    - We don't want to slow down the task update API
    - It's a "fire and forget" notification
    """
    logger.info(f"[Job {job_id}] Checking story completion for story {story_id}")

    update_job_status(
        job_id=job_id,
        status=JobStatus.PROCESSING,
        celery_task_id=self.request.id,
    )

    try:
        with get_worker_db() as db:
            from sqlalchemy import select
            from sqlalchemy.orm import selectinload

            story = db.execute(
                select(UserStory)
                .where(UserStory.id == story_id)
                .options(selectinload(UserStory.tasks))
            ).scalar_one_or_none()

            if story is None:
                result = {
                    "story_id": story_id,
                    "finding": "story_not_found",
                    "message": f"Story {story_id} not found",
                    "suggestion": None,
                }
                update_job_status(
                    job_id=job_id,
                    status=JobStatus.COMPLETED,
                    result_data=result,
                )
                return result

            tasks = story.tasks or []

            if not tasks:
                result = {
                    "story_id": story_id,
                    "story_title": story.title,
                    "finding": "no_tasks",
                    "message": "Story has no tasks",
                    "suggestion": None,
                }
            else:
                total = len(tasks)
                done = sum(1 for t in tasks if t.status == TaskStatus.DONE)
                blocked = [t for t in tasks if t.status == TaskStatus.BLOCKED]
                in_progress = [t for t in tasks if t.status == TaskStatus.IN_PROGRESS]

                if done == total and story.status != StoryStatus.DONE:
                    # All tasks complete!
                    finding = "all_tasks_complete"
                    suggestion = "ready_to_complete"
                    message = (
                        f"All {total} tasks are DONE. "
                        f"Consider moving story to IN_REVIEW or DONE."
                    )
                elif blocked:
                    finding = "has_blocked_tasks"
                    suggestion = "resolve_blockers"
                    message = (
                        f"{len(blocked)} task(s) are BLOCKED out of {total}. "
                        f"Blocked: {', '.join(t.title for t in blocked)}"
                    )
                else:
                    finding = "in_progress"
                    suggestion = None
                    message = f"{done}/{total} tasks complete, {len(in_progress)} in progress"

                result = {
                    "story_id": story_id,
                    "project_id": project_id,
                    "story_title": story.title,
                    "story_status": story.status.value,
                    "finding": finding,
                    "message": message,
                    "suggestion": suggestion,
                    "task_summary": {
                        "total": total,
                        "done": done,
                        "blocked": len(blocked),
                        "in_progress": len(in_progress),
                    },
                    "checked_at": datetime.now(timezone.utc).isoformat(),
                }

        update_job_status(
            job_id=job_id,
            status=JobStatus.COMPLETED,
            result_data=result,
        )

        logger.info(
            f"[Job {job_id}] Story check complete. Finding: {result['finding']}"
        )
        return result

    except Exception as exc:
        logger.error(f"[Job {job_id}] Story completion check failed: {exc}")
        raise