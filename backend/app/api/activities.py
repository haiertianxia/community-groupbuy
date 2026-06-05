"""Group-buy activity routes: create, list, detail."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import get_db
from app.deps import get_current_admin, get_current_user
from app.models import ActivityStatus, GroupBuyActivity, Product, User
from app.schemas import ActivityCreate, ActivityOut

router = APIRouter(prefix="/api/activities", tags=["Activities"])


@router.get("", response_model=dict)
async def list_activities(
    status_filter: str = Query(None, alias="status", description="Filter by status"),
    category: str = Query(None, max_length=50),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List group-buy activities with optional status/category filters."""
    query = (
        select(GroupBuyActivity)
        .options(joinedload(GroupBuyActivity.product))
    )

    if status_filter:
        query = query.where(GroupBuyActivity.status == status_filter)

    # Count
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    # Paginate
    query = (
        query
        .order_by(GroupBuyActivity.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    items = result.unique().scalars().all()

    return {
        "items": [ActivityOut.model_validate(a) for a in items],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.get("/{activity_id}", response_model=ActivityOut)
async def get_activity(activity_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single group-buy activity with product details."""
    result = await db.execute(
        select(GroupBuyActivity)
        .options(joinedload(GroupBuyActivity.product))
        .where(GroupBuyActivity.id == activity_id)
    )
    activity = result.unique().scalar_one_or_none()
    if not activity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")
    return activity


@router.post("", response_model=ActivityOut, status_code=status.HTTP_201_CREATED)
async def create_activity(
    payload: ActivityCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Create a new group-buy activity (admin only)."""
    # Verify product exists
    result = await db.execute(select(Product).where(Product.id == payload.product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    # Validate time range
    now = datetime.now(timezone.utc)
    if payload.start_time >= payload.end_time:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="start_time must be before end_time")
    if payload.end_time <= now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="end_time must be in the future")

    activity = GroupBuyActivity(
        product_id=payload.product_id,
        leader_id=payload.leader_id,
        group_price=payload.group_price,
        min_participants=payload.min_participants,
        max_participants=payload.max_participants,
        start_time=payload.start_time,
        end_time=payload.end_time,
        description=payload.description,
        status=ActivityStatus.ACTIVE,
    )
    db.add(activity)
    await db.commit()

    # Re-fetch with eager-loaded relationships
    result = await db.execute(
        select(GroupBuyActivity)
        .options(joinedload(GroupBuyActivity.product))
        .where(GroupBuyActivity.id == activity.id)
    )
    activity = result.unique().scalar_one()
    return activity


@router.post("/{activity_id}/close", response_model=ActivityOut)
async def close_activity(
    activity_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Manually close / cancel an activity (admin only)."""
    result = await db.execute(
        select(GroupBuyActivity)
        .options(joinedload(GroupBuyActivity.product))
        .where(GroupBuyActivity.id == activity_id)
    )
    activity = result.unique().scalar_one_or_none()
    if not activity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")

    activity.status = ActivityStatus.CANCELLED
    await db.commit()

    # Re-fetch with eager-loaded relationships
    result = await db.execute(
        select(GroupBuyActivity)
        .options(joinedload(GroupBuyActivity.product))
        .where(GroupBuyActivity.id == activity.id)
    )
    activity = result.unique().scalar_one()
    return activity
