"""
Custom exceptions for clean error handling.

Why custom exceptions?
- Separate business logic errors from HTTP errors
- Services throw domain exceptions, API layer converts them to HTTP responses
- Easier to test business logic without HTTP context
"""
from dataclasses import dataclass, field


@dataclass
class AppError(Exception):
    """Base exception for all application errors."""
    message: str
    details: dict = field(default_factory=dict)

    def __str__(self) -> str:
        return self.message


@dataclass
class NotFoundError(AppError):
    """Raised when a requested resource doesn't exist."""
    message: str = "Resource not found"


@dataclass
class ValidationError(AppError):
    """Raised when business rule validation fails."""
    message: str = "Validation failed"


@dataclass
class ConflictError(AppError):
    """Raised when an operation conflicts with current state."""
    message: str = "Resource conflict"


@dataclass
class BusinessRuleError(AppError):
    """Raised when a business rule is violated."""
    message: str = "Business rule violation"