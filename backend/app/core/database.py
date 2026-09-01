"""
Database session management.

Architecture:
- Using async SQLAlchemy with aiosqlite driver
- Session per request pattern (created in middleware, closed after response)
- get_db() is a FastAPI dependency that yields a session

Why async?
- FastAPI is async-first
- Async DB calls don't block the event loop
- Better throughput under concurrent requests
"""
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings

# ─── Engine ──────────────────────────────────────────────────────────────────
# The engine is the connection pool.
# create_once at module level, reuse across requests.
engine = create_async_engine(
    settings.DATABASE_URL,
    # echo=True logs all SQL - useful in development, DISABLE in production
    echo=settings.is_development,
    # SQLite specific: check_same_thread=False needed for async
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
    # Connection pool settings
    pool_pre_ping=True,  # Verify connections before using them
)

# ─── Session Factory ──────────────────────────────────────────────────────────
# AsyncSessionLocal is a factory that creates new AsyncSession objects.
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,  # Don't expire objects after commit (important for async)
    autocommit=False,
    autoflush=False,
)


# ─── Dependency ───────────────────────────────────────────────────────────────
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that provides a database session.

    Usage in endpoints:
        async def my_endpoint(db: AsyncSession = Depends(get_db)):
            ...

    The `yield` makes this a context manager:
    - Code before yield: setup (create session)
    - Code after yield: teardown (close session)
    - Finally block ensures session is closed even on errors
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """
    Create all tables on startup.
    In production, use Alembic migrations instead.
    This is here as a fallback for development.
    """
    from app.models import base  # noqa: F401 - Import all models to register them
    from app.models.base import Base

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)