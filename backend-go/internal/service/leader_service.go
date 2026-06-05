package service

import (
	"community-groupbuy/internal/model"
	"community-groupbuy/internal/repository"
	"context"
)

type LeaderService struct {
	leaderRepo *repository.LeaderRepository
}

func NewLeaderService(leaderRepo *repository.LeaderRepository) *LeaderService {
	return &LeaderService{leaderRepo: leaderRepo}
}

func (s *LeaderService) GetLeader(ctx context.Context, leaderID uint64) (*model.Leader, error) {
	return s.leaderRepo.FindByID(leaderID)
}

func (s *LeaderService) List(ctx context.Context, page, pageSize int, province, city string) (*LeaderListResult, error) {
	leaders, total, err := s.leaderRepo.List(page, pageSize, 2, province, city)
	if err != nil {
		return nil, err
	}

	items := make([]LeaderItem, 0, len(leaders))
	for _, l := range leaders {
		items = append(items, LeaderItem{
			ID:            l.ID,
			Nickname:      l.Nickname,
			Avatar:        "",
			Province:      l.Province,
			City:          l.City,
			District:      l.District,
			PickupAddress: l.PickupAddress,
			PickupHours:   l.PickupHours,
			Level:         l.Level,
			TotalSales:    l.TotalSales,
			Rating:        l.Rating,
		})
	}

	return &LeaderListResult{
		List:     items,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

func (s *LeaderService) Dashboard(ctx context.Context, leaderID uint64) (*LeaderDashboard, error) {
	leader, err := s.leaderRepo.FindByID(leaderID)
	if err != nil {
		return nil, err
	}

	return &LeaderDashboard{
		Balance:       leader.Balance,
		FrozenBalance: leader.FrozenBalance,
		MonthlySales:  leader.MonthlySales,
		TotalSales:    leader.TotalSales,
		TotalOrders:   leader.TotalOrders,
		Level:         leader.Level,
	}, nil
}

type LeaderListResult struct {
	List     []LeaderItem `json:"list"`
	Total    int64        `json:"total"`
	Page     int          `json:"page"`
	PageSize int          `json:"page_size"`
}

type LeaderItem struct {
	ID            uint64  `json:"id"`
	Nickname      string  `json:"nickname"`
	Avatar        string  `json:"avatar"`
	Province      string  `json:"province"`
	City          string  `json:"city"`
	District      string  `json:"district"`
	PickupAddress string  `json:"pickup_address"`
	PickupHours   string  `json:"pickup_hours"`
	Level         int     `json:"level"`
	TotalSales    float64 `json:"total_sales"`
	Rating        float64 `json:"rating"`
}

type LeaderDashboard struct {
	Balance       float64 `json:"balance"`
	FrozenBalance float64 `json:"frozen_balance"`
	MonthlySales  float64 `json:"monthly_sales"`
	TotalSales    float64 `json:"total_sales"`
	TotalOrders   int     `json:"total_orders"`
	Level         int     `json:"level"`
}
