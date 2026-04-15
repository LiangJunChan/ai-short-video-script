package handler

import (
	"ai-short-video-backend/database"
	"ai-short-video-backend/middleware"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// CreateCollection 创建收藏夹
func CreateCollection(c *gin.Context) {
	userId := middleware.GetUserID(c)

	var req struct {
		Name        string `json:"name" binding:"required"`
		Icon        string `json:"icon"`
		Color       string `json:"color"`
		Description string `json:"description"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "请求参数错误: " + err.Error(),
		})
		return
	}

	id, err := database.CreateCollection(userId, req.Name, req.Icon, req.Color, req.Description)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "创建收藏夹失败: " + err.Error(),
		})
		return
	}

	collection, err := database.GetCollectionByIDAndUser(id, userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "获取收藏夹失败",
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "创建成功",
		Data:    collection,
	})
}

// GetCollections 获取用户的收藏夹列表
func GetCollections(c *gin.Context) {
	userId := middleware.GetUserID(c)

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	collections, total, err := database.GetCollectionsByUser(userId, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "获取收藏夹列表失败",
		})
		return
	}

	totalPages := (total + pageSize - 1) / pageSize

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "获取成功",
		Data: gin.H{
			"collections": collections,
			"pagination": gin.H{
				"page":       page,
				"pageSize":   pageSize,
				"total":      total,
				"totalPages": totalPages,
			},
		},
	})
}

// GetCollectionDetail 获取收藏夹详情及视频列表
func GetCollectionDetail(c *gin.Context) {
	userId := middleware.GetUserID(c)
	collectionId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "无效的收藏夹ID",
		})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	collection, err := database.GetCollectionByIDAndUser(collectionId, userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "获取收藏夹失败",
		})
		return
	}

	if collection == nil {
		c.JSON(http.StatusNotFound, APIResponse{
			Code:    404,
			Message: "收藏夹不存在",
		})
		return
	}

	videos, total, err := database.GetVideosByCollection(collectionId, userId, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "获取视频列表失败",
		})
		return
	}

	totalPages := (total + pageSize - 1) / pageSize

	// 转换视频格式
	videoResponses := make([]VideoResponse, len(videos))
	for i, v := range videos {
		videoResponses[i] = formatVideoResponse(v)
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "获取成功",
		Data: gin.H{
			"collection": collection,
			"videos":     videoResponses,
			"pagination": gin.H{
				"page":       page,
				"pageSize":   pageSize,
				"total":      total,
				"totalPages": totalPages,
			},
		},
	})
}

// UpdateCollection 更新收藏夹
func UpdateCollection(c *gin.Context) {
	userId := middleware.GetUserID(c)
	collectionId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "无效的收藏夹ID",
		})
		return
	}

	var req struct {
		Name        string `json:"name" binding:"required"`
		Icon        string `json:"icon"`
		Color       string `json:"color"`
		Description string `json:"description"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "请求参数错误: " + err.Error(),
		})
		return
	}

	// 检查收藏夹是否存在
	collection, err := database.GetCollectionByIDAndUser(collectionId, userId)
	if err != nil || collection == nil {
		c.JSON(http.StatusNotFound, APIResponse{
			Code:    404,
			Message: "收藏夹不存在",
		})
		return
	}

	err = database.UpdateCollection(collectionId, userId, req.Name, req.Icon, req.Color, req.Description)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "更新收藏夹失败",
		})
		return
	}

	updatedCollection, err := database.GetCollectionByIDAndUser(collectionId, userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "获取收藏夹失败",
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "更新成功",
		Data:    updatedCollection,
	})
}

// DeleteCollection 删除收藏夹
func DeleteCollection(c *gin.Context) {
	userId := middleware.GetUserID(c)
	collectionId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "无效的收藏夹ID",
		})
		return
	}

	// 检查收藏夹是否存在
	collection, err := database.GetCollectionByIDAndUser(collectionId, userId)
	if err != nil || collection == nil {
		c.JSON(http.StatusNotFound, APIResponse{
			Code:    404,
			Message: "收藏夹不存在",
		})
		return
	}

	err = database.DeleteCollection(collectionId, userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "删除收藏夹失败",
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "删除成功",
	})
}

// AddVideoToCollection 添加视频到收藏夹
func AddVideoToCollection(c *gin.Context) {
	userId := middleware.GetUserID(c)
	collectionId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "无效的收藏夹ID",
		})
		return
	}

	var req struct {
		VideoID int `json:"videoId" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "请求参数错误",
		})
		return
	}

	// 检查视频是否存在且属于该用户
	video, err := database.GetVideoByIDAndUser(req.VideoID, userId)
	if err != nil || video == nil {
		c.JSON(http.StatusNotFound, APIResponse{
			Code:    404,
			Message: "视频不存在",
		})
		return
	}

	err = database.AddVideoToCollection(collectionId, req.VideoID, userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "添加视频失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "添加成功",
	})
}

// RemoveVideoFromCollection 从收藏夹移除视频
func RemoveVideoFromCollection(c *gin.Context) {
	userId := middleware.GetUserID(c)
	collectionId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "无效的收藏夹ID",
		})
		return
	}

	videoId, err := strconv.Atoi(c.Param("videoId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "无效的视频ID",
		})
		return
	}

	err = database.RemoveVideoFromCollection(collectionId, videoId, userId)
	if err != nil {
		if err == database.ErrUserNotFound {
			c.JSON(http.StatusNotFound, APIResponse{
				Code:    404,
				Message: "收藏夹不存在",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "移除视频失败",
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "移除成功",
	})
}

// GetVideoCollections 获取包含某视频的所有收藏夹
func GetVideoCollections(c *gin.Context) {
	userId := middleware.GetUserID(c)
	videoId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "无效的视频ID",
		})
		return
	}

	collections, err := database.GetCollectionsByVideo(videoId, userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "获取收藏夹列表失败",
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "获取成功",
		Data:    collections,
	})
}
