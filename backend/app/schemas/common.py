"""
Shared schema components used across the application.

Design decisions:
- Generic pagination schema works for any resource
- Consistent response envelope means frontend always knows what to expect
- Using TypeVar makes pagination type-safe (PagedResponse[ProjectResponse])
"""
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

# TypeVar for generic pagination
T = TypeVar("T")


class BaseSchema(BaseModel):
    """
    Base schema for all Pydantic models.

    model_config with from_attributes=True allows creating
    schemas directly from SQLAlchemy ORM objects:
        ProjectResponse.model_validate(db_project)  ✓
    """
    model_config = ConfigDict(
        from_attributes=True,    # Allow ORM object → schema conversion
        populate_by_name=True,   # Allow both alias and field name
        str_strip_whitespace=True,  # Auto-strip whitespace from strings
    )


class PaginationParams(BaseModel):
    """
    Standard pagination query parameters.

    Usage in endpoints:
        async def list_projects(pagination: PaginationParams = Depends()):

    Limits prevent abuse (no one can request 10000 records).
    """
    page: int = Field(default=1, ge=1, description="Page number (1-indexed)")
    page_size: int = Field(
        default=20,
        ge=1,
        le=100,
        description="Items per page (max 100)",
    )

    @property
    def offset(self) -> int:
        """Calculate SQL OFFSET from page number."""
        return (self.page - 1) * self.page_size

    @property
    def limit(self) -> int:
        """SQL LIMIT is just page_size."""
        return self.page_size


class PagedResponse(BaseModel, Generic[T]):
    """
    Generic paginated response wrapper.

    Usage:
        PagedResponse[ProjectResponse](
            items=[...],
            total=100,
            page=1,
            page_size=20,
        )

    Frontend always gets:
    {
        "items": [...],
        "total": 100,
        "page": 1,
        "page_size": 20,
        "pages": 5,
        "has_next": true,
        "has_prev": false
    }
    """
    items: list[T]
    total: int
    page: int
    page_size: int

    @property
    def pages(self) -> int:
        """Total number of pages."""
        if self.page_size == 0:
            return 0
        return (self.total + self.page_size - 1) // self.page_size

    @property
    def has_next(self) -> bool:
        return self.page < self.pages

    @property
    def has_prev(self) -> bool:
        return self.page > 1

    model_config = ConfigDict(
        # Include computed properties in serialization
        # We need to add them explicitly in the response
    )

    def model_dump_with_meta(self) -> dict:
        """Dump with computed pagination metadata."""
        return {
            "items": self.items,
            "total": self.total,
            "page": self.page,
            "page_size": self.page_size,
            "pages": self.pages,
            "has_next": self.has_next,
            "has_prev": self.has_prev,
        }


class StatusMessage(BaseModel):
    """Simple status response for operations that don't return data."""
    message: str
    success: bool = True