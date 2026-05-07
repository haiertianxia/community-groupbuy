package repository

import (
	"community-groupbuy/internal/model"
	"gorm.io/gorm"
)

type ProductRepository struct {
	db *gorm.DB
}

func NewProductRepository(db *gorm.DB) *ProductRepository {
	return &ProductRepository{db: db}
}

func (r *ProductRepository) Create(product *model.Product) error {
	return r.db.Create(product).Error
}

func (r *ProductRepository) Update(product *model.Product) error {
	return r.db.Save(product).Error
}

func (r *ProductRepository) FindByID(id uint64) (*model.Product, error) {
	var product model.Product
	if err := r.db.Preload("SKUs").First(&product, id).Error; err != nil {
		return nil, err
	}
	return &product, nil
}

func (r *ProductRepository) List(page, pageSize int, categoryID uint64, leaderID uint64, keyword string) ([]model.Product, int64, error) {
	var products []model.Product
	var total int64

	query := r.db.Model(&model.Product{}).Where("status = 1")

	if categoryID > 0 {
		query = query.Where("category_id = ?", categoryID)
	}
	if leaderID > 0 {
		query = query.Where("leader_id = ?", leaderID)
	}
	if keyword != "" {
		query = query.Where("name LIKE ?", "%"+keyword+"%")
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Order("sales_count DESC, created_at DESC").Find(&products).Error; err != nil {
		return nil, 0, err
	}

	return products, total, nil
}

func (r *ProductRepository) FindSKUByHash(skuHash string) (*model.ProductSKU, error) {
	var sku model.ProductSKU
	if err := r.db.Where("sku_hash = ?", skuHash).First(&sku).Error; err != nil {
		return nil, err
	}
	return &sku, nil
}

func (r *ProductRepository) CreateSKU(sku *model.ProductSKU) error {
	return r.db.Create(sku).Error
}

func (r *ProductRepository) UpdateStock(skuHash string, quantity int) error {
	return r.db.Model(&model.ProductSKU{}).Where("sku_hash = ?", skuHash).
		Update("stock", gorm.Expr("stock - ?", quantity)).Error
}

func (r *ProductRepository) IncrementSales(productID uint64, count int) error {
	return r.db.Model(&model.Product{}).Where("id = ?", productID).
		Update("sales_count", gorm.Expr("sales_count + ?", count)).Error
}

func (r *ProductRepository) ListCategories() ([]model.Category, error) {
	var categories []model.Category
	if err := r.db.Where("status = 1").Order("sort ASC").Find(&categories).Error; err != nil {
		return nil, err
	}
	return categories, nil
}
