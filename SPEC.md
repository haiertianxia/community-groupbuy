# 🛒 Community GroupBuy Platform — SPEC

## Overview

A **community group-buying platform** (社区团购平台) enabling community residents to buy together for better prices. Community leaders (团长) organize group-buying activities in their neighborhoods; the platform takes a commission on each transaction.

**Inspired by:** Meituan Select (美团优选), Kaola (考拉), Pinduoduo (拼多多)

---

## 1. Target Users

| Role | Description |
|------|-------------|
| **Buyer (普通用户)** | Community residents who join group-buy activities to get discounted prices |
| **Leader (团长)** | Community organizers who set up pickup points, distribute goods, earn commissions |
| **Admin (管理后台)** | Platform operators who manage products, activities, users, and overall operations |

---

## 2. Core Features

### 2.1 User Management
- User registration & login (email/password)
- JWT-based authentication
- Role-based access control (buyer / leader / admin)
- Profile management

### 2.2 Product Management
- Product CRUD (admin only)
- Categories (e.g., fresh produce, daily essentials, snacks)
- Stock tracking & sales count
- Product images & descriptions

### 2.3 Group-Buy Activities (团购活动)
- Admin creates activities tied to a product
- Each activity has a group price, min/max participants, start/end times
- Auto-detect when minimum participants reached → group success
- Activity status lifecycle: pending → active → success / failed / cancelled

### 2.4 Order Management
- Users place orders against active group-buy activities
- Order status lifecycle:
  pending_payment → paid → group_success → shipped → delivered → confirmed
- Cancel orders, request refunds
- Unique order number generation

### 2.5 Leader (团长) System
- User applies to become a leader (pending review)
- Leaders manage orders for their activities
- Leaders ship orders to customers
- Leaders have commission rates and earnings tracking

### 2.6 Delivery Management
- Support home delivery and pickup at community points
- Tracking delivery status (pending → shipping → delivered / picked_up)
- Pickup codes for self-collection

### 2.7 Payment & Commission
- Platform commission rate (configurable, e.g., 5%)
- Commission calculated per order
- No real payment gateway integration (simulated payment on order creation)

### 2.8 Statistics Dashboard
- Platform-wide stats: users, products, orders, revenue
- Leader-specific stats: orders, earnings
- Pending reviews (leaders, activities)

---

## 3. Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | FastAPI (Python 3.12) |
| **ORM** | SQLAlchemy 2.0 (async) |
| **Database** | SQLite (via aiosqlite) |
| **Auth** | JWT (python-jose + passlib/bcrypt) |
| **Validation** | Pydantic v2 |
| **Server** | Uvicorn |
| **Container** | Docker / docker-compose |

---

## 4. File Structure

```
community-groupbuy/
├── SPEC.md                          # This specification
├── README.md                        # Project overview
├── docker-compose.yml               # Docker orchestration
│
├── backend/                         # FastAPI backend
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env.example
│   └── app/
│       ├── __init__.py
│       ├── main.py                  # FastAPI app entry
│       ├── database.py              # Async engine & session
│       ├── models.py                # SQLAlchemy ORM models
│       ├── schemas.py               # Pydantic request/response schemas
│       ├── deps.py                  # FastAPI dependencies (auth, pagination)
│       ├── core/
│       │   ├── __init__.py
│       │   ├── config.py            # Settings from env
│       │   └── security.py          # JWT & password utilities
│       └── api/
│           ├── __init__.py
│           ├── auth.py              # Register, login, me
│           ├── products.py          # Product CRUD
│           ├── activities.py        # Group-buy activities
│           ├── orders.py            # Order management
│           ├── leader.py            # Leader registration & orders
│           └── stats.py             # Dashboard statistics
│
├── backend-go/                      # (Legacy Go implementation)
├── frontend-c/                      # (C端小程序 — Taro)
├── frontend-b/                      # (B端团长小程序 — Taro)
├── admin/                           # (PC管理后台 — React)
├── docs/                            # Documentation
├── sql/                             # SQL scripts
├── tests/                           # Test files
└── scripts/                         # Utility scripts
```

---

## 5. Data Model (ERD)

### Tables

