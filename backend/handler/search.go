package handler

import (
	"ai-short-video-backend/database"
	"ai-short-video-backend/middleware"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// SearchVideos 搜索视频
func SearchVideos(c *gin.Context) {
	userId := middleware.GetUserID(c)

	keyword := c.Query("keyword")
	sortBy := c.DefaultQuery("sort", "time_desc")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	// 可选的标签筛选
	var tagId *int
	if tagIdStr := c.Query("tagId"); tagIdStr != "" {
		id, err := strconv.Atoi(tagIdStr)
		if err == nil {
			tagId = &id
		}
	}

	// 可选的收藏夹筛选
	var collectionId *int
	if collectionIdStr := c.Query("collectionId"); collectionIdStr != "" {
		id, err := strconv.Atoi(collectionIdStr)
		if err == nil {
			collectionId = &id
		}
	}

	// 保存搜索历史（如果有关键词）
	if keyword != "" {
		database.SaveSearchHistory(userId, keyword)
	}

	videos, total, err := database.SearchVideos(userId, keyword, tagId, collectionId, sortBy, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "搜索失败",
		})
		return
	}

	totalPages := (total + pageSize - 1) / pageSize

	videoResponses := make([]VideoResponse, len(videos))
	for i, v := range videos {
		videoResponses[i] = formatVideoResponse(v)
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "搜索成功",
		Data: gin.H{
			"videos": videoResponses,
			"pagination": gin.H{
				"page":       page,
				"pageSize":   pageSize,
				"total":      total,
				"totalPages": totalPages,
			},
		},
	})
}

// GetSearchHistory 获取搜索历史
func GetSearchHistory(c *gin.Context) {
	userId := middleware.GetUserID(c)

	histories, err := database.GetSearchHistory(userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "获取搜索历史失败",
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "获取成功",
		Data:    histories,
	})
}

// ClearSearchHistory 清空搜索历史
func ClearSearchHistory(c *gin.Context) {
	userId := middleware.GetUserID(c)

	err := database.ClearSearchHistory(userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "清空搜索历史失败",
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "清空成功",
	})
}
