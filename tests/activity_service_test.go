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

func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	err = db.AutoMigrate(
		&model.User{}, &model.UserAddress{},
		&model.Leader{},
		&model.Product{}, &model.ProductSKU{},
		&model.GroupBuyActivity{}, &model.ActivityGroup{},
		&model.Order{}, &model.OrderItem{},
	)
	if err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}
	return db
}

func TestActivityJoin_Success(t *testing.T) {
	db := setupTestDB(t)
	activityRepo := repository.NewActivityRepository(db)
	productRepo := repository.NewProductRepository(db)
	orderRepo := repository.NewOrderRepository(db)
	rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379", DB: 15})
	rdb.FlushDB(context.Background())
	svc := NewActivityService(activityRepo, productRepo, orderRepo, rdb)

	user := &model.User{UID: "U1", Openid: "o1", UserType: 1, Status: 1}
	db.Create(user)

	leader := &model.Leader{UserID: user.ID, LeaderNo: "L001", Nickname: "TestLeader", RealName: "Test", Phone: "13800000001", Province: "北京", City: "北京", District: "朝阳区", PickupAddress: "测试地址", PickupPhone: "13800000001", Status: 2}
	db.Create(leader)

	product := &model.Product{Name: "测试商品", CategoryID: 1, LeaderID: leader.ID, Status: 1}
	db.Create(product)

	sku := &model.ProductSKU{ProductID: product.ID, SKUHash: "SKU001", Name: "默认", Price: 100, GroupPrice: 80, Stock: 100, Status: 1}
	db.Create(sku)

	activity := &model.GroupBuyActivity{
		ActivityNo: "A001", LeaderID: leader.ID, ProductID: product.ID, SKUHash: "SKU001",
		ActivityName: "测试活动", StartTime: time.Now().Add(-1*time.Hour), EndTime: time.Now().Add(24*time.Hour),
		OriginalPrice: 100, GroupPrice: 80, Stock: 100, MinPeople: 2, Status: 1,
	}
	db.Create(activity)

	address := &model.UserAddress{UserID: user.ID, Consignee: "张三", Phone: "13800000001", Province: "北京", City: "北京", District: "朝阳区", Address: "详细地址"}
	db.Create(address)

	result, err := svc.Join(context.Background(), user.ID, activity.ID, address.ID)
	if err != nil {
		t.Fatalf("Join failed: %v", err)
	}
	if result.OrderID == 0 {
		t.Error("OrderID should not be 0")
	}
	if result.PayAmount != 80 {
		t.Errorf("Expected PayAmount 80, got %f", result.PayAmount)
	}
	if !result.IsNewGroup {
		t.Error("First join should create new group")
	}
}

func TestActivityJoin_InsufficientStock(t *testing.T) {
	db := setupTestDB(t)
	activityRepo := repository.NewActivityRepository(db)
	productRepo := repository.NewProductRepository(db)
	orderRepo := repository.NewOrderRepository(db)
	rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379", DB: 15})
	rdb.FlushDB(context.Background())
	svc := NewActivityService(activityRepo, productRepo, orderRepo, rdb)

	user := &model.User{UID: "U2", Openid: "o2", UserType: 1, Status: 1}
	db.Create(user)

	leader := &model.Leader{UserID: user.ID, LeaderNo: "L002", Nickname: "Leader2", RealName: "Test2", Phone: "13800000002", Province: "北京", City: "北京", District: "朝阳区", PickupAddress: "地址", PickupPhone: "13800000002", Status: 2}
	db.Create(leader)

	product := &model.Product{Name: "商品2", CategoryID: 1, LeaderID: leader.ID, Status: 1}
	db.Create(product)

	sku := &model.ProductSKU{ProductID: product.ID, SKUHash: "SKU002", Name: "规格", Price: 50, GroupPrice: 30, Stock: 0, Status: 1}
	db.Create(sku)

	activity := &model.GroupBuyActivity{
		ActivityNo: "A002", LeaderID: leader.ID, ProductID: product.ID, SKUHash: "SKU002",
		ActivityName: "无库存活动", StartTime: time.Now().Add(-1*time.Hour), EndTime: time.Now().Add(24*time.Hour),
		OriginalPrice: 50, GroupPrice: 30, Stock: 0, MinPeople: 2, Status: 1,
	}
	db.Create(activity)

	address := &model.UserAddress{UserID: user.ID, Consignee: "李四", Phone: "13800000002", Province: "北京", City: "北京", District: "朝阳区", Address: "地址"}
	db.Create(address)

	_, err := svc.Join(context.Background(), user.ID, activity.ID, address.ID)
	if err == nil {
		t.Fatal("Expected error for insufficient stock")
	}
}

