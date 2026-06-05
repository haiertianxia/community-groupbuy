"""SQLAlchemy ORM models for the community group-buy platform."""

import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class UserRole(str, enum.Enum):
    BUYER = "buyer"          # 普通用户 (buyer)
    LEADER = "leader"        # 团长 (community leader)
    ADMIN = "admin"          # 管理后台


class ActivityStatus(str, enum.Enum):
    PENDING = "pending"      # 待审核
    ACTIVE = "active"        # 进行中
    SUCCESS = "success"      # 已成团
    FAILED = "failed"        # 未成团（已退款）
    CANCELLED = "cancelled"  # 已取消


class OrderStatus(str, enum.Enum):
    PENDING_PAYMENT = "pending_payment"      # 待支付
    PAID = "paid"                            # 已支付
    GROUP_SUCCESS = "group_success"          # 已成团
    GROUP_FAILED = "group_failed"            # 未成团
    SHIPPED = "shipped"                      # 已发货
    DELIVERED = "delivered"                  # 已送达
    CONFIRMED = "confirmed"                  # 已确认收货
    CANCELLED = "cancelled"                  # 已取消
    REFUNDING = "refunding"                  # 退款中
    REFUNDED = "refunded"                    # 已退款


class DeliveryStatus(str, enum.Enum):
    PENDING = "pending"        # 待配送
    SHIPPING = "shipping"      # 配送中
    DELIVERED = "delivered"    # 已送达
    PICKED_UP = "picked_up"    # 已自提


class LeaderStatus(str, enum.Enum):
    PENDING = "pending"     # 待审核
    ACTIVE = "active"       # 已通过
    SUSPENDED = "suspended"  # 已冻结


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(120), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    avatar: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.BUYER, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    leader_profile: Mapped[Optional["CommunityLeader"]] = relationship(
        "CommunityLeader", back_populates="user", uselist=False
    )
    orders: Mapped[list["Order"]] = relationship("Order", back_populates="user")


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    images: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON array of URLs
    original_price: Mapped[float] = mapped_column(Float, nullable=False)
    cost_price: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    unit: Mapped[str] = mapped_column(String(20), nullable=False, default="件")
    stock: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    sales_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")  # active/disabled/deleted
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    rating: Mapped[float] = mapped_column(Float, nullable=False, default=5.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    activities: Mapped[list["GroupBuyActivity"]] = relationship(
        "GroupBuyActivity", back_populates="product"
    )


class CommunityLeader(Base):
    """团长 (community leader) profile linked to a User."""

    __tablename__ = "community_leaders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), unique=True, nullable=False
    )
    community: Mapped[str] = mapped_column(String(200), nullable=False)  # 小区
    district: Mapped[str] = mapped_column(String(100), nullable=False)   # 区域
    address: Mapped[str] = mapped_column(String(500), nullable=False)    # 详细地址
    pickup_address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)  # 自提点
    id_card: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # 身份证号(加密)
    bank_account: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    bank_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[LeaderStatus] = mapped_column(Enum(LeaderStatus), default=LeaderStatus.PENDING)
    commission_rate: Mapped[float] = mapped_column(Float, nullable=False, default=5.0)
    total_earnings: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    total_settled: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="leader_profile")


class GroupBuyActivity(Base):
    """A group-buying activity (团购活动)."""

    __tablename__ = "group_buy_activities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("products.id"), nullable=False, index=True
    )
    leader_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("community_leaders.id"), nullable=False, index=True
    )
    group_price: Mapped[float] = mapped_column(Float, nullable=False)
    min_participants: Mapped[int] = mapped_column(Integer, nullable=False, default=2)
    max_participants: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    current_participants: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    start_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    status: Mapped[ActivityStatus] = mapped_column(
        Enum(ActivityStatus), default=ActivityStatus.PENDING
    )
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    product: Mapped["Product"] = relationship("Product", back_populates="activities")
    orders: Mapped[list["Order"]] = relationship("Order", back_populates="activity")


class Order(Base):
    """Purchase order tied to a group-buy activity."""

    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    order_no: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    activity_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("group_buy_activities.id"), nullable=False, index=True
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    unit_price: Mapped[float] = mapped_column(Float, nullable=False)
    total_amount: Mapped[float] = mapped_column(Float, nullable=False)
    commission_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus), default=OrderStatus.PENDING_PAYMENT
    )
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    refund_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    remark: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="orders")
    activity: Mapped["GroupBuyActivity"] = relationship("GroupBuyActivity", back_populates="orders")
    delivery: Mapped[Optional["Delivery"]] = relationship(
        "Delivery", back_populates="order", uselist=False
    )


class Delivery(Base):
    """Delivery / pickup record for an order."""

    __tablename__ = "deliveries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("orders.id"), unique=True, nullable=False
    )
    delivery_type: Mapped[str] = mapped_column(String(20), nullable=False, default="pickup")  # pickup / home_delivery
    receiver_name: Mapped[str] = mapped_column(String(100), nullable=False)
    receiver_phone: Mapped[str] = mapped_column(String(20), nullable=False)
    address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    status: Mapped[DeliveryStatus] = mapped_column(
        Enum(DeliveryStatus), default=DeliveryStatus.PENDING
    )
    carrier: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    tracking_no: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    delivery_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    pickup_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    order: Mapped["Order"] = relationship("Order", back_populates="delivery")
