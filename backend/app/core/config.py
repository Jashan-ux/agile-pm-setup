"""
Application configuration using Pydantic Settings.

Why Pydantic Settings?
- Type validation on all config values at startup
- Automatic reading from .env files
- IDE autocomplete support
- Fails fast if required config is missing
"""
from functools import lru_cache
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Central configuration class.
    All environment variables are read here.
    Using lru_cache ensures this is only instantiated once.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # Ignore extra env vars we don't define
    )

    # ─── Application ─────────────────────────────────────────
    APP_NAME: str = "Agile PM Tool"
    APP_VERSION: str = "0.1.0"
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"
    DEBUG: bool = True

    # ─── Server ──────────────────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # ─── Database ────────────────────────────────────────────
    DATABASE_URL: str = "sqlite+aiosqlite:///./agile_pm.db"

    # ─── Security ────────────────────────────────────────────
    SECRET_KEY: str = "change-me-in-production-use-secrets-token-hex-32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # ─── CORS ────────────────────────────────────────────────
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    # ─── Background Tasks / Celery ───────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters long")
        return v

    @property
    def allowed_origins_list(self) -> list[str]:
        """Parse comma-separated origins into a list."""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"


@lru_cache
def get_settings() -> Settings:
    """
    Returns cached Settings instance.
    lru_cache means this is computed only once per process.
    Use this as a FastAPI dependency.
    """
    return Settings()


# Module-level settings for direct imports
settings = get_settings()