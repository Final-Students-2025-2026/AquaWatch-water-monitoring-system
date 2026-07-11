# ============================================================
# AQUAWATCH SYSTEM BACKEND
# FastAPI + Neon PostgreSQL Backend
# ============================================================

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from auth import get_password_hash
from config import DEFAULT_ORGANIZATION_ID
from database import db_pool, create_pool, close_pool, initialize_schema

from routers import auth, devices, readings, alerts, thresholds, settings, dashboard, websocket


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting backend...")

    await create_pool()

    # Initialize database schema
    await initialize_schema()

    # Ensure default organization and admin user exist
    async with db_pool.acquire() as conn:
        await conn.execute("""
            INSERT INTO organizations (organization_id, organization_name, organization_type)
            VALUES ($1, 'Default Organization', 'water_monitoring')
            ON CONFLICT (organization_id) DO NOTHING
        """, DEFAULT_ORGANIZATION_ID)

        default_hash = get_password_hash("admin123")
        await conn.execute("""
            INSERT INTO users (user_id, organization_id, username, password_hash, role, is_active)
            VALUES (1, $1, 'admin', $2, 'administrator', TRUE)
            ON CONFLICT (username) DO NOTHING
        """, DEFAULT_ORGANIZATION_ID, default_hash)

        logger.info("Default admin user ensured")

    yield

    await close_pool()


app = FastAPI(
    title="Water Health Monitoring API",
    description="Backend API for ESP32 Water Monitoring System",
    version="2.0.0",
    lifespan=lifespan
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update with your Vercel frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["System"])
async def root():
    return {
        "message": "Water Health Monitoring API",
        "version": "2.0.0",
        "docs": "/docs"
    }


# Register routers
app.include_router(auth.router)
app.include_router(devices.router)
app.include_router(readings.router)
app.include_router(alerts.router)
app.include_router(thresholds.router)
app.include_router(settings.router)
app.include_router(dashboard.router)
app.include_router(websocket.router)
