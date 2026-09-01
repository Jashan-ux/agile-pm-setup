"""
Main API v1 router.
Assembles all endpoint routers into one.
"""
from fastapi import APIRouter

from app.api.v1.endpoints import health

api_router = APIRouter()

# Health checks
api_router.include_router(health.router)

# Domain routers (will add in Sprint 2)
# api_router.include_router(projects.router)
# api_router.include_router(stories.router)
# api_router.include_router(tasks.router)