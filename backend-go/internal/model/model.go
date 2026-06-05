package model

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"
)

type BaseModel struct {
	ID        uint64     `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	DeletedAt *time.Time `sql:"index" json:"deleted_at,omitempty"`
}

type JSONArray []string

func (j JSONArray) Value() (driver.Value, error) {
	if len(j) == 0 {
		return "[]", nil
	}
	return json.Marshal(j)
}

func (j *JSONArray) Scan(value interface{}) error {
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}
	return json.Unmarshal(bytes, j)
}

// ============ User ============

type User struct {
	BaseModel
	UID             string     `gorm:"uniqueIndex;size:32" json:"uid"`
	Openid          string     `gorm:"uniqueIndex;size:128" json:"openid"`
	Phone           string     `gorm:"uniqueIndex;size:32" json:"phone"`
	Nickname        string     `gorm:"size:64" json:"nickname"`
	Avatar          string     `gorm:"size:512" json:"avatar"`
	Gender          int8       `gorm:"default:0" json:"gender"`
	UserType        int8       `gorm:"not null;default:1" json:"user_type"`
	Status          int8       `gorm:"not null;default:1" json:"status"`
	GrowthValue     int        `gorm:"not null;default:0" json:"growth_value"`
	Level           int        `gorm:"not null;default:1" json:"level"`
	AvailablePoints int        `gorm:"not null;default:0" json:"available_points"`
	LastLoginAt     *time.Time `json:"last_login_at"`
	LastLoginIP     string     `gorm:"size:64" json:"last_login_ip"`
	Source          string     `gorm:"size:32" json:"source"`
}

func (User) TableName() string { return "users" }

type UserAddress struct {
	ID        uint64     `gorm:"primaryKey" json:"id"`
	UserID    uint64     `gorm:"not null;index" json:"user_id"`
	Consignee string     `gorm:"size:64;not null" json:"consignee"`
	Phone     string     `gorm:"size:32;not null" json:"phone"`
	Province  string     `gorm:"size:32;not null" json:"province"`
	City      string     `gorm:"size:32;not null" json:"city"`
	District  string     `gorm:"size:32;not null" json:"district"`
	Address   string     `gorm:"size:256;not null" json:"address"`
	IsDefault int8       `gorm:"not null;default:0" json:"is_default"`
	Label     string     `gorm:"size:32" json:"label"`
	Longitude *float64   `json:"longitude"`
	Latitude  *float64   `json:"latitude"`
	DeletedAt *time.Time `json:"deleted_at,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

func (UserAddress) TableName() string { return "user_addresses" }

// ============ Leader ============

type Leader struct {
	BaseModel
	UserID         uint64     `gorm:"uniqueIndex" json:"user_id"`
	LeaderNo       string     `gorm:"uniqueIndex;size:32" json:"leader_no"`
	Nickname       string     `gorm:"size:64;not null" json:"nickname"`
	RealName       string     `gorm:"size:64;not null" json:"real_name"`
	Phone          string     `gorm:"size:32;not null" json:"phone"`
	Province       string     `gorm:"size:32;not null" json:"province"`
	City           string     `gorm:"size:32;not null" json:"city"`
	District       string     `gorm:"size:32;not null" json:"district"`
	PickupAddress  string     `gorm:"size:512;not null" json:"pickup_address"`
	PickupPhone    string     `gorm:"size:32;not null" json:"pickup_phone"`
	PickupHours    string     `gorm:"size:128;default:09:00-21:00" json:"pickup_hours"`
	Level          int        `gorm:"not null;default:1" json:"level"`
	MonthlySales   float64    `gorm:"type:decimal(12,2);default:0" json:"monthly_sales"`
	TotalSales     float64    `gorm:"type:decimal(14,2);default:0" json:"total_sales"`
	TotalOrders    int        `gorm:"default:0" json:"total_orders"`
	CommissionRate float64    `gorm:"type:decimal(4,3);default:0.050" json:"commission_rate"`
	Balance        float64    `gorm:"type:decimal(12,2);default:0" json:"balance"`
	FrozenBalance  float64    `gorm:"type:decimal(12,2);default:0" json:"frozen_balance"`
	Status         int8       `gorm:"not null;default:1" json:"status"`
	RejectReason   string     `gorm:"size:256" json:"reject_reason"`
	Rating         float64    `gorm:"type:decimal(2,1);default:5.0" json:"rating"`
	VerifiedAt     *time.Time `json:"verified_at"`
	DeletedAt      *time.Time `json:"deleted_at,omitempty"`
}

func (Leader) TableName() string { return "leaders" }

// ============ Product ============

type Category struct {
	ID        uint64    `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"size:64;not null" json:"name"`
	ParentID  uint64    `gorm:"not null;default:0;index" json:"parent_id"`
	Level     int8      `gorm:"not null;default:1" json:"level"`
	Icon      string    `gorm:"size:512" json:"icon"`
	Sort      int       `gorm:"default:0" json:"sort"`
	Status    int8      `gorm:"not null;default:1" json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (Category) TableName() string { return "categories" }

type Product struct {
	BaseModel
	Name         string       `gorm:"size:256;not null" json:"name"`
	SubName      string       `gorm:"size:256" json:"sub_name"`
	CategoryID   uint64       `gorm:"not null;index" json:"category_id"`
	LeaderID     uint64       `gorm:"not null;default:0;index" json:"leader_id"`
	ProductType  int8         `gorm:"not null;default:1" json:"product_type"`
	Unit         string       `gorm:"size:16;not null;default:件" json:"unit"`
	Images       JSONArray    `gorm:"type:json" json:"images"`
	VideoURL     string       `gorm:"size:512" json:"video_url"`
	Description  string       `gorm:"type:longtext" json:"description"`
	Tags         JSONArray    `gorm:"type:json" json:"tags"`
	SalesCount   int          `gorm:"not null;default:0;index" json:"sales_count"`
	ViewCount    int          `gorm:"not null;default:0" json:"view_count"`
	CommentCount int          `gorm:"not null;default:0" json:"comment_count"`
	Rating       float64      `gorm:"type:decimal(2,1);default:5.0" json:"rating"`
	Status       int8         `gorm:"not null;default:0;index" json:"status"`
	ReviewStatus int8         `gorm:"not null;default:0" json:"review_status"`
	ReviewRemark string       `gorm:"size:256" json:"review_remark"`
	Sort         int          `gorm:"default:0" json:"sort"`
	DeletedAt    *time.Time   `json:"deleted_at,omitempty"`
	SKUs         []ProductSKU `gorm:"foreignKey:ProductID" json:"skus,omitempty"`
}

func (Product) TableName() string { return "products" }

type ProductSKU struct {
	BaseModel
	ProductID    uint64     `gorm:"not null;index" json:"product_id"`
	SKUHash      string     `gorm:"uniqueIndex;size:64;not null" json:"sku_hash"`
	Name         string     `gorm:"size:128;not null" json:"name"`
	SKUCode      string     `gorm:"size:64" json:"sku_code"`
	Image        string     `gorm:"size:512" json:"image"`
	Specs        JSONArray  `gorm:"type:json" json:"specs"`
	Price        float64    `gorm:"type:decimal(10,2);not null" json:"price"`
	GroupPrice   float64    `gorm:"type:decimal(10,2);not null" json:"group_price"`
	CostPrice    float64    `gorm:"type:decimal(10,2);default:0" json:"cost_price"`
	MarketPrice  float64    `gorm:"type:decimal(10,2);default:0" json:"market_price"`
	Stock        int        `gorm:"not null;default:0" json:"stock"`
	SoldCount    int        `gorm:"not null;default:0" json:"sold_count"`
	WarningStock int        `gorm:"not null;default:10" json:"warning_stock"`
	Weight       *float64   `gorm:"type:decimal(8,3)" json:"weight"`
	Status       int8       `gorm:"not null;default:1" json:"status"`
	DeletedAt    *time.Time `json:"deleted_at,omitempty"`
}

func (ProductSKU) TableName() string { return "product_skus" }

// ============ Activity ============

type GroupBuyActivity struct {
	BaseModel
	ActivityNo      string     `gorm:"uniqueIndex;size:32;not null" json:"activity_no"`
	LeaderID        uint64     `gorm:"not null;index" json:"leader_id"`
	ProductID       uint64     `gorm:"not null" json:"product_id"`
	SKUHash         string     `gorm:"size:64;not null" json:"sku_hash"`
	ActivityName    string     `gorm:"size:256;not null" json:"activity_name"`
	StartTime       time.Time  `gorm:"not null" json:"start_time"`
	EndTime         time.Time  `gorm:"not null;index" json:"end_time"`
	OriginalPrice   float64    `gorm:"type:decimal(10,2);not null" json:"original_price"`
	GroupPrice      float64    `gorm:"type:decimal(10,2);not null" json:"group_price"`
	DepositRatio    float64    `gorm:"type:decimal(3,2);default:1.00" json:"deposit_ratio"`
	Stock           int        `gorm:"not null" json:"stock"`
	SoldCount       int        `gorm:"not null;default:0" json:"sold_count"`
	MinPeople       int        `gorm:"not null;default:5" json:"min_people"`
	MaxPerUser      int        `gorm:"not null;default:0" json:"max_per_user"`
	CurrentPeople   int        `gorm:"not null;default:0" json:"current_people"`
	Status          int8       `gorm:"not null;default:0;index" json:"status"`
	BannerImages    JSONArray  `gorm:"type:json" json:"banner_images"`
	RuleDescription string     `gorm:"type:text" json:"rule_description"`
	PickupInfo      string     `gorm:"size:512" json:"pickup_info"`
	ViewCount       int        `gorm:"not null;default:0" json:"view_count"`
	ShareCount      int        `gorm:"not null;default:0" json:"share_count"`
	DeletedAt       *time.Time `json:"deleted_at,omitempty"`
	Leader          *Leader    `gorm:"foreignKey:LeaderID" json:"leader,omitempty"`
	Product         *Product   `gorm:"foreignKey:ProductID" json:"product,omitempty"`
}

func (GroupBuyActivity) TableName() string { return "group_buy_activities" }

type ActivityGroup struct {
	BaseModel
	ActivityID    uint64            `gorm:"not null;index" json:"activity_id"`
	GroupNo       string            `gorm:"uniqueIndex;size:32;not null" json:"group_no"`
	LeaderUserID  uint64            `gorm:"not null" json:"leader_user_id"`
	Status        int8              `gorm:"not null;default:1" json:"status"`
	CurrentPeople int               `gorm:"not null;default:1" json:"current_people"`
	MinPeople     int               `gorm:"not null" json:"min_people"`
	ExpireTime    time.Time         `gorm:"not null" json:"expire_time"`
	SuccessTime   *time.Time        `json:"success_time"`
	Activity      *GroupBuyActivity `gorm:"foreignKey:ActivityID" json:"activity,omitempty"`
}

func (ActivityGroup) TableName() string { return "activity_groups" }

// ============ Order ============

type Order struct {
	BaseModel
	OrderNo         string     `gorm:"uniqueIndex;size:32;not null" json:"order_no"`
	UserID          uint64     `gorm:"not null;index" json:"user_id"`
	LeaderID        uint64     `gorm:"not null;index" json:"leader_id"`
	ActivityID      uint64     `gorm:"not null" json:"activity_id"`
	GroupID         uint64     `gorm:"not null" json:"group_id"`
	AddressID       uint64     `gorm:"not null" json:"address_id"`
	AddressSnapshot JSONArray  `gorm:"type:json" json:"address_snapshot"`
	TotalAmount     float64    `gorm:"type:decimal(10,2);not null" json:"total_amount"`
	DiscountAmount  float64    `gorm:"type:decimal(10,2);default:0" json:"discount_amount"`
	PayAmount       float64    `gorm:"type:decimal(10,2);not null" json:"pay_amount"`
	PayStatus       int8       `gorm:"not null;default:0" json:"pay_status"`
	PayTime         *time.Time `json:"pay_time"`
	PayMethod       string     `gorm:"size:32" json:"pay_method"`
	TransactionID   string     `gorm:"size:64" json:"transaction_id"`
	Status          int8       `gorm:"not null;default:0" json:"status"`
	Remark          string     `gorm:"size:256" json:"remark"`
	ExpressCompany  string     `gorm:"size:64" json:"express_company"`
	ExpressNo       string     `gorm:"size:64" json:"express_no"`
	ShipTime        *time.Time `json:"ship_time"`
	ConfirmTime     *time.Time `json:"confirm_time"`
	CouponID        *uint64    `json:"coupon_id"`
	CouponAmount    float64    `gorm:"type:decimal(10,2);default:0" json:"coupon_amount"`
	Source          string     `gorm:"size:32" json:"source"`
	IP              string     `gorm:"size:64" json:"ip"`
	ExpiredAt       time.Time  `gorm:"not null;index" json:"expired_at"`
}

func (Order) TableName() string { return "orders" }

type OrderItem struct {
	ID          uint64    `gorm:"primaryKey" json:"id"`
	OrderID     uint64    `gorm:"not null;index" json:"order_id"`
	ProductID   uint64    `gorm:"not null" json:"product_id"`
	SKUHash     string    `gorm:"size:64;not null" json:"sku_hash"`
	ProductName string    `gorm:"size:256;not null" json:"product_name"`
	SKUName     string    `gorm:"size:128;not null" json:"sku_name"`
	Image       string    `gorm:"size:512;not null" json:"image"`
	Price       float64   `gorm:"type:decimal(10,2);not null" json:"price"`
	Quantity    int       `gorm:"not null;default:1" json:"quantity"`
	SubTotal    float64   `gorm:"type:decimal(10,2);not null" json:"sub_total"`
	CreatedAt   time.Time `json:"created_at"`
}

func (OrderItem) TableName() string { return "order_items" }

// ============ Settlement ============

type Settlement struct {
	BaseModel
	SettlementNo     string     `gorm:"uniqueIndex;size:32;not null" json:"settlement_no"`
	LeaderID         uint64     `gorm:"not null;index" json:"leader_id"`
	PeriodStart      time.Time  `gorm:"not null" json:"period_start"`
	PeriodEnd        time.Time  `gorm:"not null" json:"period_end"`
	OrderCount       int        `gorm:"default:0" json:"order_count"`
	GrossAmount      float64    `gorm:"type:decimal(12,2);default:0" json:"gross_amount"`
	CommissionRate   float64    `gorm:"type:decimal(4,3);default:0.050" json:"commission_rate"`
	CommissionAmount float64    `gorm:"type:decimal(12,2);default:0" json:"commission_amount"`
	AdjustAmount     float64    `gorm:"type:decimal(10,2);default:0" json:"adjust_amount"`
	NetAmount        float64    `gorm:"type:decimal(12,2);default:0" json:"net_amount"`
	Status           int8       `gorm:"not null;default:0" json:"status"`
	ConfirmedAt      *time.Time `json:"confirmed_at"`
	PaidAt           *time.Time `json:"paid_at"`
}

func (Settlement) TableName() string { return "settlements" }

// ============ Coupon ============

type Coupon struct {
	BaseModel
	Name           string     `gorm:"size:128;not null" json:"name"`
	Type           int8       `gorm:"not null;default:1" json:"type"` // 1满减 2折扣 3新人券
	DiscountAmount float64    `gorm:"type:decimal(10,2);default:0" json:"discount_amount"`
	MinAmount      float64    `gorm:"type:decimal(10,2);default:0" json:"min_amount"`
	ValidDays      int        `gorm:"default:30" json:"valid_days"`
	StartTime      *time.Time `json:"start_time"`
	EndTime        *time.Time `json:"end_time"`
	Status         int8       `gorm:"not null;default:1" json:"status"`
}

func (Coupon) TableName() string { return "coupons" }

type CouponUser struct {
	BaseModel
	CouponID   uint64     `gorm:"not null;index" json:"coupon_id"`
	UserID     uint64     `gorm:"not null;index" json:"user_id"`
	Status     int8       `gorm:"not null;default:0" json:"status"` // 0未使用 1已使用 2已过期
	ReceivedAt time.Time  `json:"received_at"`
	UsedAt     *time.Time `json:"used_at"`
	OrderID    *uint64    `json:"order_id"`
}

func (CouponUser) TableName() string { return "coupon_users" }
