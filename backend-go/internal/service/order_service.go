package service

import (
	"community-groupbuy/internal/model"
	"community-groupbuy/internal/repository"
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/go-redis/redis/v8"
)

type OrderService struct {
	orderRepo    *repository.OrderRepository
	activityRepo *repository.ActivityRepository
	rdb          *redis.Client
}

func NewOrderService(orderRepo *repository.OrderRepository, activityRepo *repository.ActivityRepository, rdb *redis.Client) *OrderService {
	return &OrderService{
		orderRepo:    orderRepo,
		activityRepo: activityRepo,
		rdb:          rdb,
	}
}

func (s *OrderService) List(ctx context.Context, userID uint64, page, pageSize int, status int8) (*OrderListResult, error) {
	orders, total, err := s.orderRepo.ListByUser(userID, page, pageSize, status)
	if err != nil {
		return nil, err
	}

	items := make([]OrderItem, 0, len(orders))
	for _, o := range orders {
		items = append(items, OrderItem{
			ID:        o.ID,
			OrderNo:   o.OrderNo,
			PayAmount: o.PayAmount,
			Status:    o.Status,
			PayStatus: o.PayStatus,
			CreatedAt: o.CreatedAt,
		})
	}

	return &OrderListResult{
		List:     items,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

func (s *OrderService) Detail(ctx context.Context, orderID, userID uint64) (*model.Order, error) {
	order, err := s.orderRepo.FindByID(orderID)
	if err != nil {
		return nil, errors.New("订单不存在")
	}

	if order.UserID != userID {
		return nil, errors.New("无权限查看此订单")
	}

	return order, nil
}

func (s *OrderService) Pay(ctx context.Context, orderID uint64, transactionID string) error {
	order, err := s.orderRepo.FindByID(orderID)
	if err != nil {
		return errors.New("订单不存在")
	}

	if order.PayStatus != 0 {
		return errors.New("订单状态不允许支付")
	}

	if time.Now().After(order.ExpiredAt) {
		s.orderRepo.UpdateStatus(orderID, 5)
		return errors.New("订单已过期")
	}

	now := time.Now()
	if err := s.orderRepo.UpdatePayStatus(orderID, 1, transactionID, now); err != nil {
		return err
	}

	return nil
}

func (s *OrderService) Cancel(ctx context.Context, orderID, userID uint64) error {
	order, err := s.orderRepo.FindByID(orderID)
	if err != nil {
		return errors.New("订单不存在")
	}

	if order.UserID != userID {
		return errors.New("无权限取消此订单")
	}

	if order.Status != 0 {
		return errors.New("订单状态不允许取消")
	}

	if err := s.orderRepo.UpdateStatus(orderID, 5); err != nil {
		return err
	}

	activity, _ := s.activityRepo.FindByID(order.ActivityID)
	if activity != nil {
		s.activityRepo.DecrementPeople(activity.ID)
	}

	return nil
}

func (s *OrderService) Confirm(ctx context.Context, orderID, userID uint64) error {
	order, err := s.orderRepo.FindByID(orderID)
	if err != nil {
		return errors.New("订单不存在")
	}

	if order.UserID != userID {
		return errors.New("无权限操作此订单")
	}

	if order.Status != 2 {
		return errors.New("订单状态不正确")
	}

	now := time.Now()
	order.Status = 3
	order.ConfirmTime = &now
	return s.orderRepo.Update(order)
}

func (s *OrderService) LeaderOrders(ctx context.Context, leaderID uint64, page, pageSize int, status int8) (*OrderListResult, error) {
	orders, total, err := s.orderRepo.ListByLeader(leaderID, page, pageSize, status)
	if err != nil {
		return nil, err
	}

	items := make([]OrderItem, 0, len(orders))
	for _, o := range orders {
		items = append(items, OrderItem{
			ID:        o.ID,
			OrderNo:   o.OrderNo,
			UserID:    o.UserID,
			PayAmount: o.PayAmount,
			Status:    o.Status,
			PayStatus: o.PayStatus,
			CreatedAt: o.CreatedAt,
		})
	}

	return &OrderListResult{
		List:     items,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

func (s *OrderService) Ship(ctx context.Context, orderID, leaderID uint64, expressCompany, expressNo string) error {
	order, err := s.orderRepo.FindByID(orderID)
	if err != nil {
		return errors.New("订单不存在")
	}

	if order.LeaderID != leaderID {
		return errors.New("无权限操作此订单")
	}

	if order.Status != 1 {
		return errors.New("订单状态不正确")
	}

	now := time.Now()
	order.Status = 2
	order.ExpressCompany = expressCompany
	order.ExpressNo = expressNo
	order.ShipTime = &now

	return s.orderRepo.Update(order)
}

func (s *OrderService) ProcessRefund(ctx context.Context, orderID, leaderID uint64, approved bool, reason string) error {
	order, err := s.orderRepo.FindByID(orderID)
	if err != nil {
		return errors.New("订单不存在")
	}

	if order.LeaderID != leaderID {
		return errors.New("无权限操作此订单")
	}

	if order.Status != 6 {
		return errors.New("订单不在退款状态")
	}

	if approved {
		order.Status = 7
		order.PayStatus = 2
	} else {
		order.Status = 1
	}

	return s.orderRepo.Update(order)
}

// generateOrderNo 生成订单号
func generateOrderNo() string {
	now := time.Now()
	return fmt.Sprintf("O%d%04d%04d", now.UnixNano()/1000000, now.Hour()*60+now.Minute(), now.Second())
}

func (s *OrderService) CloseExpiredOrders() error {
	orders, err := s.orderRepo.FindExpiredOrders()
	if err != nil {
		return err
	}

	for _, order := range orders {
		s.orderRepo.UpdateStatus(order.ID, 5)
	}

	return nil
}

type OrderListResult struct {
	List     []OrderItem `json:"list"`
	Total    int64       `json:"total"`
	Page     int         `json:"page"`
	PageSize int         `json:"page_size"`
}

type OrderItem struct {
	ID        uint64    `json:"id"`
	OrderNo   string    `json:"order_no"`
	UserID    uint64    `json:"user_id,omitempty"`
	PayAmount float64   `json:"pay_amount"`
	Status    int8      `json:"status"`
	PayStatus int8      `json:"pay_status"`
	CreatedAt time.Time `json:"created_at"`
}

type CreateOrderResult struct {
	OrderID   uint64    `json:"order_id"`
	OrderNo   string    `json:"order_no"`
	PayAmount float64   `json:"pay_amount"`
	ExpiredAt time.Time `json:"expired_at"`
}

func (s *OrderService) Create(ctx context.Context, userID, activityID uint64, skuHash string, quantity int, addressID uint64, remark string) (*CreateOrderResult, error) {
	// 1. 获取活动信息
	activity, err := s.activityRepo.FindByID(activityID)
	if err != nil {
		return nil, errors.New("活动不存在")
	}

	// 2. 检查活动状态
	if activity.Status != 1 {
		return nil, errors.New("活动不在进行中")
	}

	if time.Now().After(activity.EndTime) {
		return nil, errors.New("活动已结束")
	}

	// 3. 检查库存
	if activity.Stock < quantity {
		return nil, errors.New("库存不足")
	}

	// 4. 检查是否已参团（每人限购）
	if activity.MaxPerUser > 0 {
		count, _ := s.orderRepo.CountByUserActivity(userID, activityID)
		if count >= int64(activity.MaxPerUser) {
			return nil, errors.New("已达购买上限")
		}
	}

	// 5. 计算价格
	totalAmount := activity.GroupPrice * float64(quantity)

	// 6. 生成订单号
	orderNo := generateOrderNo()

	// 7. 创建订单
	now := time.Now()
	order := &model.Order{
		OrderNo:        orderNo,
		UserID:         userID,
		LeaderID:       activity.LeaderID,
		ActivityID:     activityID,
		GroupID:        0, // TODO: 加入或创建团
		AddressID:      addressID,
		TotalAmount:    totalAmount,
		DiscountAmount: 0,
		PayAmount:      totalAmount,
		PayStatus:      0,
		Status:         0,
		Remark:         remark,
		ExpiredAt:      now.Add(30 * time.Minute), // 30分钟支付过期
		Source:         "miniapp",
		IP:             "", // 从context获取
	}

	if err := s.orderRepo.Create(order); err != nil {
		return nil, errors.New("创建订单失败")
	}

	// 8. 创建订单明细
	items := []model.OrderItem{
		{
			OrderID:     order.ID,
			ProductID:   activity.ProductID,
			SKUHash:     skuHash,
			ProductName: activity.ActivityName,
			SKUName:     "",
			Image:       "",
			Price:       activity.GroupPrice,
			Quantity:    quantity,
			SubTotal:    totalAmount,
		},
	}

	s.orderRepo.CreateItems(items)

	// 9. 更新活动库存
	s.activityRepo.DecrementStock(activityID, quantity)

	return &CreateOrderResult{
		OrderID:   order.ID,
		OrderNo:   orderNo,
		PayAmount: totalAmount,
		ExpiredAt: order.ExpiredAt,
	}, nil
}

func (s *OrderService) ApplyRefund(ctx context.Context, orderID, userID uint64, reason string) error {
	order, err := s.orderRepo.FindByID(orderID)
	if err != nil {
		return errors.New("订单不存在")
	}

	if order.UserID != userID {
		return errors.New("无权限操作此订单")
	}

	// 允许退款的订单状态：已支付(1)或已发货(2)
	if order.Status != 1 && order.Status != 2 {
		return errors.New("当前状态不支持退款申请")
	}

	if order.Status == 6 || order.Status == 7 {
		return errors.New("订单已在退款流程中或已退款")
	}

	return s.orderRepo.UpdateStatus(orderID, 6)
}
