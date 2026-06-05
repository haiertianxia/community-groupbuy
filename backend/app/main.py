"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database import Base, engine
from app.models import (  # noqa: F401 – ensure models are imported for table creation
    ActivityStatus,
    CommunityLeader,
    Delivery,
    DeliveryStatus,
    GroupBuyActivity,
    LeaderStatus,
    Order,
    OrderStatus,
    Product,
    User,
    UserRole,
)

# Import routers
from app.api import auth, activities, leader, orders, products, stats


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create all tables on startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Cleanup would go here
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    lifespan=lifespan,
)

# CORS – allow all origins in dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(activities.router)
app.include_router(orders.router)
app.include_router(leader.router)
app.include_router(stats.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "community-groupbuy-api"}
