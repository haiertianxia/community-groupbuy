package service

import (
	"community-groupbuy/internal/config"
	"community-groupbuy/internal/middleware"
	"community-groupbuy/internal/model"
	"community-groupbuy/internal/repository"
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/golang-jwt/jwt/v5"
	"github.com/spf13/viper"
)

type AuthService struct {
	userRepo *repository.UserRepository
	rdb      *redis.Client
	cfg      config.JWTConfig
}

func NewAuthService(userRepo *repository.UserRepository, rdb *redis.Client, cfg config.JWTConfig) *AuthService {
	return &AuthService{
		userRepo: userRepo,
		rdb:      rdb,
		cfg:      cfg,
	}
}

func (s *AuthService) Login(ctx context.Context, code string) (*LoginResult, error) {
	openid := code

	user, err := s.userRepo.FindByOpenid(openid)
	if err != nil {
		user = &model.User{
			UID:      fmt.Sprintf("U%d", time.Now().UnixNano()),
			Openid:   openid,
			UserType: 1,
			Status:   1,
		}
		if err := s.userRepo.Create(user); err != nil {
			return nil, err
		}
	}

	accessToken, err := s.generateToken(user.ID, user.UserType, time.Duration(s.cfg.AccessExpiry)*time.Minute)
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.generateToken(user.ID, user.UserType, time.Duration(s.cfg.RefreshExpiry*24)*time.Hour*24)
	if err != nil {
		return nil, err
	}

	return &LoginResult{
		UserID:       user.ID,
		Token:        accessToken,
		RefreshToken: refreshToken,
		IsNewUser:    user.CreatedAt.After(time.Now().Add(-1 * time.Minute)),
	}, nil
}

func (s *AuthService) generateToken(userID uint64, userType int8, expiry time.Duration) (string, error) {
	claims := &middleware.Claims{
		UserID:   userID,
		UserType: userType,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.cfg.Secret))
}

func (s *AuthService) ValidateToken(tokenString string) (*middleware.Claims, error) {
	claims := &middleware.Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(s.cfg.Secret), nil
	})

	if err != nil || !token.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}

type LoginResult struct {
	UserID       uint64 `json:"user_id"`
	Token        string `json:"token"`
	RefreshToken string `json:"refresh_token"`
	IsNewUser    bool   `json:"is_new_user"`
	PhoneBound   bool   `json:"phone_bound"`
}
