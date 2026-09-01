"""
Main API v1 router - assembles all endpoint routers.
"""
from fastapi import APIRouter

from app.api.v1.endpoints import health, projects, stories, tasks

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(projects.router)
api_router.include_router(stories.router)
api_router.include_router(tasks.router)