| Table | Description | Key Fields |
|-------|-------------|------------|
| `users` | Platform users | id, username, email, hashed_password, role, phone |
| `products` | Products for sale | id, name, category, original_price, cost_price, stock |
| `community_leaders` | 团长 profiles | id, user_id, community, district, status, commission_rate |
| `group_buy_activities` | 团购 activities | id, product_id, leader_id, group_price, min/max_participants, start/end_time |
| `orders` | Purchase orders | id, order_no, user_id, activity_id, quantity, total_amount, status |
| `deliveries` | Delivery/pickup | id, order_id, delivery_type, status, tracking_no, pickup_code |

### Key Relationships
- `User` 1:1 `CommunityLeader` (optional, only for leaders)
- `User` 1:N `Order`
- `Product` 1:N `GroupBuyActivity`
- `GroupBuyActivity` 1:N `Order`
- `Order` 1:1 `Delivery`

---

## 6. API Reference

All endpoints return JSON. Auth endpoints are public; others require a Bearer JWT token.

### 6.1 Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health check |

### 6.2 Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | No | Register a new user |
| POST | `/api/auth/login` | No | Login, returns JWT token |
| GET | `/api/auth/me` | Bearer | Get current user profile |

### 6.3 Products

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/products` | Optional | List active products (filter: `category`, `search`, `page`, `page_size`) |
| GET | `/api/products/{id}` | Optional | Get product details |
| POST | `/api/products` | Admin | Create product |
| PUT | `/api/products/{id}` | Admin | Update product |
| DELETE | `/api/products/{id}` | Admin | Soft-delete product |

### 6.4 Group-Buy Activities

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/activities` | Optional | List activities (filter: `status`, `page`, `page_size`) |
| GET | `/api/activities/{id}` | Optional | Get activity with product details |
| POST | `/api/activities` | Admin | Create activity |
| POST | `/api/activities/{id}/close` | Admin | Cancel/close activity |

### 6.5 Orders

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/orders` | Bearer | Create order (auto-marks paid for simplicity) |
| GET | `/api/orders` | Bearer | List user's orders (filter: `status`, `page`, `page_size`) |
| GET | `/api/orders/{id}` | Bearer | Get order detail |
| PUT | `/api/orders/{id}` | Bearer | Update order status (cancel/refund/confirm) |

### 6.6 Leader (团长)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/leader/register` | Bearer | Register as community leader |
| GET | `/api/leader/profile` | Bearer | Get leader profile |
| GET | `/api/leader/orders` | Bearer | List orders for leader's activities |
| POST | `/api/leader/orders/{id}/ship` | Leader | Mark order as shipped |

### 6.7 Stats

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/stats/overview` | Bearer | Platform-wide statistics dashboard |

---

## 7. Business Rules

### Group-Buy Flow
1. Admin creates activity: `product + group_price + min/max_participants + time window`
2. Users browse activities and place orders (auto-marked paid)
3. Each order increments `current_participants`
4. When `current_participants >= min_participants` → status becomes `success`
5. Leader ships orders after group succeeds
6. User confirms receipt → order complete

### Commission
- Platform commission: 5% of order total (configurable via `COMMISSION_RATE`)
- Commission tracked per order in `commission_amount`

### Order States
```
pending_payment → paid → group_success → shipped → delivered → confirmed
                    ↓         ↓                               ↓
                cancelled   group_failed                   refunding → refunded
```

---

## 8. Running Locally

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

### With Docker

```bash
docker-compose up --build
```

The API will be available at `http://localhost:8000`.  
Interactive docs at `http://localhost:8000/docs`.

---

## 9. TODO / Future Work

- [ ] **Real payment integration** (WeChat Pay / Alipay)
- [ ] **Image upload** (local or S3/OSS)
- [ ] **SMS / email notifications** for order updates
- [ ] **Real-time group-buy status** via WebSocket
- [ ] **Admin approval workflows** for leaders and activities
- [ ] **Scheduled job** to auto-close expired activities and trigger group-failed refunds
- [ ] **Automatic settlement** to leaders after order confirmation
- [ ] **Rate limiting & API security hardening**
- [ ] **Comprehensive test suite** (unit + integration)
- [ ] **Frontend** (mini-program / web app)
- [ ] **Database migrations** (Alembic)
- [ ] **Production deployment** (PostgreSQL, Nginx, systemd)
- [ ] **Multi-language support**
