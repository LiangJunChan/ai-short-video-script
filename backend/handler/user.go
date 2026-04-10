package handler

import (
	"net/http"

	"ai-short-video-backend/database"
	"ai-short-video-backend/middleware"

	"github.com/gin-gonic/gin"
)

// CheckinStatus 获取签到状态
func CheckinStatus(c *gin.Context) {
	userId := middleware.GetUserID(c)

	checkedIn, lastCheckinAt, err := database.GetTodayCheckinStatus(userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "获取签到状态失败",
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "获取成功",
		Data: gin.H{
			"checkedIn":     checkedIn,
			"lastCheckinAt": lastCheckinAt,
		},
	})
}

// DoCheckin 执行签到
func DoCheckin(c *gin.Context) {
	userId := middleware.GetUserID(c)

	newCredits, err := database.DoCheckin(userId)
	if err != nil {
		if err.Error() == "今日已签到" {
			c.JSON(http.StatusBadRequest, APIResponse{
				Code:    400,
				Message: "今日已签到",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "签到失败",
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "签到成功，获得50积分",
		Data: gin.H{
			"credits": newCredits,
		},
	})
}