func TestActivityJoin_ActivityEnded(t *testing.T) {
	db := setupTestDB(t)
	activityRepo := repository.NewActivityRepository(db)
	productRepo := repository.NewProductRepository(db)
	orderRepo := repository.NewOrderRepository(db)
	rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379", DB: 15})
	rdb.FlushDB(context.Background())
	svc := NewActivityService(activityRepo, productRepo, orderRepo, rdb)

	user := &model.User{UID: "U3", Openid: "o3", UserType: 1, Status: 1}
	db.Create(user)

	leader := &model.Leader{UserID: user.ID, LeaderNo: "L003", Nickname: "Leader3", RealName: "Test3", Phone: "13800000003", Province: "北京", City: "北京", District: "朝阳区", PickupAddress: "地址", PickupPhone: "13800000003", Status: 2}
	db.Create(leader)

	product := &model.Product{Name: "商品3", CategoryID: 1, LeaderID: leader.ID, Status: 1}
	db.Create(product)

	sku := &model.ProductSKU{ProductID: product.ID, SKUHash: "SKU003", Name: "规格", Price: 50, GroupPrice: 30, Stock: 100, Status: 1}
	db.Create(sku)

	activity := &model.GroupBuyActivity{
		ActivityNo: "A003", LeaderID: leader.ID, ProductID: product.ID, SKUHash: "SKU003",
		ActivityName: "已结束活动", StartTime: time.Now().Add(-48*time.Hour), EndTime: time.Now().Add(-24*time.Hour),
		OriginalPrice: 50, GroupPrice: 30, Stock: 100, MinPeople: 2, Status: 3,
	}
	db.Create(activity)

	address := &model.UserAddress{UserID: user.ID, Consignee: "王五", Phone: "13800000003", Province: "北京", City: "北京", District: "朝阳区", Address: "地址"}
	db.Create(address)

	_, err := svc.Join(context.Background(), user.ID, activity.ID, address.ID)
	if err == nil {
		t.Fatal("Expected error for ended activity")
	}
}

func TestCheckAndCloseExpired_Success(t *testing.T) {
	db := setupTestDB(t)
	activityRepo := repository.NewActivityRepository(db)
	productRepo := repository.NewProductRepository(db)
	orderRepo := repository.NewOrderRepository(db)
	rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379", DB: 15})
	rdb.FlushDB(context.Background())
	svc := NewActivityService(activityRepo, productRepo, orderRepo, rdb)

	user := &model.User{UID: "U4", Openid: "o4", UserType: 1, Status: 1}
	db.Create(user)

	leader := &model.Leader{UserID: user.ID, LeaderNo: "L004", Nickname: "Leader4", RealName: "Test4", Phone: "13800000004", Province: "北京", City: "北京", District: "朝阳区", PickupAddress: "地址", PickupPhone: "13800000004", Status: 2}
	db.Create(leader)

	product := &model.Product{Name: "商品4", CategoryID: 1, LeaderID: leader.ID, Status: 1}
	db.Create(product)

	sku := &model.ProductSKU{ProductID: product.ID, SKUHash: "SKU004", Name: "规格", Price: 50, GroupPrice: 30, Stock: 100, Status: 1}
	db.Create(sku)

	activity := &model.GroupBuyActivity{
		ActivityNo: "A004", LeaderID: leader.ID, ProductID: product.ID, SKUHash: "SKU004",
		ActivityName: "达标活动", StartTime: time.Now().Add(-48*time.Hour), EndTime: time.Now().Add(-1*time.Hour),
		OriginalPrice: 50, GroupPrice: 30, Stock: 100, MinPeople: 2, CurrentPeople: 5, Status: 1,
	}
	db.Create(activity)

	err := svc.CheckAndCloseExpired()
	if err != nil {
		t.Fatalf("CheckAndCloseExpired failed: %v", err)
	}

	var updated model.GroupBuyActivity
	db.First(&updated, activity.ID)
	if updated.Status != 2 {
		t.Errorf("Expected status 2 (已成团), got %d", updated.Status)
	}
}

