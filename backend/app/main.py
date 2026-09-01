"""
FastAPI application factory.

This is the entry point for the backend.
Responsible for:
1. Creating the FastAPI app instance
2. Configuring middleware
3. Registering routers
4. Setting up startup/shutdown events
5. Configuring exception handlers
"""
import logging
import time
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import init_db
from app.core.exceptions import (
    AppError,
    BusinessRuleError,
    ConflictError,
    NotFoundError,
    ValidationError,
)

# ─── Logging Setup ────────────────────────────────────────────────────────────
# Configure logging before anything else
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# ─── Lifespan ─────────────────────────────────────────────────────────────────
# The lifespan context manager handles startup and shutdown.
# This is the modern FastAPI way (replaces @app.on_event decorators).
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan handler.
    Code before `yield` runs on startup.
    Code after `yield` runs on shutdown.
    """
    # ── Startup ──────────────────────────────────────────────────────────────
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")

    # Initialize database (create tables if they don't exist)
    await init_db()
    logger.info("Database initialized")

    yield  # ← Application runs here

    # ── Shutdown ──────────────────────────────────────────────────────────────
    logger.info(f"Shutting down {settings.APP_NAME}")


# ─── App Factory ──────────────────────────────────────────────────────────────
def create_application() -> FastAPI:
    """
    Factory function that creates and configures the FastAPI application.
    Using a factory function makes testing easier (can create fresh app per test).
    """
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="""
        ## Agile Project Management Tool API

        Manage projects, user stories, and tasks for small agile teams.

        ### Hierarchy
        **Project** → **User Story** → **Task**

        ### Features
        - Create and manage projects
        - Track user stories with priorities and story points
        - Manage tasks with time estimates
        - Background job processing
        """,
        docs_url="/api/docs",          # Swagger UI
        redoc_url="/api/redoc",        # ReDoc UI
        openapi_url="/api/openapi.json",
        lifespan=lifespan,
    )

    # ── Middleware ────────────────────────────────────────────────────────────
    _configure_middleware(app)

    # ── Routers ───────────────────────────────────────────────────────────────
    _configure_routers(app)

    # ── Exception Handlers ────────────────────────────────────────────────────
    _configure_exception_handlers(app)

    return app


def _configure_middleware(app: FastAPI) -> None:
    """Configure all middleware."""

    # CORS - Must be first middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Request timing middleware
    @app.middleware("http")
    async def add_process_time_header(request: Request, call_next):
        """Add X-Process-Time header to all responses."""
        start_time = time.perf_counter()
        response = await call_next(request)
        process_time = time.perf_counter() - start_time
        response.headers["X-Process-Time"] = f"{process_time:.4f}s"
        return response

    # Request ID middleware
    @app.middleware("http")
    async def add_request_id(request: Request, call_next):
        """Add unique request ID for tracing."""
        import uuid
        request_id = str(uuid.uuid4())[:8]
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


def _configure_routers(app: FastAPI) -> None:
    """Register all API routers."""
    from app.api.v1.router import api_router
    app.include_router(api_router, prefix="/api/v1")


def _configure_exception_handlers(app: FastAPI) -> None:
    """
    Global exception handlers.
    Convert domain exceptions to proper HTTP responses.

    This is the boundary between business logic and HTTP protocol.
    Services throw domain exceptions, here we convert them.
    """

    @app.exception_handler(NotFoundError)
    async def not_found_handler(request: Request, exc: NotFoundError):
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "error": "not_found",
                "message": exc.message,
                "details": exc.details,
            },
        )

    @app.exception_handler(ValidationError)
    async def validation_error_handler(request: Request, exc: ValidationError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": "validation_error",
                "message": exc.message,
                "details": exc.details,
            },
        )

    @app.exception_handler(ConflictError)
    async def conflict_handler(request: Request, exc: ConflictError):
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "error": "conflict",
                "message": exc.message,
                "details": exc.details,
            },
        )

    @app.exception_handler(BusinessRuleError)
    async def business_rule_handler(request: Request, exc: BusinessRuleError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": "business_rule_violation",
                "message": exc.message,
                "details": exc.details,
            },
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        """Catch-all handler. Never expose internal errors in production."""
        logger.exception(f"Unhandled exception: {exc}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "internal_server_error",
                "message": "An unexpected error occurred"
                if settings.is_production
                else str(exc),
            },
        )


# ─── Create App Instance ───────────────────────────────────────────────────────
app = create_application()