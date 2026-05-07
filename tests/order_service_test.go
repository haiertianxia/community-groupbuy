package service

import (
	"community-groupbuy/internal/model"
	"community-groupbuy/internal/repository"
	"context"
	"testing"
	"time"

	"github.com/go-redis/redis/v8"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupOrderTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed: %v", err)
	}
	err = db.AutoMigrate(
		&model.User{}, &model.Leader{},
		&model.Product{}, &model.ProductSKU{},
		&model.GroupBuyActivity{}, &model.ActivityGroup{},
		&model.Order{}, &model.OrderItem{},
	)
	if err != nil {
		t.Fatalf("migrate failed: %v", err)
	}
	return db
}

func TestOrderPay_Success(t *testing.T) {
	db := setupOrderTestDB(t)
	order := &model.Order{
		OrderNo: "O_TEST_001", UserID: 1, LeaderID: 1, ActivityID: 1, GroupID: 1, AddressID: 1,
		TotalAmount: 80, PayAmount: 80, PayStatus: 0, Status: 0,
		ExpiredAt: time.Now().Add(30 * time.Minute),
	}
	db.Create(order)

	rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379", DB: 14})
	rdb.FlushDB(context.Background())
	orderRepo := repository.NewOrderRepository(db)
	activityRepo := repository.NewActivityRepository(db)
	svc := NewOrderService(orderRepo, activityRepo, rdb)

	err := svc.Pay(context.Background(), order.ID, "WX_TRANSACTION_001")
	if err != nil {
		t.Fatalf("Pay failed: %v", err)
	}

	var updated model.Order
	db.First(&updated, order.ID)
	if updated.PayStatus != 1 {
		t.Errorf("Expected PayStatus 1, got %d", updated.PayStatus)
	}
	if updated.Status != 1 {
		t.Errorf("Expected Status 1 (已支付), got %d", updated.Status)
	}
	if updated.TransactionID != "WX_TRANSACTION_001" {
		t.Errorf("Expected TransactionID WX_TRANSACTION_001, got %s", updated.TransactionID)
	}
}

func TestOrderPay_AlreadyPaid(t *testing.T) {
	db := setupOrderTestDB(t)
	order := &model.Order{
		OrderNo: "O_TEST_002", UserID: 1, LeaderID: 1, ActivityID: 1, GroupID: 1, AddressID: 1,
		TotalAmount: 80, PayAmount: 80, PayStatus: 1, Status: 1,
		ExpiredAt: time.Now().Add(30 * time.Minute),
	}
	db.Create(order)

	rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379", DB: 14})
	rdb.FlushDB(context.Background())
	orderRepo := repository.NewOrderRepository(db)
	activityRepo := repository.NewActivityRepository(db)
	svc := NewOrderService(orderRepo, activityRepo, rdb)

	err := svc.Pay(context.Background(), order.ID, "WX_002")
	if err == nil {
		t.Fatal("Expected error for already paid order")
	}
	if err.Error() != "订单状态不允许支付" {
		t.Errorf("Unexpected error: %s", err.Error())
	}
}

func TestOrderCancel_Success(t *testing.T) {
	db := setupOrderTestDB(t)
	order := &model.Order{
		OrderNo: "O_TEST_003", UserID: 1, LeaderID: 1, ActivityID: 1, GroupID: 1, AddressID: 1,
		TotalAmount: 80, PayAmount: 80, PayStatus: 0, Status: 0,
		ExpiredAt: time.Now().Add(30 * time.Minute),
	}
	db.Create(order)

	rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379", DB: 14})
	rdb.FlushDB(context.Background())
	orderRepo := repository.NewOrderRepository(db)
	activityRepo := repository.NewActivityRepository(db)
	svc := NewOrderService(orderRepo, activityRepo, rdb)

	err := svc.Cancel(context.Background(), order.ID, 1)
	if err != nil {
		t.Fatalf("Cancel failed: %v", err)
	}

	var updated model.Order
	db.First(&updated, order.ID)
	if updated.Status != 5 {
		t.Errorf("Expected Status 5 (已取消), got %d", updated.Status)
	}
}

func TestOrderCancel_WrongUser(t *testing.T) {
	db := setupOrderTestDB(t)
	order := &model.Order{
		OrderNo: "O_TEST_004", UserID: 1, LeaderID: 1, ActivityID: 1, GroupID: 1, AddressID: 1,
		TotalAmount: 80, PayAmount: 80, PayStatus: 0, Status: 0,
		ExpiredAt: time.Now().Add(30 * time.Minute),
	}
	db.Create(order)

	rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379", DB: 14})
	rdb.FlushDB(context.Background())
	orderRepo := repository.NewOrderRepository(db)
	activityRepo := repository.NewActivityRepository(db)
	svc := NewOrderService(orderRepo, activityRepo, rdb)

	err := svc.Cancel(context.Background(), order.ID, 999)
	if err == nil {
		t.Fatal("Expected error for wrong user")
	}
	if err.Error() != "无权限取消此订单" {
		t.Errorf("Unexpected error: %s", err.Error())
	}
}

func TestOrderConfirm_Success(t *testing.T) {
	db := setupOrderTestDB(t)
	order := &model.Order{
		OrderNo: "O_TEST_005", UserID: 1, LeaderID: 1, ActivityID: 1, GroupID: 1, AddressID: 1,
		TotalAmount: 80, PayAmount: 80, PayStatus: 1, Status: 2,
		ExpiredAt: time.Now().Add(30 * time.Minute),
	}
	db.Create(order)

	rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379", DB: 14})
	rdb.FlushDB(context.Background())
	orderRepo := repository.NewOrderRepository(db)
	activityRepo := repository.NewActivityRepository(db)
	svc := NewOrderService(orderRepo, activityRepo, rdb)

	err := svc.Confirm(context.Background(), order.ID, 1)
	if err != nil {
		t.Fatalf("Confirm failed: %v", err)
	}

	var updated model.Order
	db.First(&updated, order.ID)
	if updated.Status != 3 {
		t.Errorf("Expected Status 3 (已确认), got %d", updated.Status)
	}
	if updated.ConfirmTime == nil {
		t.Error("ConfirmTime should be set")
	}
}

func TestOrderShip_Success(t *testing.T) {
	db := setupOrderTestDB(t)
	order := &model.Order{
		OrderNo: "O_TEST_006", UserID: 1, LeaderID: 1, ActivityID: 1, GroupID: 1, AddressID: 1,
		TotalAmount: 80, PayAmount: 80, PayStatus: 1, Status: 1,
		ExpiredAt: time.Now().Add(30 * time.Minute),
	}
	db.Create(order)

	rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379", DB: 14})
	rdb.FlushDB(context.Background())
	orderRepo := repository.NewOrderRepository(db)
	activityRepo := repository.NewActivityRepository(db)
	svc := NewOrderService(orderRepo, activityRepo, rdb)

	err := svc.Ship(context.Background(), order.ID, 1, "顺丰速运", "SF123456789")
	if err != nil {
		t.Fatalf("Ship failed: %v", err)
	}

	var updated model.Order
	db.First(&updated, order.ID)
	if updated.Status != 2 {
		t.Errorf("Expected Status 2 (已发货), got %d", updated.Status)
	}
	if updated.ExpressCompany != "顺丰速运" {
		t.Errorf("Expected ExpressCompany 顺丰速运, got %s", updated.ExpressCompany)
	}
	if updated.ExpressNo != "SF123456789" {
		t.Errorf("Expected ExpressNo SF123456789, got %s", updated.ExpressNo)
	}
}
