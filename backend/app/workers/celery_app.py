"""
Celery application configuration.

Why Celery?
- Industry standard for Python background tasks
- Redis broker is fast and simple
- Built-in retry logic with exponential backoff
- Flower provides a beautiful monitoring UI
- Task routing lets us prioritize work

Architecture:
- FastAPI submits tasks (producer)
- Celery worker executes tasks (consumer)
- Redis is the message broker in between
- Results stored in Redis AND our DB (belt + suspenders)
"""
from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

# ─── Create Celery App ────────────────────────────────────────────────────────
celery_app = Celery(
    "agile_pm",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.workers.tasks.report_tasks",
        "app.workers.tasks.notification_tasks",
        "app.workers.tasks.maintenance_tasks",
    ],
)

# ─── Configuration ────────────────────────────────────────────────────────────
celery_app.conf.update(
    # Serialization
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],

    # Timezone
    timezone="UTC",
    enable_utc=True,

    # Task behavior
    task_track_started=True,        # Track when task starts (not just queued)
    task_acks_late=True,            # Acknowledge AFTER completion (safer)
    worker_prefetch_multiplier=1,   # Don't prefetch (fair distribution)

    # Results
    result_expires=86400,           # Results expire after 24 hours in Redis

    # Retry defaults (can be overridden per task)
    task_max_retries=3,

    # Queues - different queues for different priorities
    task_default_queue="default",
    task_queues={
        "default": {},
        "reports": {},      # Report generation (can be slow)
        "notifications": {}, # Fast, time-sensitive
        "maintenance": {},   # Periodic cleanup tasks
    },

    # Routing - which tasks go to which queues
    task_routes={
        "app.workers.tasks.report_tasks.*": {"queue": "reports"},
        "app.workers.tasks.notification_tasks.*": {"queue": "notifications"},
        "app.workers.tasks.maintenance_tasks.*": {"queue": "maintenance"},
    },
)

# ─── Periodic Tasks (Celery Beat) ─────────────────────────────────────────────
# These run on a schedule automatically
celery_app.conf.beat_schedule = {
    # Scan for stale tasks every hour
    "scan-stale-tasks-hourly": {
        "task": "app.workers.tasks.maintenance_tasks.scan_stale_tasks",
        "schedule": crontab(minute=0),  # Every hour at :00
        "options": {"queue": "maintenance"},
    },
    # Daily project health summary at 9am UTC
    "daily-project-health": {
        "task": "app.workers.tasks.maintenance_tasks.daily_project_health_check",
        "schedule": crontab(hour=9, minute=0),
        "options": {"queue": "maintenance"},
    },
}