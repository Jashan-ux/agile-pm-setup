"""Main API v1 router."""
from fastapi import APIRouter

from app.api.v1.endpoints import health, jobs, projects, reports, stories, tasks

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(projects.router)
api_router.include_router(stories.router)
api_router.include_router(tasks.router)
api_router.include_router(jobs.router)
api_router.include_router(reports.router)