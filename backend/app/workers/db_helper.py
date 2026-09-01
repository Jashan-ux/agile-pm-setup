"""
Database utilities for Celery workers.

Critical difference from FastAPI:
- FastAPI uses async SQLAlchemy (aiosqlite)
- Celery workers are synchronous by default
- We use synchronous SQLAlchemy here for workers

Why not async in Celery?
- Celery's event loop and asyncio don't mix cleanly
- Sync SQLAlchemy is simpler and perfectly fine for background tasks
- We can use gevent/eventlet for concurrency if needed later

Design: We use a context manager pattern for clean session handling.
"""
import json
import logging
from contextlib import contextmanager
from datetime import datetime, timezone

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.models.job import Job, JobStatus

logger = logging.getLogger(__name__)

# ─── Sync Engine for Workers ──────────────────────────────────────────────────
# Convert async URL to sync URL for worker use
# sqlite+aiosqlite:///... → sqlite:///...
SYNC_DATABASE_URL = settings.DATABASE_URL.replace(
    "sqlite+aiosqlite", "sqlite"
).replace(
    "postgresql+asyncpg", "postgresql+psycopg2"
)

sync_engine = create_engine(
    SYNC_DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in SYNC_DATABASE_URL else {},
    pool_pre_ping=True,
    echo=False,  # Don't log SQL in workers (too noisy)
)

SyncSessionLocal = sessionmaker(
    bind=sync_engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


@contextmanager
def get_worker_db():
    """
    Context manager for worker database sessions.

    Usage:
        with get_worker_db() as db:
            project = db.get(Project, project_id)

    Automatically commits on success, rolls back on error.
    """
    session = SyncSessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


# ─── Job State Management ─────────────────────────────────────────────────────
def update_job_status(
    job_id: str,
    status: JobStatus,
    result_data: dict | None = None,
    error_message: str | None = None,
    celery_task_id: str | None = None,
) -> None:
    """
    Update job status in the database.
    Called by Celery tasks to report their progress.
    """
    with get_worker_db() as db:
        job = db.get(Job, job_id)
        if job is None:
            logger.error(f"Job {job_id} not found in DB - cannot update status")
            return

        job.status = status
        job.updated_at = datetime.now(timezone.utc)

        if celery_task_id:
            job.celery_task_id = celery_task_id
        if result_data is not None:
            job.result_data = json.dumps(result_data)
        if error_message is not None:
            job.error_message = error_message
            job.retry_count += 1

        logger.info(f"Job {job_id} status → {status}")


def get_job(job_id: str) -> Job | None:
    """Fetch a job from the DB synchronously."""
    with get_worker_db() as db:
        return db.get(Job, job_id)