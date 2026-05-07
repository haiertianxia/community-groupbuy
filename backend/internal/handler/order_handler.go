package handler

import (
	"community-groupbuy/internal/service"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type OrderHandler struct {
	orderService *service.OrderService
}

func NewOrderHandler(orderService *service.OrderService) *OrderHandler {
	return &OrderHandler{orderService: orderService}
}

func (h *OrderHandler) Create(c *gin.Context) {
	userID := c.GetUint64("user_id")

	var req struct {
		ActivityID uint64 `json:"activity_id" binding:"required"`
		SKUHash    string `json:"sku_hash" binding:"required"`
		Quantity   int    `json:"quantity" binding:"required,min=1"`
		AddressID  uint64 `json:"address_id" binding:"required"`
		Remark     string `json:"remark"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 1002, "message": "参数错误"})
		return
	}

	result, err := h.orderService.Create(c.Request.Context(), userID, req.ActivityID, req.SKUHash, req.Quantity, req.AddressID, req.Remark)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 3401, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "success", "data": result})
}

func (h *OrderHandler) List(c *gin.Context) {
	userID := c.GetUint64("user_id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	status, _ := strconv.ParseInt(c.DefaultQuery("status", "-1"), 10, 8)

	result, err := h.orderService.List(c.Request.Context(), userID, page, pageSize, int8(status))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 1001, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "success", "data": result})
}

func (h *OrderHandler) Detail(c *gin.Context) {
	userID := c.GetUint64("user_id")
	orderID, _ := strconv.ParseUint(c.Param("id"), 10, 64)

	order, err := h.orderService.Detail(c.Request.Context(), orderID, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"code": 3301, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "success", "data": order})
}

func (h *OrderHandler) Pay(c *gin.Context) {
	orderID, _ := strconv.ParseUint(c.Param("id"), 10, 64)

	var req struct {
		TransactionID string `json:"transaction_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 1002, "message": "参数错误"})
		return
	}

	if err := h.orderService.Pay(c.Request.Context(), orderID, req.TransactionID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 3401, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "success"})
}

func (h *OrderHandler) Cancel(c *gin.Context) {
	userID := c.GetUint64("user_id")
	orderID, _ := strconv.ParseUint(c.Param("id"), 10, 64)

	if err := h.orderService.Cancel(c.Request.Context(), orderID, userID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 3303, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "success"})
}

func (h *OrderHandler) Confirm(c *gin.Context) {
	userID := c.GetUint64("user_id")
	orderID, _ := strconv.ParseUint(c.Param("id"), 10, 64)

	if err := h.orderService.Confirm(c.Request.Context(), orderID, userID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 3303, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "success"})
}

func (h *OrderHandler) Refund(c *gin.Context) {
	userID := c.GetUint64("user_id")
	orderID, _ := strconv.ParseUint(c.Param("id"), 10, 64)

	var req struct {
		Reason string `json:"reason" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 1002, "message": "参数错误"})
		return
	}

	if err := h.orderService.ApplyRefund(c.Request.Context(), orderID, userID, req.Reason); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 3303, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "success"})
}

func (h *OrderHandler) LeaderOrders(c *gin.Context) {
	userID := c.GetUint64("user_id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	status, _ := strconv.ParseInt(c.DefaultQuery("status", "-1"), 10, 8)

	result, err := h.orderService.LeaderOrders(c.Request.Context(), userID, page, pageSize, int8(status))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 1001, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "success", "data": result})
}

func (h *OrderHandler) Ship(c *gin.Context) {
	userID := c.GetUint64("user_id")
	orderID, _ := strconv.ParseUint(c.Param("id"), 10, 64)

	var req struct {
		ExpressCompany string `json:"express_company"`
		ExpressNo      string `json:"express_no"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 1002, "message": "参数错误"})
		return
	}

	if err := h.orderService.Ship(c.Request.Context(), orderID, userID, req.ExpressCompany, req.ExpressNo); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 3303, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "success"})
}

func (h *OrderHandler) ProcessRefund(c *gin.Context) {
	userID := c.GetUint64("user_id")
	orderID, _ := strconv.ParseUint(c.Param("id"), 10, 64)

	var req struct {
		Approved bool   `json:"approved"`
		Reason   string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 1002, "message": "参数错误"})
		return
	}

	if err := h.orderService.ProcessRefund(c.Request.Context(), orderID, userID, req.Approved, req.Reason); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 3303, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "success"})
}
