"""
Job tracking schemas.
"""
import json
from datetime import datetime
from typing import Any

from pydantic import Field, field_validator

from app.models.job import JobStatus, JobType
from app.schemas.common import BaseSchema


class JobResponse(BaseSchema):
    """Full job status response."""
    id: str
    job_type: JobType
    status: JobStatus
    celery_task_id: str | None
    project_id: str | None
    story_id: str | None
    input_data: dict | None = None
    result_data: dict | None = None
    error_message: str | None
    retry_count: int
    max_retries: int
    triggered_by: str | None
    created_at: datetime
    updated_at: datetime

    @field_validator("input_data", "result_data", mode="before")
    @classmethod
    def parse_json_field(cls, v: Any) -> dict | None:
        """Parse JSON strings from DB into dicts."""
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (json.JSONDecodeError, TypeError):
                return None
        return v


class JobSummary(BaseSchema):
    """Lightweight job summary for list views."""
    id: str
    job_type: JobType
    status: JobStatus
    project_id: str | None
    retry_count: int
    triggered_by: str | None
    created_at: datetime
    updated_at: datetime


class TriggerReportRequest(BaseSchema):
    """Request body for triggering a project report."""
    triggered_by: str | None = Field(
        default=None,
        max_length=100,
        description="Who is requesting this report",
        examples=["alice@team.com"],
    )


class TriggerStoryCheckRequest(BaseSchema):
    """Request body for triggering a story completion check."""
    triggered_by: str | None = Field(default=None, max_length=100)


class TriggerStaleTaskScanRequest(BaseSchema):
    """Request body for triggering a stale task scan."""
    triggered_by: str | None = Field(default=None, max_length=100)