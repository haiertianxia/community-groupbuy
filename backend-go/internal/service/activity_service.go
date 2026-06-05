package service

import (
	"community-groupbuy/internal/model"
	"community-groupbuy/internal/repository"
	"community-groupbuy/internal/service/wxpay"
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/go-redis/redis/v8"
)

type ActivityService struct {
	activityRepo *repository.ActivityRepository
	productRepo  *repository.ProductRepository
	orderRepo    *repository.OrderRepository
	rdb          *redis.Client
	wxClient     *wxpay.Client
}

func NewActivityService(activityRepo *repository.ActivityRepository, productRepo *repository.ProductRepository, orderRepo *repository.OrderRepository, rdb *redis.Client) *ActivityService {
	return &ActivityService{
		activityRepo: activityRepo,
		productRepo:  productRepo,
		orderRepo:    orderRepo,
		rdb:          rdb,
	}
}

func (s *ActivityService) SetWxClient(client *wxpay.Client) {
	s.wxClient = client
}

func (s *ActivityService) List(ctx context.Context, page, pageSize int, status int8) (*ActivityListResult, error) {
	activities, total, err := s.activityRepo.List(page, pageSize, 0, status)
	if err != nil {
		return nil, err
	}
	items := make([]ActivityItem, 0, len(activities))
	for _, a := range activities {
		items = append(items, ActivityItem{
			ID:            a.ID,
			ActivityName:  a.ActivityName,
			Images:        a.BannerImages,
			GroupPrice:    a.GroupPrice,
			OriginalPrice: a.OriginalPrice,
			CurrentPeople: a.CurrentPeople,
			MinPeople:     a.MinPeople,
			StartTime:     a.StartTime,
			EndTime:       a.EndTime,
			Status:        a.Status,
		})
	}
	return &ActivityListResult{List: items, Total: total, Page: page, PageSize: pageSize}, nil
}

func (s *ActivityService) Detail(ctx context.Context, id uint64) (*model.GroupBuyActivity, error) {
	return s.activityRepo.FindByID(id)
}

func (s *ActivityService) Join(ctx context.Context, userID uint64, activityID uint64, addressID uint64) (*JoinResult, error) {
	activity, err := s.activityRepo.FindByID(activityID)
	if err != nil {
		return nil, errors.New("活动不存在")
	}
	if activity.Status != 1 {
		return nil, errors.New("活动不在进行中")
	}
	if time.Now().After(activity.EndTime) {
		return nil, errors.New("活动已结束")
	}
	sku, err := s.productRepo.FindSKUByHash(activity.SKUHash)
	if err != nil {
		return nil, errors.New("商品不存在")
	}
	if sku.Stock <= 0 {
		return nil, errors.New("库存不足")
	}

	groups, _ := s.activityRepo.FindGroupsByActivity(activityID, 1)
	var group *model.ActivityGroup
	isNewGroup := false

	if len(groups) > 0 {
		group = &groups[0]
	} else {
		isNewGroup = true
		group = &model.ActivityGroup{
			ActivityID:    activityID,
			GroupNo:       fmt.Sprintf("G%d", time.Now().UnixNano()),
			LeaderUserID:  activity.LeaderID,
			Status:        1,
			CurrentPeople: 1,
			MinPeople:     activity.MinPeople,
			ExpireTime:    activity.EndTime,
		}
		if err := s.activityRepo.CreateGroup(group); err != nil {
			return nil, err
		}
	}

	order := &model.Order{
		OrderNo:     fmt.Sprintf("O%d", time.Now().UnixNano()),
		UserID:      userID,
		LeaderID:    activity.LeaderID,
		ActivityID:  activityID,
		GroupID:     group.ID,
		AddressID:   addressID,
		TotalAmount: sku.GroupPrice,
		PayAmount:   sku.GroupPrice * activity.DepositRatio,
		PayStatus:   0,
		Status:      0,
		ExpiredAt:   time.Now().Add(30 * time.Minute),
	}
	if err := s.orderRepo.Create(order); err != nil {
		return nil, err
	}

	orderItem := &model.OrderItem{
		OrderID:     order.ID,
		ProductID:   activity.ProductID,
		SKUHash:     activity.SKUHash,
		ProductName: "",
		SKUName:     sku.Name,
		Image:       sku.Image,
		Price:       sku.GroupPrice,
		Quantity:    1,
		SubTotal:    sku.GroupPrice,
	}
	s.orderRepo.CreateItems([]model.OrderItem{*orderItem})

	if err := s.productRepo.UpdateStock(activity.SKUHash, 1); err != nil {
		return nil, err
	}
	if !isNewGroup {
		s.activityRepo.IncrementGroupPeople(group.ID)
	}
	s.activityRepo.IncrementPeople(activityID)

	result := &JoinResult{
		OrderID:     order.ID,
		OrderNo:     order.OrderNo,
		GroupID:     group.ID,
		GroupNo:     group.GroupNo,
		IsNewGroup:  isNewGroup,
		GroupPeople: group.CurrentPeople,
		MinPeople:   activity.MinPeople,
		PayAmount:   order.PayAmount,
		ExpiredAt:   order.ExpiredAt,
	}

	// 调用微信支付统一下单
	if s.wxClient != nil && order.PayAmount > 0 {
		notifyURL := "https://yourdomain.com/api/v1/wxpay/notify" // TODO: 替换为实际域名
		wxReq := &wxpay.UnifiedOrderRequest{
			Body:           fmt.Sprintf("社区团购-%s", activity.ActivityName),
			OutTradeNo:     order.OrderNo,
			TotalFee:       int(order.PayAmount * 100), // 分为单位
			SpbillCreateIP: "127.0.0.1",                // TODO: 从请求获取用户IP
			NotifyURL:      notifyURL,
			TradeType:      "JSAPI",
			OpenID:         "", // TODO: 从用户获取openid
		}
		wxResp, err := s.wxClient.UnifiedOrder(wxReq)
		if err == nil && wxResp.PrepayID != "" {
			result.PaymentParams = s.wxClient.JSAPIPayParams(s.wxClient.AppID, wxResp.PrepayID)
		}
	}

	return result, nil
}

