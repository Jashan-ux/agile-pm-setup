"""
Background job tracking model.

Why track jobs in the database?
- Redis is ephemeral - results expire
- DB gives us permanent audit trail
- Multiple API pods can all read job status
- We can query jobs by status, type, project, etc.

Job lifecycle:
  PENDING → PROCESSING → COMPLETED
                       → FAILED (with retry)
                       → RETRYING → PROCESSING
                       → CANCELLED
"""
import enum

from sqlalchemy import Enum, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class JobStatus(str, enum.Enum):
    PENDING = "pending"         # Queued, not yet picked up
    PROCESSING = "processing"   # Worker is running it
    COMPLETED = "completed"     # Finished successfully
    FAILED = "failed"           # Failed, no more retries
    RETRYING = "retrying"       # Failed, will retry
    CANCELLED = "cancelled"     # Manually cancelled


class JobType(str, enum.Enum):
    PROJECT_REPORT = "project_report"
    STALE_TASK_SCAN = "stale_task_scan"
    STORY_COMPLETION_CHECK = "story_completion_check"
    BULK_STATUS_UPDATE = "bulk_status_update"


class Job(Base, UUIDMixin, TimestampMixin):
    """
    Tracks every background job submitted to Celery.

    Design notes:
    - celery_task_id links to Celery's own task tracking
    - result_data stores JSON as text (SQLite doesn't have JSON type)
    - error_message stores the exception info on failure
    - retry_count tracks how many times we've retried
    """
    __tablename__ = "jobs"

    # Job classification
    job_type: Mapped[JobType] = mapped_column(
        Enum(JobType),
        nullable=False,
        index=True,
    )
    status: Mapped[JobStatus] = mapped_column(
        Enum(JobStatus),
        default=JobStatus.PENDING,
        nullable=False,
        index=True,
    )

    # Link to Celery's internal task ID
    celery_task_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        index=True,
        comment="Celery's own task UUID",
    )

    # Context - what resource this job is about
    # Storing as string IDs (no FK) because jobs can outlive resources
    project_id: Mapped[str | None] = mapped_column(
        String(36),
        nullable=True,
        index=True,
        comment="Related project ID (if applicable)",
    )
    story_id: Mapped[str | None] = mapped_column(
        String(36),
        nullable=True,
        comment="Related story ID (if applicable)",
    )

    # Input and output
    input_data: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="JSON-encoded job input parameters",
    )
    result_data: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="JSON-encoded job result",
    )
    error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Error details on failure",
    )

    # Retry tracking
    retry_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    max_retries: Mapped[int] = mapped_column(
        Integer,
        default=3,
        nullable=False,
    )

    # Who triggered this job
    triggered_by: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        comment="User or system that triggered this job",
    )

    def __repr__(self) -> str:
        return (
            f"<Job id={self.id!r} "
            f"type={self.job_type!r} "
            f"status={self.status!r}>"
        )