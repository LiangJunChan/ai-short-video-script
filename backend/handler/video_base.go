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
	IsOwner       bool       `json:"isOwner"`
	HasExtracted  bool       `json:"hasExtracted"`
}

// formatVideoResponse 将database.Video和UserVideo合并转换为VideoResponse
// 如果非所有者且未提取，则清空敏感字段
func formatVideoResponse(v database.Video, uv *database.UserVideo, isOwner bool) VideoResponse {
	thumbPath := ""
	if v.Thumbnail != nil {
		thumbName := filepath.Base(*v.Thumbnail)
		thumbPath = fmt.Sprintf("/thumbnails/%s", thumbName)
	}

	resp := VideoResponse{
		ID:            v.ID,
		Title:         v.Title,
		VideoUrl:      fmt.Sprintf("/uploads/%s", v.Filename),
		Thumbnail:     &thumbPath,
		Duration:      v.Duration,
		AIText:        nil,
		RewrittenText: nil,
		RewriteStatus: "idle",
		Uploader:      v.Uploader,
		CreatedAt:     v.CreatedAt,
		Status:        v.Status,
		IsOwner:       isOwner,
		HasExtracted:  false,
	}

	// For owner: fallback to original data if user_videos is empty
	if isOwner {
		resp.AIText = v.AIText
		resp.RewrittenText = v.RewrittenText
		resp.RewriteStatus = v.RewriteStatus
		resp.HasExtracted = v.Status == "done"
	}

	// Fill user-specific content (overrides original if exists)
	if uv != nil {
		if uv.Text != nil {
			resp.AIText = uv.Text
		}
		// Always keep HasExtracted in sync with user_videos
		resp.HasExtracted = uv.Extracted
		if uv.RewrittenText != nil {
			resp.RewrittenText = uv.RewrittenText
		}
		resp.RewriteStatus = uv.RewriteStatus
	}

	// If not owner and not extracted, clear content
	if !isOwner && (uv == nil || !uv.Extracted) {
		resp.AIText = nil
		resp.RewrittenText = nil
		resp.HasExtracted = false
	}

	return resp
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
		isOwner := v.UserID == userId
		userVideo, _ := database.GetUserVideo(userId, v.ID)
		videoResponses[i] = formatVideoResponse(v, userVideo, isOwner)
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
// 公开视频：所有人可访问，非所有者仅能看到公开信息，文案需要付费提取
func GetVideoDetail(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "ID错误",
		})
		return
	}

	userId := middleware.GetUserID(c)

	// 1. 获取视频基础信息（不需要用户校验）
	video, err := database.GetVideoByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "获取失败",
		})
		return
	}

	if video == nil {
		c.JSON(http.StatusNotFound, APIResponse{
			Code:    404,
			Message: "视频不存在",
		})
		return
	}

	// 2. 判断是否是所有者
	isOwner := video.UserID == userId

	// 3. 获取当前用户对该视频的提取状态
	userVideo, err := database.GetUserVideo(userId, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "获取用户状态失败",
		})
		return
	}

	// 4. 如果用户第一次访问，确保记录存在
	if userVideo == nil {
		database.EnsureUserVideoExists(userId, id)
		userVideo, _ = database.GetUserVideo(userId, id)
	}

	c.JSON(http.StatusOK, APIResponse{
		Code: 200,
		Data: formatVideoResponse(*video, userVideo, isOwner),
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
