package service

import (
	"community-groupbuy/internal/model"
	"community-groupbuy/internal/repository"
	"context"
)

type UserService struct {
	userRepo *repository.UserRepository
}

func NewUserService(userRepo *repository.UserRepository) *UserService {
	return &UserService{userRepo: userRepo}
}

func (s *UserService) GetProfile(ctx context.Context, userID uint64) (*model.User, error) {
	return s.userRepo.FindByID(userID)
}

func (s *UserService) UpdateProfile(ctx context.Context, userID uint64, req *UpdateProfileReq) error {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return err
	}

	if req.Nickname != "" {
		user.Nickname = req.Nickname
	}
	if req.Avatar != "" {
		user.Avatar = req.Avatar
	}
	if req.Phone != "" {
		user.Phone = req.Phone
	}

	return s.userRepo.Update(user)
}

func (s *UserService) ListAddresses(ctx context.Context, userID uint64) ([]model.UserAddress, error) {
	return nil, nil
}

func (s *UserService) CreateAddress(ctx context.Context, userID uint64, req *CreateAddressReq) error {
	return nil
}

func (s *UserService) UpdateAddress(ctx context.Context, userID, addressID uint64, req *UpdateAddressReq) error {
	return nil
}

func (s *UserService) DeleteAddress(ctx context.Context, userID, addressID uint64) error {
	return nil
}

type UpdateProfileReq struct {
	Nickname string `json:"nickname"`
	Avatar   string `json:"avatar"`
	Phone    string `json:"phone"`
}

type CreateAddressReq struct {
	Consignee string  `json:"consignee" binding:"required"`
	Phone     string  `json:"phone" binding:"required"`
	Province  string  `json:"province" binding:"required"`
	City      string  `json:"city" binding:"required"`
	District  string  `json:"district" binding:"required"`
	Address   string  `json:"address" binding:"required"`
	IsDefault bool    `json:"is_default"`
	Label     string  `json:"label"`
	Longitude float64 `json:"longitude"`
	Latitude  float64 `json:"latitude"`
}

type UpdateAddressReq struct {
	Consignee string  `json:"consignee"`
	Phone     string  `json:"phone"`
	Province  string  `json:"province"`
	City      string  `json:"city"`
	District  string  `json:"district"`
	Address   string  `json:"address"`
	IsDefault bool    `json:"is_default"`
	Label     string  `json:"label"`
	Longitude float64 `json:"longitude"`
	Latitude  float64 `json:"latitude"`
}
