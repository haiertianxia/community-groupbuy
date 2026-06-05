"""Seed the database with initial test data."""

import asyncio

from app.core.security import hash_password
from app.database import Base, async_session_factory, engine
from app.models import (
    ActivityStatus,
    CommunityLeader,
    GroupBuyActivity,
    LeaderStatus,
    Product,
    User,
    UserRole,
)


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as session:
        # Admin user
        admin = User(
            username="admin",
            email="admin@groupbuy.com",
            hashed_password=hash_password("admin123"),
            role=UserRole.ADMIN,
        )
        session.add(admin)

        # Sample product
        product = Product(
            name="Organic Fuji Apples (5kg box)",
            description="Fresh organic apples from Shaanxi province. Sweet and crisp.",
            category="fruit",
            original_price=59.9,
            cost_price=30.0,
            stock=200,
            unit="box",
        )
        session.add(product)

        await session.commit()
        print("✅ Seed data created:")
        print(f"   Admin: admin@groupbuy.com / admin123")
        print(f"   Product: Organic Fuji Apples (id={product.id})")


if __name__ == "__main__":
    asyncio.run(seed())
