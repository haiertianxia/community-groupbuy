"""Leader (团长) routes: register & manage orders."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import get_db
from app.deps import get_current_leader, get_current_user
from app.models import (
    CommunityLeader,
    Delivery,
    DeliveryStatus,
    GroupBuyActivity,
    LeaderStatus,
    Order,
    OrderStatus,
    User,
    UserRole,
)
from app.schemas import LeaderOut, LeaderRegister, OrderOut

router = APIRouter(prefix="/api/leader", tags=["Leader"])


@router.post("/register", response_model=LeaderOut, status_code=status.HTTP_201_CREATED)
async def register_leader(
    payload: LeaderRegister,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Register the current user as a community leader (团长)."""
    # Check if already a leader
    result = await db.execute(
        select(CommunityLeader).where(CommunityLeader.user_id == current_user.id)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already registered as a community leader",
        )

    leader = CommunityLeader(
        user_id=current_user.id,
        community=payload.community,
        district=payload.district,
        address=payload.address,
        pickup_address=payload.pickup_address,
        id_card=payload.id_card,
        bank_account=payload.bank_account,
        bank_name=payload.bank_name,
        status=LeaderStatus.PENDING,
    )
    db.add(leader)

    # Update user role
    result = await db.execute(select(User).where(User.id == current_user.id))
    db_user = result.scalar_one_or_none()
    if db_user:
        db_user.role = UserRole.LEADER

    await db.commit()
    await db.refresh(leader)
    return leader


@router.get("/profile", response_model=LeaderOut)
async def get_leader_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the current user's leader profile."""
    result = await db.execute(
        select(CommunityLeader).where(CommunityLeader.user_id == current_user.id)
    )
    leader = result.scalar_one_or_none()
    if not leader:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leader profile not found")
    return leader


@router.get("/orders", response_model=dict)
async def list_leader_orders(
    status_filter: str = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List orders tied to this leader's activities."""
    leader_result = await db.execute(
        select(CommunityLeader).where(CommunityLeader.user_id == current_user.id)
    )
    leader = leader_result.scalar_one_or_none()
    if not leader:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leader profile not found")

    query = (
        select(Order)
        .options(
            joinedload(Order.activity).joinedload(GroupBuyActivity.product),
            joinedload(Order.user),
        )
        .join(GroupBuyActivity)
        .where(GroupBuyActivity.leader_id == leader.id)
    )

    if status_filter:
        query = query.where(Order.status == status_filter)

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    query = (
        query
        .order_by(Order.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    items = result.unique().scalars().all()

    return {
        "items": [OrderOut.model_validate(o) for o in items],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("/orders/{order_id}/ship", response_model=OrderOut)
async def ship_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark an order as shipped (leader action)."""
    leader_result = await db.execute(
        select(CommunityLeader).where(CommunityLeader.user_id == current_user.id)
    )
    leader = leader_result.scalar_one_or_none()
    if not leader:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leader profile not found")

    result = await db.execute(
        select(Order)
        .options(joinedload(Order.delivery), joinedload(Order.activity))
        .join(GroupBuyActivity)
        .where(Order.id == order_id, GroupBuyActivity.leader_id == leader.id)
    )
    order = result.unique().scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found or not yours")

    if order.status not in (OrderStatus.PAID, OrderStatus.GROUP_SUCCESS):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order cannot be shipped in current status",
        )

    order.status = OrderStatus.SHIPPED
    order.delivery.status = DeliveryStatus.SHIPPING
    await db.commit()
    await db.refresh(order)

    # Reload with joins
    result = await db.execute(
        select(Order)
        .options(joinedload(Order.activity).joinedload(GroupBuyActivity.product))
        .where(Order.id == order_id)
    )
    order = result.unique().scalar_one_or_none()
    return order
