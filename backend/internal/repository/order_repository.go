package repository

import (
	"community-groupbuy/internal/model"
	"gorm.io/gorm"
	"time"
)

type OrderRepository struct {
	db *gorm.DB
}

func NewOrderRepository(db *gorm.DB) *OrderRepository {
	return &OrderRepository{db: db}
}

func (r *OrderRepository) Create(order *model.Order) error {
	return r.db.Create(order).Error
}

func (r *OrderRepository) Update(order *model.Order) error {
	return r.db.Save(order).Error
}

func (r *OrderRepository) FindByID(id uint64) (*model.Order, error) {
	var order model.Order
	if err := r.db.First(&order, id).Error; err != nil {
		return nil, err
	}
	return &order, nil
}

func (r *OrderRepository) FindByOrderNo(orderNo string) (*model.Order, error) {
	var order model.Order
	if err := r.db.Where("order_no = ?", orderNo).First(&order).Error; err != nil {
		return nil, err
	}
	return &order, nil
}

func (r *OrderRepository) ListByUser(userID uint64, page, pageSize int, status int8) ([]model.Order, int64, error) {
	var orders []model.Order
	var total int64

	query := r.db.Model(&model.Order{}).Where("user_id = ?", userID)
	if status >= 0 {
		query = query.Where("status = ?", status)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&orders).Error; err != nil {
		return nil, 0, err
	}

	return orders, total, nil
}

func (r *OrderRepository) ListByLeader(leaderID uint64, page, pageSize int, status int8) ([]model.Order, int64, error) {
	var orders []model.Order
	var total int64

	query := r.db.Model(&model.Order{}).Where("leader_id = ?", leaderID)
	if status >= 0 {
		query = query.Where("status = ?", status)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&orders).Error; err != nil {
		return nil, 0, err
	}

	return orders, total, nil
}

func (r *OrderRepository) CreateItems(items []model.OrderItem) error {
	return r.db.Create(&items).Error
}

func (r *OrderRepository) FindItemsByOrderID(orderID uint64) ([]model.OrderItem, error) {
	var items []model.OrderItem
	if err := r.db.Where("order_id = ?", orderID).Find(&items).Error; err != nil {
		return nil, err
	}
	return items, nil
}

func (r *OrderRepository) UpdateStatus(orderID uint64, status int8) error {
	return r.db.Model(&model.Order{}).Where("id = ?", orderID).Update("status", status).Error
}

func (r *OrderRepository) UpdatePayStatus(orderID uint64, status int8, transactionID string, payTime time.Time) error {
	return r.db.Model(&model.Order{}).Where("id = ?", orderID).Updates(map[string]interface{}{
		"pay_status":     status,
		"transaction_id": transactionID,
		"pay_time":       payTime,
		"status":         1,
	}).Error
}

func (r *OrderRepository) FindExpiredOrders() ([]model.Order, error) {
	var orders []model.Order
	if err := r.db.Where("pay_status = 0 AND expired_at <= ?", time.Now()).Find(&orders).Error; err != nil {
		return nil, err
	}
	return orders, nil
}

func (r *OrderRepository) CountByLeader(leaderID uint64, startTime, endTime time.Time) (int64, error) {
	var count int64
	if err := r.db.Model(&model.Order{}).Where("leader_id = ? AND status >= 1 AND created_at BETWEEN ? AND ?", leaderID, startTime, endTime).Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

func (r *OrderRepository) SumAmountByLeader(leaderID uint64, startTime, endTime time.Time) (float64, error) {
	var result struct {
		Total float64
	}
	if err := r.db.Model(&model.Order{}).Select("COALESCE(SUM(pay_amount), 0) as total").
		Where("leader_id = ? AND status >= 1 AND created_at BETWEEN ? AND ?", leaderID, startTime, endTime).
		Scan(&result).Error; err != nil {
		return 0, err
	}
	return result.Total, nil
}

func (r *OrderRepository) CountByUserActivity(userID, activityID uint64) (int64, error) {
	var count int64
	if err := r.db.Model(&model.Order{}).
		Where("user_id = ? AND activity_id = ? AND status NOT IN (5, 7)", userID, activityID).
		Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}
