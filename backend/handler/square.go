package handler

import (
	"net/http"
	"strconv"

	"ai-short-video-backend/database"
	"ai-short-video-backend/middleware"

	"github.com/gin-gonic/gin"
)

// GetPublicVideos 获取公开视频列表
func GetPublicVideos(c *gin.Context) {
	page, err := strconv.Atoi(c.DefaultQuery("page", "1"))
	if err != nil || page < 1 {
		page = 1
	}

	pageSize, err := strconv.Atoi(c.DefaultQuery("pageSize", "12"))
	if err != nil || pageSize < 1 {
		pageSize = 12
	}

	sortBy := c.DefaultQuery("sortBy", "newest")

	videos, total, err := database.GetPublicVideos(page, pageSize, sortBy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "获取列表失败",
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code: 200,
		Data: gin.H{
			"videos": videos,
			"pagination": gin.H{
				"page":        page,
				"pageSize":    pageSize,
				"total":       total,
				"totalPages":  (total + pageSize - 1) / pageSize,
			},
		},
	})
}

// CollectSquareVideo 收藏广场视频到个人素材库
func CollectSquareVideo(c *gin.Context) {
	userId := middleware.GetUserID(c)
	videoIdStr := c.Param("id")
	originalVideoId, err := strconv.Atoi(videoIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "视频ID错误",
		})
		return
	}

	var req struct {
		CollectionID *int `json:"collectionId"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "参数错误",
		})
		return
	}

	// 创建视频副本（核心改动）
	newVideoId, err := database.CollectSquareVideo(userId, req.CollectionID, originalVideoId)
	if err != nil {
		if err.Error() == "video is not public" {
			c.JSON(http.StatusForbidden, APIResponse{
				Code:    403,
				Message: "该视频不公开",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "收藏失败",
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "收藏成功",
		Data: gin.H{
			"newVideoId": newVideoId,
		},
	})
}
