package handler

import (
	"community-groupbuy/internal/service"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type ActivityHandler struct {
	activityService *service.ActivityService
}

func NewActivityHandler(activityService *service.ActivityService) *ActivityHandler {
	return &ActivityHandler{activityService: activityService}
}

func (h *ActivityHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	status, _ := strconv.ParseInt(c.DefaultQuery("status", "-1"), 10, 8)

	result, err := h.activityService.List(c.Request.Context(), page, pageSize, int8(status))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 1001, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "success", "data": result})
}

func (h *ActivityHandler) Detail(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)

	activity, err := h.activityService.Detail(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"code": 3201, "message": "活动不存在"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "success", "data": activity})
}

func (h *ActivityHandler) Join(c *gin.Context) {
	userID := c.GetUint64("user_id")
	activityID, _ := strconv.ParseUint(c.Param("id"), 10, 64)

	var req struct {
		AddressID uint64 `json:"address_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 1002, "message": "参数错误"})
		return
	}

	result, err := h.activityService.Join(c.Request.Context(), userID, activityID, req.AddressID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 3202, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "success", "data": result})
}

func (h *ActivityHandler) CancelJoin(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "success"})
}

func (h *ActivityHandler) Create(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "success"})
}

func (h *ActivityHandler) Update(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "success"})
}

func (h *ActivityHandler) Delete(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "success"})
}

func (h *ActivityHandler) AdminAudit(c *gin.Context) {
	activityID, _ := strconv.ParseUint(c.Param("id"), 10, 64)

	var req struct {
		Approved bool   `json:"approved"`
		Remark   string `json:"remark"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 1002, "message": "参数错误"})
		return
	}

	if err := h.activityService.Audit(c.Request.Context(), activityID, req.Approved, req.Remark); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 3203, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "success"})
}