func (s *ActivityService) CheckAndCloseExpired() error {
	activities, err := s.activityRepo.FindExpiredRunningActivities()
	if err != nil {
		return err
	}
	for _, activity := range activities {
		if activity.CurrentPeople >= activity.MinPeople {
			s.activityRepo.UpdateStatus(activity.ID, 2)
		} else {
			s.activityRepo.UpdateStatus(activity.ID, 4)
		}
	}
	return nil
}

func (s *ActivityService) Create(ctx context.Context, leaderID uint64, req *CreateActivityReq) (*model.GroupBuyActivity, error) {
	activity := &model.GroupBuyActivity{
		ActivityNo:      fmt.Sprintf("A%d", time.Now().UnixNano()),
		LeaderID:        leaderID,
		ProductID:       req.ProductID,
		SKUHash:         req.SKUHash,
		ActivityName:    req.ActivityName,
		StartTime:       req.StartTime,
		EndTime:         req.EndTime,
		OriginalPrice:   req.OriginalPrice,
		GroupPrice:      req.GroupPrice,
		DepositRatio:    req.DepositRatio,
		Stock:           req.Stock,
		MinPeople:       req.MinPeople,
		MaxPerUser:      req.MaxPerUser,
		Status:          0,
		BannerImages:    req.BannerImages,
		RuleDescription: req.RuleDescription,
		PickupInfo:      req.PickupInfo,
	}
	if err := s.activityRepo.Create(activity); err != nil {
		return nil, err
	}
	return activity, nil
}

func (s *ActivityService) Audit(ctx context.Context, activityID uint64, approved bool, remark string) error {
	activity, err := s.activityRepo.FindByID(activityID)
	if err != nil {
		return err
	}
	if activity.Status != 0 { // 只允许审核待审核的活动
		return errors.New("活动状态不允许审核")
	}
	if approved {
		activity.Status = 1       // 1=进行中
		activity.ReviewStatus = 1 // 1=审核通过
	} else {
		activity.Status = 3       // 3=已拒绝
		activity.ReviewStatus = 2 // 2=审核拒绝
		activity.ReviewRemark = remark
	}
	return s.activityRepo.Update(activity)
}

type ActivityListResult struct {
	List     []ActivityItem `json:"list"`
	Total    int64          `json:"total"`
	Page     int            `json:"page"`
	PageSize int            `json:"page_size"`
}

type ActivityItem struct {
	ID            uint64    `json:"id"`
	ActivityName  string    `json:"activity_name"`
	Images        []string  `json:"images"`
	GroupPrice    float64   `json:"group_price"`
	OriginalPrice float64   `json:"original_price"`
	CurrentPeople int       `json:"current_people"`
	MinPeople     int       `json:"min_people"`
	StartTime     time.Time `json:"start_time"`
	EndTime       time.Time `json:"end_time"`
	Status        int8      `json:"status"`
}

type JoinResult struct {
	OrderID       uint64            `json:"order_id"`
	OrderNo       string            `json:"order_no"`
	GroupID       uint64            `json:"group_id"`
	GroupNo       string            `json:"group_no"`
	IsNewGroup    bool              `json:"is_new_group"`
	GroupPeople   int               `json:"group_people"`
	MinPeople     int               `json:"min_people"`
	PayAmount     float64           `json:"pay_amount"`
	ExpiredAt     time.Time         `json:"expired_at"`
	PaymentParams map[string]string `json:"payment_params,omitempty"` // 微信支付参数
}

type CreateActivityReq struct {
	ProductID       uint64    `json:"product_id" binding:"required"`
	SKUHash         string    `json:"sku_hash" binding:"required"`
	ActivityName    string    `json:"activity_name" binding:"required"`
	StartTime       time.Time `json:"start_time" binding:"required"`
	EndTime         time.Time `json:"end_time" binding:"required"`
	OriginalPrice   float64   `json:"original_price" binding:"required"`
	GroupPrice      float64   `json:"group_price" binding:"required"`
	DepositRatio    float64   `json:"deposit_ratio"`
	Stock           int       `json:"stock" binding:"required"`
	MinPeople       int       `json:"min_people"`
	MaxPerUser      int       `json:"max_per_user"`
	BannerImages    []string  `json:"banner_images"`
	RuleDescription string    `json:"rule_description"`
	PickupInfo      string    `json:"pickup_info"`
}
