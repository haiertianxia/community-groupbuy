"""Pydantic v2 schemas for request/response validation."""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class UserRegister(BaseModel):
    username: str = Field(..., min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    phone: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    role: str


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------

class UserOut(BaseModel):
    id: int
    username: str
    email: str
    phone: Optional[str] = None
    avatar: Optional[str] = None
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Product
# ---------------------------------------------------------------------------

class ProductCreate(BaseModel):
    name: str = Field(..., max_length=200)
    description: Optional[str] = None
    category: str = Field(..., max_length=50)
    images: Optional[str] = None
    original_price: float = Field(..., gt=0)
    cost_price: float = Field(default=0.0, ge=0)
    unit: str = "件"
    stock: int = Field(default=0, ge=0)


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    images: Optional[str] = None
    original_price: Optional[float] = None
    cost_price: Optional[float] = None
    unit: Optional[str] = None
    stock: Optional[int] = None
    status: Optional[str] = None


class ProductOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    category: str
    images: Optional[str] = None
    original_price: float
    cost_price: float
    unit: str
    stock: int
    sales_count: int
    status: str
    rating: float
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Community Leader
# ---------------------------------------------------------------------------

class LeaderRegister(BaseModel):
    community: str = Field(..., max_length=200)
    district: str = Field(..., max_length=100)
    address: str = Field(..., max_length=500)
    pickup_address: Optional[str] = None
    id_card: Optional[str] = None
    bank_account: Optional[str] = None
    bank_name: Optional[str] = None


class LeaderOut(BaseModel):
    id: int
    user_id: int
    community: str
    district: str
    address: str
    pickup_address: Optional[str] = None
    status: str
    commission_rate: float
    total_earnings: float
    total_settled: float
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Group Buy Activity
# ---------------------------------------------------------------------------

class ActivityCreate(BaseModel):
    product_id: int
    leader_id: int
    group_price: float = Field(..., gt=0)
    min_participants: int = Field(default=2, ge=2)
    max_participants: int = Field(default=100, ge=1)
    start_time: datetime
    end_time: datetime
    description: Optional[str] = None


class ActivityOut(BaseModel):
    id: int
    product_id: int
    leader_id: int
    group_price: float
    min_participants: int
    max_participants: int
    current_participants: int
    start_time: datetime
    end_time: datetime
    status: str
    description: Optional[str] = None
    created_at: datetime
    product: Optional[ProductOut] = None
    leader: Optional[LeaderOut] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Order
# ---------------------------------------------------------------------------

class OrderCreate(BaseModel):
    activity_id: int
    quantity: int = Field(default=1, ge=1)
    remark: Optional[str] = None
    receiver_name: str = Field(..., max_length=100)
    receiver_phone: str = Field(..., max_length=20)
    address: Optional[str] = None
    delivery_type: str = "pickup"


class OrderUpdate(BaseModel):
    status: Optional[str] = None
    refund_reason: Optional[str] = None


class OrderOut(BaseModel):
    id: int
    order_no: str
    user_id: int
    activity_id: int
    quantity: int
    unit_price: float
    total_amount: float
    commission_amount: float
    status: str
    paid_at: Optional[datetime] = None
    refund_reason: Optional[str] = None
    remark: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    activity: Optional[ActivityOut] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Delivery
# ---------------------------------------------------------------------------

class DeliveryCreate(BaseModel):
    order_id: int
    delivery_type: str = "pickup"
    receiver_name: str
    receiver_phone: str
    address: Optional[str] = None


class DeliveryOut(BaseModel):
    id: int
    order_id: int
    delivery_type: str
    receiver_name: str
    receiver_phone: str
    address: Optional[str] = None
    status: str
    carrier: Optional[str] = None
    tracking_no: Optional[str] = None
    delivery_time: Optional[datetime] = None
    pickup_code: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------

class StatsOverview(BaseModel):
    total_users: int
    total_products: int
    total_activities: int
    total_orders: int
    total_revenue: float
    active_leaders: int
    pending_leaders: int
    pending_activities: int
    today_orders: int


# ---------------------------------------------------------------------------
# Pagination
# ---------------------------------------------------------------------------

class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
    total_pages: int
