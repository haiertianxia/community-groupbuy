package repository

import (
	"community-groupbuy/internal/model"
	"gorm.io/gorm"
	"time"
)

type ActivityRepository struct {
	db *gorm.DB
}

func NewActivityRepository(db *gorm.DB) *ActivityRepository {
	return &ActivityRepository{db: db}
}

func (r *ActivityRepository) Create(activity *model.GroupBuyActivity) error {
	return r.db.Create(activity).Error
}

func (r *ActivityRepository) Update(activity *model.GroupBuyActivity) error {
	return r.db.Save(activity).Error
}

func (r *ActivityRepository) UpdateStatus(id uint64, status int8) error {
	return r.db.Model(&model.GroupBuyActivity{}).Where("id = ?", id).Update("status", status).Error
}

func (r *ActivityRepository) FindByID(id uint64) (*model.GroupBuyActivity, error) {
	var activity model.GroupBuyActivity
	if err := r.db.Preload("Leader").Preload("Product").First(&activity, id).Error; err != nil {
		return nil, err
	}
	return &activity, nil
}

func (r *ActivityRepository) List(page, pageSize int, leaderID uint64, status int8) ([]model.GroupBuyActivity, int64, error) {
	var activities []model.GroupBuyActivity
	var total int64
	query := r.db.Model(&model.GroupBuyActivity{})
	if leaderID > 0 {
		query = query.Where("leader_id = ?", leaderID)
	}
	if status >= 0 {
		query = query.Where("status = ?", status)
	}
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&activities).Error; err != nil {
		return nil, 0, err
	}
	return activities, total, nil
}

func (r *ActivityRepository) FindExpiredRunningActivities() ([]model.GroupBuyActivity, error) {
	var activities []model.GroupBuyActivity
	if err := r.db.Where("status = 1 AND end_time <= ?", time.Now()).Find(&activities).Error; err != nil {
		return nil, err
	}
	return activities, nil
}

func (r *ActivityRepository) IncrementPeople(id uint64) error {
	return r.db.Model(&model.GroupBuyActivity{}).Where("id = ?", id).Updates(map[string]interface{}{
		"current_people": gorm.Expr("current_people + 1"),
		"sold_count":     gorm.Expr("sold_count + 1"),
	}).Error
}

func (r *ActivityRepository) DecrementPeople(id uint64) error {
	return r.db.Model(&model.GroupBuyActivity{}).Where("id = ?", id).Updates(map[string]interface{}{
		"current_people": gorm.Expr("current_people - 1"),
		"sold_count":     gorm.Expr("sold_count - 1"),
	}).Error
}

func (r *ActivityRepository) CreateGroup(group *model.ActivityGroup) error {
	return r.db.Create(group).Error
}

func (r *ActivityRepository) FindGroupByID(id uint64) (*model.ActivityGroup, error) {
	var group model.ActivityGroup
	if err := r.db.First(&group, id).Error; err != nil {
		return nil, err
	}
	return &group, nil
}

func (r *ActivityRepository) IncrementGroupPeople(groupID uint64) error {
	return r.db.Model(&model.ActivityGroup{}).Where("id = ?", groupID).
		Update("current_people", gorm.Expr("current_people + 1")).Error
}

func (r *ActivityRepository) UpdateGroupStatus(groupID uint64, status int8) error {
	updates := map[string]interface{}{"status": status}
	if status == 2 {
		updates["success_time"] = time.Now()
	}
	return r.db.Model(&model.ActivityGroup{}).Where("id = ?", groupID).Updates(updates).Error
}

func (r *ActivityRepository) FindGroupsByActivity(activityID uint64, status int8) ([]model.ActivityGroup, error) {
	var groups []model.ActivityGroup
	query := r.db.Where("activity_id = ?", activityID)
	if status >= 0 {
		query = query.Where("status = ?", status)
	}
	if err := query.Find(&groups).Error; err != nil {
		return nil, err
	}
	return groups, nil
}
