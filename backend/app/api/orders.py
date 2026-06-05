"""Order routes: create, list, update, cancel."""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import get_db
from app.deps import get_current_user
from app.models import (
    ActivityStatus,
    Delivery,
    DeliveryStatus,
    GroupBuyActivity,
    Order,
    OrderStatus,
    User,
)
from app.schemas import DeliveryOut, OrderCreate, OrderOut, OrderUpdate

router = APIRouter(prefix="/api/orders", tags=["Orders"])


def _generate_order_no() -> str:
    """Generate a unique order number."""
    ts = datetime.now().strftime("%Y%m%d%H%M%S")
    suffix = uuid.uuid4().hex[:8].upper()
    return f"GB{ts}{suffix}"


@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
async def create_order(
    payload: OrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new order for a group-buy activity."""
    # Validate activity
    result = await db.execute(
        select(GroupBuyActivity)
        .options(joinedload(GroupBuyActivity.product))
        .where(GroupBuyActivity.id == payload.activity_id)
    )
    activity = result.unique().scalar_one_or_none()
    if not activity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")

    if activity.status != ActivityStatus.ACTIVE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Activity is not active")

    now = datetime.now(timezone.utc)
    if now.replace(tzinfo=None) < activity.start_time or now.replace(tzinfo=None) > activity.end_time:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Activity is not within the valid time range")

    if activity.current_participants >= activity.max_participants:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Activity has reached max participants")

    total_amount = activity.group_price * payload.quantity
    commission_amount = round(total_amount * 0.05, 2)  # 5% platform fee

    order = Order(
        order_no=_generate_order_no(),
        user_id=current_user.id,
        activity_id=payload.activity_id,
        quantity=payload.quantity,
        unit_price=activity.group_price,
        total_amount=total_amount,
        commission_amount=commission_amount,
        remark=payload.remark,
        status=OrderStatus.PAID,  # Auto-mark paid for simplicity (no real payment gateway)
        paid_at=now,
    )
    db.add(order)
    await db.flush()

    # Create delivery record
    delivery = Delivery(
        order_id=order.id,
        delivery_type=payload.delivery_type,
        receiver_name=payload.receiver_name,
        receiver_phone=payload.receiver_phone,
        address=payload.address,
    )
    db.add(delivery)

    # Increment participant count
    activity.current_participants += 1

    # Auto-check if group is successful
    if activity.current_participants >= activity.min_participants and activity.status == ActivityStatus.ACTIVE:
        activity.status = ActivityStatus.SUCCESS

    # Auto-check product sales count
    if activity.product:
        activity.product.sales_count += payload.quantity

    await db.commit()

    # Re-fetch with eager-loaded relationships
    result = await db.execute(
        select(Order)
        .options(joinedload(Order.activity).joinedload(GroupBuyActivity.product))
        .where(Order.id == order.id)
    )
    order = result.unique().scalar_one()
    return order


@router.get("", response_model=dict)
async def list_orders(
    status_filter: str = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List orders for the current user."""
    query = (
        select(Order)
        .options(joinedload(Order.activity).joinedload(GroupBuyActivity.product))
        .where(Order.user_id == current_user.id)
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


@router.get("/{order_id}", response_model=OrderOut)
async def get_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific order."""
    result = await db.execute(
        select(Order)
        .options(joinedload(Order.activity).joinedload(GroupBuyActivity.product))
        .where(Order.id == order_id, Order.user_id == current_user.id)
    )
    order = result.unique().scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


@router.put("/{order_id}", response_model=OrderOut)
async def update_order(
    order_id: int,
    payload: OrderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update order status (cancel / request refund)."""
    result = await db.execute(
        select(Order)
        .options(joinedload(Order.activity).joinedload(GroupBuyActivity.product))
        .where(Order.id == order_id, Order.user_id == current_user.id)
    )
    order = result.unique().scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    new_status = payload.status

    if new_status == OrderStatus.CANCELLED.value:
        if order.status not in (OrderStatus.PENDING_PAYMENT, OrderStatus.PAID, OrderStatus.GROUP_FAILED):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Order cannot be cancelled in current status",
            )
        order.status = OrderStatus.CANCELLED
    elif new_status == OrderStatus.REFUNDING.value:
        if order.status != OrderStatus.CONFIRMED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only confirmed orders can request a refund",
            )
        order.status = OrderStatus.REFUNDING
        order.refund_reason = payload.refund_reason
    elif new_status == OrderStatus.CONFIRMED.value:
        if order.status != OrderStatus.DELIVERED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Order must be delivered before confirmation",
            )
        order.status = OrderStatus.CONFIRMED
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status update")

    await db.commit()

    # Re-fetch with eager-loaded relationships
    result = await db.execute(
        select(Order)
        .options(joinedload(Order.activity).joinedload(GroupBuyActivity.product))
        .where(Order.id == order.id)
    )
    order = result.unique().scalar_one()
    return order
