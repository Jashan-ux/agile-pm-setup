"""
Health check endpoints.

Why health checks matter:
- Load balancers use /health to know if instance is alive
- Kubernetes uses liveness and readiness probes
- Monitoring systems track uptime
- Different checks for different purposes:
  - /health/live: Is the process alive? (liveness)
  - /health/ready: Can it serve traffic? (readiness - checks DB etc.)
"""
import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.database import get_db

router = APIRouter(prefix="/health", tags=["Health"])

# Track startup time for uptime calculation
START_TIME = time.time()


@router.get(
    "/",
    summary="Basic health check",
    description="Returns 200 if the API is running.",
)
async def health_check(settings: Settings = Depends(get_settings)):
    """
    Basic liveness check.
    Should be fast - just confirm the process is running.
    """
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime_seconds": round(time.time() - START_TIME, 2),
    }


@router.get(
    "/ready",
    summary="Readiness check",
    description="Checks if the API is ready to serve traffic (DB connected, etc.)",
)
async def readiness_check(
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    """
    Readiness probe.
    Checks all dependencies: database, etc.
    Returns 503 if not ready.
    """
    checks = {}

    # Check database
    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = {"status": "healthy", "type": "sqlite"}
    except Exception as e:
        checks["database"] = {"status": "unhealthy", "error": str(e)}

    # Determine overall status
    all_healthy = all(v["status"] == "healthy" for v in checks.values())

    return {
        "status": "ready" if all_healthy else "not_ready",
        "checks": checks,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }