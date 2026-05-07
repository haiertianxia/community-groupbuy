package handler

import (
	"community-groupbuy/internal/service"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type LeaderHandler struct {
	leaderService *service.LeaderService
}

func NewLeaderHandler(leaderService *service.LeaderService) *LeaderHandler {
	return &LeaderHandler{leaderService: leaderService}
}

func (h *LeaderHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	province := c.Query("province")
	city := c.Query("city")

	result, err := h.leaderService.List(c.Request.Context(), page, pageSize, province, city)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 1001, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "success", "data": result})
}

func (h *LeaderHandler) Detail(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)

	leader, err := h.leaderService.GetLeader(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"code": 4001, "message": "团长不存在"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "success", "data": leader})
}

func (h *LeaderHandler) Dashboard(c *gin.Context) {
	userID := c.GetUint64("user_id")

	dashboard, err := h.leaderService.Dashboard(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 1001, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "success", "data": dashboard})
}

func (h *LeaderHandler) Settlements(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "success", "data": []interface{}{}})
}

func (h *LeaderHandler) ConfirmSettlement(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "success"})
}

func (h *LeaderHandler) Withdraw(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "success"})
}

func (h *LeaderHandler) AdminList(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	status, _ := strconv.ParseInt(c.DefaultQuery("status", "-1"), 10, 8)

	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "success", "data": gin.H{
		"list":      []interface{}{},
		"total":     0,
		"page":      page,
		"page_size": pageSize,
	}})
}

func (h *LeaderHandler) AdminUpdateStatus(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "success"})
}

func AdminDashboard(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "success", "data": gin.H{
		"total_users":   0,
		"total_leaders": 0,
		"total_orders":  0,
		"total_gmv":     0,
		"today_orders":  0,
		"today_gmv":     0,
	}})
}