func TestCheckAndCloseExpired_Failed(t *testing.T) {
	db := setupTestDB(t)
	activityRepo := repository.NewActivityRepository(db)
	productRepo := repository.NewProductRepository(db)
	orderRepo := repository.NewOrderRepository(db)
	rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379", DB: 15})
	rdb.FlushDB(context.Background())
	svc := NewActivityService(activityRepo, productRepo, orderRepo, rdb)

	user := &model.User{UID: "U5", Openid: "o5", UserType: 1, Status: 1}
	db.Create(user)

	leader := &model.Leader{UserID: user.ID, LeaderNo: "L005", Nickname: "Leader5", RealName: "Test5", Phone: "13800000005", Province: "北京", City: "北京", District: "朝阳区", PickupAddress: "地址", PickupPhone: "13800000005", Status: 2}
	db.Create(leader)

	product := &model.Product{Name: "商品5", CategoryID: 1, LeaderID: leader.ID, Status: 1}
	db.Create(product)

	sku := &model.ProductSKU{ProductID: product.ID, SKUHash: "SKU005", Name: "规格", Price: 50, GroupPrice: 30, Stock: 100, Status: 1}
	db.Create(sku)

	activity := &model.GroupBuyActivity{
		ActivityNo: "A005", LeaderID: leader.ID, ProductID: product.ID, SKUHash: "SKU005",
		ActivityName: "未达标活动", StartTime: time.Now().Add(-48*time.Hour), EndTime: time.Now().Add(-1*time.Hour),
		OriginalPrice: 50, GroupPrice: 30, Stock: 100, MinPeople: 10, CurrentPeople: 3, Status: 1,
	}
	db.Create(activity)

	err := svc.CheckAndCloseExpired()
	if err != nil {
		t.Fatalf("CheckAndCloseExpired failed: %v", err)
	}

	var updated model.GroupBuyActivity
	db.First(&updated, activity.ID)
	if updated.Status != 4 {
		t.Errorf("Expected status 4 (已取消), got %d", updated.Status)
	}
}

func TestCreateActivity(t *testing.T) {
	db := setupTestDB(t)
	activityRepo := repository.NewActivityRepository(db)
	productRepo := repository.NewProductRepository(db)
	orderRepo := repository.NewOrderRepository(db)
	rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379", DB: 15})
	rdb.FlushDB(context.Background())
	svc := NewActivityService(activityRepo, productRepo, orderRepo, rdb)

	user := &model.User{UID: "U6", Openid: "o6", UserType: 1, Status: 1}
	db.Create(user)
	leader := &model.Leader{UserID: user.ID, LeaderNo: "L006", Nickname: "Leader6", RealName: "Test6", Phone: "13800000006", Province: "北京", City: "北京", District: "朝阳区", PickupAddress: "地址", PickupPhone: "13800000006", Status: 2}
	db.Create(leader)

	req := &CreateActivityReq{
		ProductID:      1,
		SKUHash:        "SKU006",
		ActivityName:   "新建活动",
		StartTime:      time.Now().Add(1 * time.Hour),
		EndTime:        time.Now().Add(48 * time.Hour),
		OriginalPrice:  100,
		GroupPrice:     70,
		DepositRatio:   1.0,
		Stock:          200,
		MinPeople:      5,
		MaxPerUser:     3,
	}

	activity, err := svc.Create(context.Background(), leader.ID, req)
	if err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	if activity.ID == 0 {
		t.Error("Activity ID should not be 0")
	}
	if activity.Status != 0 {
		t.Errorf("Expected status 0 (预热), got %d", activity.Status)
	}
}
