package repository

import (
	"community-groupbuy/internal/model"
	"gorm.io/gorm"
)

type LeaderRepository struct {
	db *gorm.DB
}

func NewLeaderRepository(db *gorm.DB) *LeaderRepository {
	return &LeaderRepository{db: db}
}

func (r *LeaderRepository) FindByID(id uint64) (*model.Leader, error) {
	var leader model.Leader
	if err := r.db.First(&leader, id).Error; err != nil {
		return nil, err
	}
	return &leader, nil
}

func (r *LeaderRepository) FindByUserID(userID uint64) (*model.Leader, error) {
	var leader model.Leader
	if err := r.db.Where("user_id = ?", userID).First(&leader).Error; err != nil {
		return nil, err
	}
	return &leader, nil
}

func (r *LeaderRepository) Create(leader *model.Leader) error {
	return r.db.Create(leader).Error
}

func (r *LeaderRepository) Update(leader *model.Leader) error {
	return r.db.Save(leader).Error
}

func (r *LeaderRepository) List(page, pageSize int, status int8, province, city string) ([]model.Leader, int64, error) {
	var leaders []model.Leader
	var total int64

	query := r.db.Model(&model.Leader{}).Where("status = 2")

	if province != "" {
		query = query.Where("province = ?", province)
	}
	if city != "" {
		query = query.Where("city = ?", city)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Order("total_sales DESC").Find(&leaders).Error; err != nil {
		return nil, 0, err
	}

	return leaders, total, nil
}

func (r *LeaderRepository) UpdateBalance(leaderID uint64, amount float64) error {
	return r.db.Model(&model.Leader{}).Where("id = ?", leaderID).
		Update("balance", gorm.Expr("balance + ?", amount)).Error
}

func (r *LeaderRepository) IncrementSales(leaderID uint64, amount float64) error {
	return r.db.Model(&model.Leader{}).Where("id = ?", leaderID).Updates(map[string]interface{}{
		"monthly_sales": gorm.Expr("monthly_sales + ?", amount),
		"total_sales":   gorm.Expr("total_sales + ?", amount),
		"total_orders":  gorm.Expr("total_orders + 1"),
	}).Error
}
