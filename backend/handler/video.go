package handler

import (
	"ai-short-video-backend/database"
	"ai-short-video-backend/service"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// APIResponse 统一响应格式
type APIResponse struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// VideoListResponse 视频列表响应
type VideoListResponse struct {
	Videos     []database.Video `json:"videos"`
	Pagination PaginationInfo  `json:"pagination"`
}

// PaginationInfo 分页信息
type PaginationInfo struct {
	Page      int `json:"page"`
	PageSize  int `json:"pageSize"`
	Total     int `json:"total"`
	TotalPages int `json:"totalPages"`
}

// GetVideoList 获取视频列表
func GetVideoList(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "12"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 12
	}

	videos, total, err := database.GetAllVideos(page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "获取视频列表失败",
			Data:    nil,
		})
		return
	}

	totalPages := (total + pageSize - 1) / pageSize

	// 处理缩略图路径
	for i := range videos {
		if videos[i].Thumbnail != nil {
			thumbName := filepath.Base(*videos[i].Thumbnail)
			thumbPath := fmt.Sprintf("/thumbnails/%s", thumbName)
			videos[i].Thumbnail = &thumbPath
		}
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "获取成功",
		Data: VideoListResponse{
			Videos: videos,
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

	video, err := database.GetVideoByID(id)
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

	// 处理路径
	if video.Thumbnail != nil {
		thumbName := filepath.Base(*video.Thumbnail)
		thumbPath := fmt.Sprintf("/thumbnails/%s", thumbName)
		video.Thumbnail = &thumbPath
	}

	videoURL := fmt.Sprintf("/uploads/%s", video.Filename)

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "获取成功",
		Data: gin.H{
			"id":        video.ID,
			"title":     video.Title,
			"filename":  video.Filename,
			"videoUrl":  videoURL,
			"thumbnail": video.Thumbnail,
			"duration":  video.Duration,
			"size":      video.Size,
			"ai_text":   video.AIText,
			"uploader":  video.Uploader,
			"createdAt": video.CreatedAt,
			"status":    video.Status,
		},
	})
}

// UploadVideo 上传视频
func UploadVideo(c *gin.Context) {
	file, err := c.FormFile("video")
	if err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "没有上传文件",
			Data:    nil,
		})
		return
	}

	// 验证文件格式
	if !service.ValidateVideoFormat(file.Filename) {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "不支持的文件格式，仅支持MP4、FLV、MOV格式",
			Data:    nil,
		})
		return
	}

	// 验证文件大小 (4GB)
	if file.Size > 4*1024*1024*1024 {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "文件大小不能超过4GB",
			Data:    nil,
		})
		return
	}

	title := c.DefaultPostForm("title", "")
	uploader := c.DefaultPostForm("uploader", "匿名用户")

	if title == "" {
		title = file.Filename[:len(file.Filename)-len(filepath.Ext(file.Filename))]
	}

	// 生成唯一文件名
	ext := filepath.Ext(file.Filename)
	uuid := uuid.New().String()
	newFilename := fmt.Sprintf("video_%s%s", uuid, ext)
	savePath := filepath.Join("../uploads", newFilename)

	// 保存文件
	if err := c.SaveUploadedFile(file, savePath); err != nil {
		log.Printf("Failed to save uploaded file: %v", err)
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "保存文件失败",
			Data:    nil,
		})
		return
	}

	// 获取视频时长
	duration, err := service.GetVideoDuration(savePath)
	if err != nil {
		os.Remove(savePath)
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "无法读取视频信息",
			Data:    nil,
		})
		return
	}

	// 验证时长
	if valid, msg := service.ValidateVideoDuration(duration); !valid {
		os.Remove(savePath)
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: msg,
			Data:    nil,
		})
		return
	}

	// 生成缩略图
	thumbFilename := fmt.Sprintf("thumb_%s.jpg", uuid)
	thumbPath := filepath.Join("../thumbnails", thumbFilename)
	err = service.CaptureThumbnail(savePath, thumbPath)
	if err != nil {
		log.Printf("Failed to capture thumbnail: %v", err)
		thumbPath = ""
	}

	// 创建数据库记录
	id, err := database.CreateVideo(
		title,
		newFilename,
		file.Filename,
		thumbPath,
		duration,
		file.Size,
		file.Header.Get("Content-Type"),
		uploader,
	)
	if err != nil {
		os.Remove(savePath)
		if thumbPath != "" {
			os.Remove(thumbPath)
		}
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "创建记录失败",
			Data:    nil,
		})
		return
	}

	// 异步AI处理
	go service.ProcessVideoAI(id, savePath)

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "上传成功，正在提取文案...",
		Data: gin.H{
			"id":    id,
			"title": title,
		},
	})
}

// GetVideoText 获取视频文案用于复制
func GetVideoText(c *gin.Context) {
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

	video, err := database.GetVideoByID(id)
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
