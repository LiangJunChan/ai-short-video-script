package handler

import (
	"ai-short-video-backend/database"
	"ai-short-video-backend/middleware"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// APIResponse 统一响应格式
type APIResponse struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// VideoListResponse 视频列表响应
type VideoListResponse struct {
	Videos     []VideoResponse `json:"videos"`
	Pagination PaginationInfo `json:"pagination"`
}

// PaginationInfo 分页信息
type PaginationInfo struct {
	Page       int `json:"page"`
	PageSize   int `json:"pageSize"`
	Total      int `json:"total"`
	TotalPages int `json:"totalPages"`
}

// VideoResponse 视频详情响应
type VideoResponse struct {
	ID            int        `json:"id"`
	Title         string     `json:"title"`
	VideoUrl      string     `json:"videoUrl"`
	Thumbnail     *string    `json:"thumbnail"`
	Duration      float64    `json:"duration"`
	AIText        *string    `json:"aiText"`
	RewrittenText *string    `json:"rewrittenText"`
	RewriteStatus string     `json:"rewriteStatus"`
	Uploader      string     `json:"uploader"`
	CreatedAt     time.Time  `json:"createdAt"`
	Status        string     `json:"status"`
}

// formatVideoResponse 将database.Video转换为VideoResponse
func formatVideoResponse(v database.Video) VideoResponse {
	thumbPath := ""
	if v.Thumbnail != nil {
		thumbName := filepath.Base(*v.Thumbnail)
		thumbPath = fmt.Sprintf("/thumbnails/%s", thumbName)
	}
	return VideoResponse{
		ID:            v.ID,
		Title:         v.Title,
		VideoUrl:      fmt.Sprintf("/uploads/%s", v.Filename),
		Thumbnail:     &thumbPath,
		Duration:      v.Duration,
		AIText:        v.AIText,
		RewrittenText: v.RewrittenText,
		RewriteStatus: v.RewriteStatus,
		Uploader:      v.Uploader,
		CreatedAt:     v.CreatedAt,
		Status:        v.Status,
	}
}

// GetVideoList 获取视频列表
func GetVideoList(c *gin.Context) {
	userId := middleware.GetUserID(c)
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "12"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 12
	}

	videos, total, err := database.GetAllVideos(page, pageSize, userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "获取视频列表失败",
			Data:    nil,
		})
		return
	}

	totalPages := (total + pageSize - 1) / pageSize

	// 转换为 VideoResponse
	videoResponses := make([]VideoResponse, len(videos))
	for i, v := range videos {
		videoResponses[i] = formatVideoResponse(v)
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "获取成功",
		Data: VideoListResponse{
			Videos: videoResponses,
			Pagination: PaginationInfo{
				Page:       page,
				PageSize:   pageSize,
				Total:      total,
				TotalPages: totalPages,
			},
		},
	})
}

// GetVideoDetail 获取视频详情
func GetVideoDetail(c *gin.Context) {
	userId := middleware.GetUserID(c)
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "无效的视频ID",
			Data:    nil,
		})
		return
	}

	video, err := database.GetVideoByIDAndUser(id, userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "获取视频详情失败",
			Data:    nil,
		})
		return
	}

	if video == nil {
		c.JSON(http.StatusNotFound, APIResponse{
			Code:    404,
			Message: "视频不存在",
			Data:    nil,
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "获取成功",
		Data:    formatVideoResponse(*video),
	})
}

// DeleteVideo 删除视频
func DeleteVideo(c *gin.Context) {
	userId := middleware.GetUserID(c)
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "无效的视频ID",
			Data:    nil,
		})
		return
	}

	video, err := database.GetVideoByIDAndUser(id, userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "获取视频信息失败",
			Data:    nil,
		})
		return
	}

	if video == nil {
		c.JSON(http.StatusNotFound, APIResponse{
			Code:    404,
			Message: "视频不存在",
			Data:    nil,
		})
		return
	}

	// 删除视频文件
	videoPath := "../uploads/" + video.Filename
	os.Remove(videoPath)

	// 删除缩略图
	if video.Thumbnail != nil && *video.Thumbnail != "" {
		thumbnailPath := "../" + *video.Thumbnail
		os.Remove(thumbnailPath)
	}

	// 删除音频文件
	ext := filepath.Ext(video.Filename)
	baseName := video.Filename[:len(video.Filename)-len(ext)]
	audioPath := filepath.Join("../audio", baseName+".wav")
	os.Remove(audioPath)

	// 删除 video_credits 记录
	database.DB.Exec("DELETE FROM video_credits WHERE video_id = ?", id)

	// 从数据库删除记录
	_, err = database.DB.Exec("DELETE FROM videos WHERE id = ?", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "删除视频记录失败",
			Data:    nil,
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "删除成功",
		Data:    nil,
	})
}

// GetVideoText 获取视频文案用于复制
func GetVideoText(c *gin.Context) {
	userId := middleware.GetUserID(c)
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "无效的视频ID",
			Data:    nil,
		})
		return
	}

	video, err := database.GetVideoByIDAndUser(id, userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "获取文案失败",
			Data:    nil,
		})
		return
	}

	if video == nil {
		c.JSON(http.StatusNotFound, APIResponse{
			Code:    404,
			Message: "视频不存在",
			Data:    nil,
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "获取成功",
		Data: gin.H{
			"text": video.AIText,
		},
	})
}
