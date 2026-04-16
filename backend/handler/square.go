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
	videoId, err := strconv.Atoi(videoIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "视频ID错误",
		})
		return
	}

	// 检查视频是否公开
	allow, err := database.CheckVideoIsPublic(videoId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "检查失败",
		})
		return
	}
	if !allow {
		c.JSON(http.StatusForbidden, APIResponse{
			Code:    403,
			Message: "该视频不公开",
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

	// 添加到收藏夹
	if req.CollectionID != nil {
		err := database.AddVideoToCollection(*req.CollectionID, videoId, userId)
		if err != nil {
			c.JSON(http.StatusInternalServerError, APIResponse{
				Code:    500,
				Message: "收藏失败",
			})
			return
		}
	}

	// 增加收藏计数
	_ = database.IncrementCollectCount(videoId)

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "收藏成功",
	})
}
