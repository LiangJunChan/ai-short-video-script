package handler

import (
	"ai-short-video-backend/database"
	"ai-short-video-backend/middleware"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// AddTagToVideo 给视频添加标签
func AddTagToVideo(c *gin.Context) {
	userId := middleware.GetUserID(c)
	videoId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "无效的视频ID",
		})
		return
	}

	var req struct {
		TagName string `json:"tagName" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "请求参数错误",
		})
		return
	}

	// 检查视频是否存在且属于该用户
	video, err := database.GetVideoByIDAndUser(videoId, userId)
	if err != nil || video == nil {
		c.JSON(http.StatusNotFound, APIResponse{
			Code:    404,
			Message: "视频不存在",
		})
		return
	}

	// 创建或获取标签
	tagId, err := database.CreateOrGetTag(userId, req.TagName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "创建标签失败",
		})
		return
	}

	// 添加标签到视频
	err = database.AddTagToVideo(videoId, tagId, userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "添加标签失败",
		})
		return
	}

	// 获取标签信息
	tags, err := database.GetTagsByVideo(videoId, userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "获取标签失败",
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "添加成功",
		Data:    tags,
	})
}

// RemoveTagFromVideo 移除视频的标签
func RemoveTagFromVideo(c *gin.Context) {
	userId := middleware.GetUserID(c)
	videoId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "无效的视频ID",
		})
		return
	}

	tagId, err := strconv.Atoi(c.Param("tagId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "无效的标签ID",
		})
		return
	}

	err = database.RemoveTagFromVideo(videoId, tagId, userId)
	if err != nil {
		if err == database.ErrUserNotFound {
			c.JSON(http.StatusNotFound, APIResponse{
				Code:    404,
				Message: "标签不存在",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "移除标签失败",
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "移除成功",
	})
}

// GetVideoTags 获取视频的标签列表
func GetVideoTags(c *gin.Context) {
	userId := middleware.GetUserID(c)
	videoId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "无效的视频ID",
		})
		return
	}

	tags, err := database.GetTagsByVideo(videoId, userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "获取标签失败",
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "获取成功",
		Data:    tags,
	})
}

// GetTags 获取用户的所有标签
func GetTags(c *gin.Context) {
	userId := middleware.GetUserID(c)

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 200 {
		pageSize = 50
	}

	tags, total, err := database.GetTagsByUser(userId, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "获取标签列表失败",
		})
		return
	}

	totalPages := (total + pageSize - 1) / pageSize

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "获取成功",
		Data: gin.H{
			"tags": tags,
			"pagination": gin.H{
				"page":       page,
				"pageSize":   pageSize,
				"total":      total,
				"totalPages": totalPages,
			},
		},
	})
}

// GetTagVideos 获取某标签下的所有视频
func GetTagVideos(c *gin.Context) {
	userId := middleware.GetUserID(c)
	tagId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "无效的标签ID",
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

	videos, total, err := database.GetVideosByTag(tagId, userId, page, pageSize)
	if err != nil {
		if err == database.ErrUserNotFound {
			c.JSON(http.StatusNotFound, APIResponse{
				Code:    404,
				Message: "标签不存在",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "获取视频列表失败",
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
		Message: "获取成功",
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

// DeleteTag 删除标签
func DeleteTag(c *gin.Context) {
	userId := middleware.GetUserID(c)
	tagId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "无效的标签ID",
		})
		return
	}

	err = database.DeleteTag(tagId, userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "删除标签失败",
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "删除成功",
	})
}

// SearchTags 搜索标签（用于标签建议）
func SearchTags(c *gin.Context) {
	userId := middleware.GetUserID(c)
	query := c.Query("q")

	if query == "" {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "搜索关键词不能为空",
		})
		return
	}

	tags, err := database.SearchTagsByName(userId, query, 10)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "搜索标签失败",
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "获取成功",
		Data:    tags,
	})
}
