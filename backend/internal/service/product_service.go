package service

import (
	"community-groupbuy/internal/model"
	"community-groupbuy/internal/repository"
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/go-redis/redis/v8"
)

type ProductService struct {
	productRepo *repository.ProductRepository
	rdb         *redis.Client
}

func NewProductService(productRepo *repository.ProductRepository, rdb *redis.Client) *ProductService {
	return &ProductService{
		productRepo: productRepo,
		rdb:         rdb,
	}
}

func (s *ProductService) List(ctx context.Context, page, pageSize int, categoryID, leaderID uint64, keyword string) (*ProductListResult, error) {
	products, total, err := s.productRepo.List(page, pageSize, categoryID, leaderID, keyword)
	if err != nil {
		return nil, err
	}

	items := make([]ProductItem, 0, len(products))
	for _, p := range products {
		items = append(items, ProductItem{
			ID:           p.ID,
			Name:         p.Name,
			SubName:      p.SubName,
			Images:       p.Images,
			GroupPrice:   s.getMinPrice(p),
			SalesCount:   p.SalesCount,
			CommentCount: p.CommentCount,
		})
	}

	return &ProductListResult{
		List:     items,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

func (s *ProductService) Detail(ctx context.Context, id uint64) (*model.Product, error) {
	cacheKey := fmt.Sprintf("product:%d", id)

	cached, err := s.rdb.Get(ctx, cacheKey).Result()
	if err == nil {
		var product model.Product
		if json.Unmarshal([]byte(cached), &product) == nil {
			return &product, nil
		}
	}

	product, err := s.productRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	if data, err := json.Marshal(product); err == nil {
		s.rdb.Set(ctx, cacheKey, data, 10*time.Minute)
	}

	return product, nil
}

func (s *ProductService) Create(ctx context.Context, leaderID uint64, req *CreateProductReq) (*model.Product, error) {
	product := &model.Product{
		Name:         req.Name,
		SubName:      req.SubName,
		CategoryID:   req.CategoryID,
		LeaderID:     leaderID,
		ProductType:  req.ProductType,
		Unit:         req.Unit,
		Images:       req.Images,
		Description:  req.Description,
		Tags:         req.Tags,
		Status:       0,
		ReviewStatus: 0,
	}

	if err := s.productRepo.Create(product); err != nil {
		return nil, err
	}

	for _, skuReq := range req.SKUs {
		sku := &model.ProductSKU{
			ProductID:  product.ID,
			SKUHash:    fmt.Sprintf("%d_%s_%d", product.ID, skuReq.Name, time.Now().UnixNano()),
			Name:       skuReq.Name,
			Price:      skuReq.Price,
			GroupPrice: skuReq.GroupPrice,
			CostPrice:  skuReq.CostPrice,
			Stock:      skuReq.Stock,
			Status:     1,
		}
		s.productRepo.CreateSKU(sku)
	}

	return product, nil
}

func (s *ProductService) getMinPrice(p model.Product) float64 {
	if len(p.SKUs) == 0 {
		return 0
	}
	minPrice := p.SKUs[0].GroupPrice
	for _, sku := range p.SKUs {
		if sku.GroupPrice < minPrice {
			minPrice = sku.GroupPrice
		}
	}
	return minPrice
}

type ProductListResult struct {
	List     []ProductItem `json:"list"`
	Total    int64         `json:"total"`
	Page     int           `json:"page"`
	PageSize int           `json:"page_size"`
}

type ProductItem struct {
	ID           uint64   `json:"id"`
	Name         string   `json:"name"`
	SubName      string   `json:"sub_name"`
	Images       []string `json:"images"`
	GroupPrice   float64  `json:"group_price"`
	SalesCount   int      `json:"sales_count"`
	CommentCount int      `json:"comment_count"`
}

type CreateProductReq struct {
	Name        string         `json:"name" binding:"required"`
	SubName     string         `json:"sub_name"`
	CategoryID  uint64         `json:"category_id" binding:"required"`
	ProductType int8           `json:"product_type"`
	Unit        string         `json:"unit"`
	Images      []string       `json:"images" binding:"required"`
	Description string         `json:"description"`
	Tags        []string       `json:"tags"`
	SKUs        []CreateSKUReq `json:"skus" binding:"required"`
}

type CreateSKUReq struct {
	Name       string  `json:"name" binding:"required"`
	Price      float64 `json:"price" binding:"required"`
	GroupPrice float64 `json:"group_price" binding:"required"`
	CostPrice  float64 `json:"cost_price"`
	Stock      int     `json:"stock" binding:"required"`
}
