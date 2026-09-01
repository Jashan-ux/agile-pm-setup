# Agile Project Management Tool

**Production-Ready Enterprise Backend & Architecture Blueprint**

`FASTAPI` `ASYNC SQLALCHEMY` `CELERY + REDIS` `SQLITE & ALEMBIC` `UV PACKAGE MANAGER`

---

## 1. System Architecture & Overview

The Agile Project Management Tool is a highly scalable, full-stack RESTful application engineered specifically for small, high-velocity agile engineering teams (3–10 users). The backend is architected using FastAPI with fully asynchronous database access via SQLAlchemy 2.0, managed migrations through Alembic, and offloaded heavy processing using Celery backed by Redis.

## 2. Repository Directory Structure

The codebase follows a clean, modular layer-based architecture separating domain models, schema validation, business logic services, and HTTP router endpoints.

| COMPONENT | TECHNOLOGY | PURPOSE & ENGINEERING CHOICE |
|---|---|---|
| Framework | FastAPI (Python 3.11+) | High throughput, auto-generated OpenAPI documentation, strict Pydantic validation. |
| Database Layer | SQLAlchemy Async + SQLite | Non-blocking I/O operations, declarative models, clean unit-testing support. |
| Package Manager | uv (Astral) | Sub-second dependency resolution, deterministic lockfiles, extremely fast CI builds. |
| Task Worker | Celery + Redis Broker | Asynchronous workflow processing, scheduled periodic jobs, exponential backoff retries. |
| Migrations | Alembic | Strict version control for database schemas with auto-generation capabilities. |

```
agile-pm-tool/
├── .gitignore
├── README.md
├── docker-compose.yml
├── docs/
│   └── architecture.md
├── scripts/
│   └── seed_db.py
├── frontend/                  # React + TypeScript App (Sprint 4+)
└── backend/
    ├── .env.example
    ├── pyproject.toml         # uv project configuration
    ├── alembic.ini
    ├── alembic/
    │   ├── env.py
    │   └── versions/
    ├── tests/
    │   ├── unit/
    │   └── integration/
    └── app/
        ├── __init__.py
        ├── main.py             # FastAPI application entrypoint (Lifespan & Factory)
        ├── api/
        │   ├── __init__.py
        │   └── v1/
        │       ├── router.py   # Main v1 API Aggregator Router
        │       └── endpoints/
        │           ├── health.py
        │           ├── projects.py
        │           ├── stories.py
        │           └── tasks.py
        ├── core/
        │   ├── config.py       # Pydantic BaseSettings management
        │   ├── database.py     # Async Engine & SessionMaker
        │   ├── security.py     # Authentication & hashing utilities
        │   └── exceptions.py   # Global custom exception handlers
        ├── models/             # SQLAlchemy 2.0 Declarative Base Models
        │   ├── base.py
        │   ├── project.py
        │   ├── user_story.py
        │   └── task.py
        ├── schemas/            # Pydantic v2 validation models
        │   ├── common.py       # Generic response wrappers & pagination
        │   ├── project.py
        │   ├── user_story.py
        │   └── task.py
        ├── services/           # Core business logic layer
        │   ├── project_service.py
        │   ├── story_service.py
        │   └── task_service.py
        ├── workers/            # Celery background tasks & schedules
        │   └── background_tasks.py
        └── utils/
            └── pagination.py
```

## 3. Getting Started & Setup Guide

### Option A: Local Development with uv

```bash
# 1. Clone Repository & Navigate to Backend
git clone <repository-url>
cd agile-pm-setup/backend

# 2. Sync Dependencies via uv
uv sync

# 3. Activate Virtual Environment
source .venv/bin/activate  # macOS/Linux
# .venv\Scripts\activate   # Windows

# 4. Environment Configuration
cp .env.example .env

# 5. Apply Database Migrations
alembic upgrade head

# 6. Run API Development Server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Option B: Docker Compose Development

```bash
# Build & start all services (FastAPI, Redis, Celery Worker, Flower)
docker-compose up --build -d
```

## 4. Sprint Implementation Breakdown

### Sprint 1: Core Foundation & Architecture Setup

**Key Technical Decisions & Architectural Rationales:**

- **UUID Primary Keys**: Prevents sequential ID enumeration attacks, facilitates distributed node generation without collisions, and allows backend services to assign IDs prior to database persistence.
- **Async SQLAlchemy**: Aligns perfectly with FastAPI's event loop to maximize system throughput under concurrent I/O load.
- **Pydantic Settings**: Enforces environment variable type validation at boot time, throwing immediate startup errors for missing configurations.
- **Application Factory & Lifespan Handlers**: Modern FastAPI lifecycle hooks ensuring clean resource allocation (database connection pools) and graceful teardown during server shutdowns.

### Sprint 2: Schemas, Service Layer & CRUD APIs

Sprint 2 established strict request/response isolation using layered architecture:

```
HTTP Request ──► Router (Endpoints) ──► Pydantic Schemas (Validation) ──► Service Layer (Business Logic) ──► SQLAlchemy Models (DB)
HTTP Response ◄── Pydantic Serializer ◄──────────────────────────────────────────────────────────────────────┘
```

| Method | Endpoint URI | Description |
|---|---|---|
| POST | `/api/v1/projects/` | Create project entity |
| GET | `/api/v1/projects/?page=1&page_size=20` | List projects (Paginated & Filtered) |
| GET | `/api/v1/projects/{id}` | Retrieve single project details |
| PATCH | `/api/v1/projects/{id}` | Update existing project attributes |
| DELETE | `/api/v1/projects/{id}` | Delete project & cascading items |
| POST | `/api/v1/projects/{pid}/stories/` | Create user story under project |
| GET | `/api/v1/projects/{pid}/stories/` | List user stories for a project |
| POST | `/api/v1/projects/{pid}/stories/{sid}/tasks/` | Create task under user story |
| GET | `/api/v1/projects/{pid}/stories/{sid}/tasks/` | List tasks for specific story |

### Sprint 3: Async Background Workers & Job Subsystem

Implemented long-running task offloading using Celery workers backed by a Redis message broker.

```
Client          FastAPI App        Redis Broker       Celery Worker
  │                   │                  │                   │
  │── POST /reports/ ─►│                  │                   │
  │                   │──── Enqueue Task ─────►│              │
  │◄── 202 Accepted ──│                  │                   │
  │   (job_id returned)│                  │─── Worker Picks Up ──►│
  │                   │                  │                   │── Process Report
  │                   │                  │                   │── Update DB Status
  │── GET /jobs/{id} ─►│                  │                   │
  │◄── Status: COMPLETED ─│              │                   │
```

**Implemented Background Services & Workflows:**

- **Project Summary Report Generation**: Compiles comprehensive markdown analysis of sprint performance asynchronously without blocking user requests.
- **Stale Task Notifications**: Automated periodic Celery Beat job detecting tasks lingering in progress past established threshold windows.
- **Story Auto-Completion Suggestions**: Triggers completion checks when all linked sub-tasks transition to done.
- **Resilience & Graceful Degradation**: Exponential backoff retry policies (2s, 4s, 8s backoff with jitter). If Celery or Redis experiences downtime, the primary API continues serving CRUD operations without failing.

## 5. Testing, Verification & Tooling

```bash
# Execute Suite of Unit & Integration Tests
cd backend
pytest -v --cov=app tests/

# Code Formatting & Linting (Ruff)
ruff check .
ruff format .

# Database Migrations Lifecycle
alembic revision --autogenerate -m "Add new indices"
alembic upgrade head
```

**Interactive Documentation Links**

- Swagger UI: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc
- Flower: http://localhost:5555
