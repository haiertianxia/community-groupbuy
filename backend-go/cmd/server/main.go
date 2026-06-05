package main

import (
	"community-groupbuy/internal/config"
	"community-groupbuy/internal/handler"
	"community-groupbuy/internal/middleware"
	"community-groupbuy/internal/repository"
	"community-groupbuy/internal/service"
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func main() {
	// 1. 加载配置
	cfg := config.Load()

	// 2. 初始化MySQL
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		cfg.Database.Username, cfg.Database.Password, cfg.Database.Host, cfg.Database.Port, cfg.Database.Name)
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	sqlDB, _ := db.DB()
	sqlDB.SetMaxIdleConns(cfg.Database.MaxIdleConns)
	sqlDB.SetMaxOpenConns(cfg.Database.MaxOpenConns)
	sqlDB.SetConnMaxLifetime(time.Hour)

	// 3. 初始化Redis
	rdb := redis.NewClient(&redis.Options{
		Addr:     cfg.Redis.Addr,
		Password: cfg.Redis.Password,
		DB:       cfg.Redis.DB,
	})
	ctx := context.Background()
	if _, err := rdb.Ping(ctx).Result(); err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}

	// 4. 初始化仓库层
	userRepo := repository.NewUserRepository(db)
	productRepo := repository.NewProductRepository(db)
	activityRepo := repository.NewActivityRepository(db)
	orderRepo := repository.NewOrderRepository(db)
	leaderRepo := repository.NewLeaderRepository(db)

	// 5. 初始化服务层
	authService := service.NewAuthService(userRepo, rdb, cfg.JWT)
	userService := service.NewUserService(userRepo)
	productService := service.NewProductService(productRepo, rdb)
	activityService := service.NewActivityService(activityRepo, productRepo, orderRepo, rdb)
	orderService := service.NewOrderService(orderRepo, activityRepo, rdb)
	leaderService := service.NewLeaderService(leaderRepo)

	// 6. 初始化处理器
	authHandler := handler.NewAuthHandler(authService)
	userHandler := handler.NewUserHandler(userService)
	productHandler := handler.NewProductHandler(productService)
	activityHandler := handler.NewActivityHandler(activityService)
	orderHandler := handler.NewOrderHandler(orderService)
	leaderHandler := handler.NewLeaderHandler(leaderService)

	// 7. 设置Gin
	if cfg.App.Mode == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(gin.Logger())
	r.Use(gin.Recovery())
	r.Use(middleware.CORS())
	r.Use(middleware.RequestID())

	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "time": time.Now().Unix()})
	})

	// API路由
	v1 := r.Group("/api/v1")
	{
		// 认证接口（公开）
		auth := v1.Group("/auth")
		{
			auth.POST("/login", authHandler.Login)
			auth.POST("/refresh", authHandler.RefreshToken)
			auth.POST("/logout", authHandler.Logout)
		}

		// 公开接口
		products := v1.Group("/products")
		{
			products.GET("", productHandler.List)
			products.GET("/:id", productHandler.Detail)
		}

		activities := v1.Group("/activities")
		{
			activities.GET("", activityHandler.List)
			activities.GET("/:id", activityHandler.Detail)
		}

		leaders := v1.Group("/leaders")
		{
			leaders.GET("", leaderHandler.List)
			leaders.GET("/:id", leaderHandler.Detail)
		}

		// 需要认证的接口
		protected := v1.Group("")
		protected.Use(middleware.Auth(cfg.JWT))
		{
			// 用户
			users := protected.Group("/users")
			{
				users.GET("/me", userHandler.Me)
				users.PUT("/me", userHandler.UpdateProfile)
				users.GET("/addresses", userHandler.ListAddresses)
				users.POST("/addresses", userHandler.CreateAddress)
				users.PUT("/addresses/:id", userHandler.UpdateAddress)
				users.DELETE("/addresses/:id", userHandler.DeleteAddress)
			}

			// 团购
			protected.POST("/activities/:id/join", activityHandler.Join)
			protected.DELETE("/activities/:id/join", activityHandler.CancelJoin)

			// 订单
			orders := protected.Group("/orders")
			{
				orders.POST("", orderHandler.Create)
				orders.GET("", orderHandler.List)
				orders.GET("/:id", orderHandler.Detail)
				orders.POST("/:id/pay", orderHandler.Pay)
				orders.POST("/:id/cancel", orderHandler.Cancel)
				orders.POST("/:id/confirm", orderHandler.Confirm)
				orders.POST("/:id/refund", orderHandler.Refund)
			}

			// 团长相关
			leaderOrders := protected.Group("/leader/orders")
			{
				leaderOrders.Use(middleware.RequireRole("leader", "admin"))
				leaderOrders.GET("", orderHandler.LeaderOrders)
				leaderOrders.POST("/:id/ship", orderHandler.Ship)
				leaderOrders.POST("/:id/process-refund", orderHandler.ProcessRefund)
			}

			// 团长管理
			leaderProducts := protected.Group("/leader/products")
			{
				leaderProducts.Use(middleware.RequireRole("leader", "admin"))
				leaderProducts.POST("", productHandler.Create)
				leaderProducts.PUT("/:id", productHandler.Update)
				leaderProducts.DELETE("/:id", productHandler.Delete)
			}

			leaderActivities := protected.Group("/leader/activities")
			{
				leaderActivities.Use(middleware.RequireRole("leader", "admin"))
				leaderActivities.POST("", activityHandler.Create)
				leaderActivities.PUT("/:id", activityHandler.Update)
				leaderActivities.DELETE("/:id", activityHandler.Delete)
			}

			// 团长看板
			dashboard := protected.Group("/leader/dashboard")
			{
				dashboard.Use(middleware.RequireRole("leader", "admin"))
				dashboard.GET("", leaderHandler.Dashboard)
				dashboard.GET("/settlements", leaderHandler.Settlements)
				dashboard.POST("/settlements/:id/confirm", leaderHandler.ConfirmSettlement)
				dashboard.POST("/withdraw", leaderHandler.Withdraw)
			}
		}

		// 管理端接口
		admin := v1.Group("/admin")
		admin.Use(middleware.RequireRole("admin"))
		{
			admin.GET("/dashboard", handler.AdminDashboard)
			admin.GET("/users", userHandler.AdminList)
			admin.PUT("/users/:id/status", userHandler.AdminUpdateStatus)
			admin.GET("/leaders", leaderHandler.AdminList)
			admin.PUT("/leaders/:id/status", leaderHandler.AdminUpdateStatus)
			admin.PUT("/products/:id/audit", productHandler.AdminAudit)
			admin.PUT("/activities/:id/audit", activityHandler.AdminAudit)
		}
	}

	// 8. 启动服务
	srv := &http.Server{
		Addr:    fmt.Sprintf(":%d", cfg.App.Port),
		Handler: r,
	}

	go func() {
		log.Printf("Server starting on port %d...", cfg.App.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	// 优雅关闭
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	log.Println("Server exited")
}
