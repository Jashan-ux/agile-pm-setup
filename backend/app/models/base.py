"""
SQLAlchemy declarative base and common mixins.

Design decisions:
- Using UUIDs as primary keys instead of auto-increment integers.
  Why? Better for distributed systems, no information leakage
  about record counts, safer to expose in URLs.
- TimestampMixin gives every model created_at/updated_at automatically.
- SoftDeleteMixin allows "deleting" without actually removing data.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def utc_now() -> datetime:
    """Always store UTC times. Never store local time in a database."""
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    """
    Base class for all SQLAlchemy models.
    All models must inherit from this.
    """
    pass


class TimestampMixin:
    """
    Mixin that adds created_at and updated_at columns.
    These are managed automatically by SQLAlchemy events.

    `server_default=func.now()` - DB sets the default.
    `onupdate=func.now()` - DB updates on every UPDATE.
    """
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )


class UUIDMixin:
    """
    Mixin that adds a UUID primary key.
    UUID is generated in Python (not DB) for:
    - Consistency across different DB backends
    - Ability to know the ID before inserting
    """
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )