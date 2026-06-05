"""Stats routes: dashboard overview."""

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models import (
    ActivityStatus,
    CommunityLeader,
    GroupBuyActivity,
    LeaderStatus,
    Order,
    OrderStatus,
    Product,
    User,
)
from app.schemas import StatsOverview

router = APIRouter(prefix="/api/stats", tags=["Stats"])


@router.get("/overview", response_model=StatsOverview)
async def get_stats_overview(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get platform-wide statistics overview."""
    # Total users
    total_users = (
        await db.execute(select(func.count(User.id)).where(User.is_deleted == False))
    ).scalar() or 0

    # Total products
    total_products = (
        await db.execute(select(func.count(Product.id)).where(Product.status == "active"))
    ).scalar() or 0

    # Total activities
    total_activities = (
        await db.execute(select(func.count(GroupBuyActivity.id)))
    ).scalar() or 0

    # Total orders
    total_orders = (
        await db.execute(select(func.count(Order.id)))
    ).scalar() or 0

    # Total revenue (sum of all paid/confirmed orders)
    total_revenue_result = await db.execute(
        select(func.coalesce(func.sum(Order.total_amount), 0)).where(
            Order.status.in_([
                OrderStatus.PAID.value,
                OrderStatus.GROUP_SUCCESS.value,
                OrderStatus.SHIPPED.value,
                OrderStatus.DELIVERED.value,
                OrderStatus.CONFIRMED.value,
            ])
        )
    )
    total_revenue = float(total_revenue_result.scalar() or 0)

    # Active leaders
    active_leaders = (
        await db.execute(
            select(func.count(CommunityLeader.id)).where(
                CommunityLeader.status == LeaderStatus.ACTIVE
            )
        )
    ).scalar() or 0

    # Pending leaders
    pending_leaders = (
        await db.execute(
            select(func.count(CommunityLeader.id)).where(
                CommunityLeader.status == LeaderStatus.PENDING
            )
        )
    ).scalar() or 0

    # Pending activities
    pending_activities = (
        await db.execute(
            select(func.count(GroupBuyActivity.id)).where(
                GroupBuyActivity.status == ActivityStatus.PENDING
            )
        )
    ).scalar() or 0

    # Today's orders
    today_orders = (
        await db.execute(
            select(func.count(Order.id)).where(
                func.date(Order.created_at) == func.current_date()
            )
        )
    ).scalar() or 0

    return StatsOverview(
        total_users=total_users,
        total_products=total_products,
        total_activities=total_activities,
        total_orders=total_orders,
        total_revenue=total_revenue,
        active_leaders=active_leaders,
        pending_leaders=pending_leaders,
        pending_activities=pending_activities,
        today_orders=today_orders,
    )
