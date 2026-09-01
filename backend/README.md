# Agile Project Management Tool

A full-stack web application for managing projects for small agile teams (3–10 users).

## Architecture
agile-pm-tool/
├── backend/ # FastAPI + SQLAlchemy + SQLite
├── frontend/ # React + TypeScript (Sprint 4+)
├── docs/ # Architecture and API docs
└── docker-compose.yml

text


**Stack:**
- **Backend:** FastAPI, SQLAlchemy (async), SQLite, Alembic, Celery, Redis
- **Frontend:** React, TypeScript (coming Sprint 4)
- **Background Tasks:** Celery + Redis
- **Package Manager:** uv

## Quick Start

### Prerequisites
- Python 3.11+
- uv (`curl -LsSf https://astral.sh/uv/install.sh | sh`)
- Docker & Docker Compose (optional but recommended)

### Local Development (without Docker)

```bash
# 1. Clone the repository
git clone <repo-url>
cd agile-pm-tool/backend

# 2. Install dependencies
uv sync

# 3. Activate virtual environment
source .venv/bin/activate  # macOS/Linux
# .venv\Scripts\activate   # Windows

# 4. Set up environment
cp .env.example .env
# Edit .env with your settings

# 5. Run database migrations
alembic upgrade head

# 6. Start the API server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
Docker Development
Bash

docker-compose up --build
API Documentation
Once running, visit:

Swagger UI: http://localhost:8000/api/docs
ReDoc: http://localhost:8000/api/redoc
Health Check: http://localhost:8000/api/v1/health
Development
Bash

# Run tests
cd backend
pytest

# Format code
ruff format .

# Lint code  
ruff check .

# Create a new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head
text


---

## Step 14: Verify Everything Works

```bash
cd backend

# Make sure venv is active
source .venv/bin/activate

# Run migrations
alembic upgrade head

# Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
Visit http://localhost:8000/api/docs - You should see the Swagger UI!

Test the health endpoint:

Bash

curl http://localhost:8000/api/v1/health/
curl http://localhost:8000/api/v1/health/ready
