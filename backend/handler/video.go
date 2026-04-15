package handler

import (
	"ai-short-video-backend/database"
	"ai-short-video-backend/middleware"
	"ai-short-video-backend/service"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

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
		thumbPath := ""
		if v.Thumbnail != nil {
			thumbName := filepath.Base(*v.Thumbnail)
			thumbPath = fmt.Sprintf("/thumbnails/%s", thumbName)
		}
		videoResponses[i] = VideoResponse{
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
		Data: VideoResponse{
			ID:            video.ID,
			Title:         video.Title,
			VideoUrl:      videoURL,
			Thumbnail:     video.Thumbnail,
			Duration:      video.Duration,
			AIText:        video.AIText,
			RewrittenText: video.RewrittenText,
			RewriteStatus: video.RewriteStatus,
			Uploader:      video.Uploader,
			CreatedAt:     video.CreatedAt,
			Status:        video.Status,
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

	userId := middleware.GetUserID(c)
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
		userId,
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

	// 扣减提取文案积分（上传触发首次提取，同步扣减）
	if err := service.DeductExtractCredits(userId, id); err != nil {
		if errors.Is(err, service.ErrInsufficientCredits) {
			// 删除已创建的文件和记录
			os.Remove(savePath)
			if thumbPath != "" {
				os.Remove(thumbPath)
			}
			database.DB.Exec("DELETE FROM video_credits WHERE video_id = ?", id)
			database.DB.Exec("DELETE FROM videos WHERE id = ?", id)
			c.JSON(http.StatusPaymentRequired, APIResponse{
				Code:    402,
				Message: "积分不足，上传视频需要5积分，请充值后再试",
			})
			return
		}
		// 其他错误继续执行，不阻止上传
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

// RewriteVideoText AI 改写视频文案
func RewriteVideoText(c *gin.Context) {
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

	var reqBody struct {
		Prompt string `json:"prompt" binding:"required"`
	}
	if err := c.ShouldBindJSON(&reqBody); err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "请提供改写提示词",
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

	if video.AIText == nil || *video.AIText == "" {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "没有可改写的原文案",
			Data:    nil,
		})
		return
	}

	// 扣减积分
	if err := service.DeductRewriteCredits(userId, id); err != nil {
		if errors.Is(err, service.ErrInsufficientCredits) {
			c.JSON(http.StatusPaymentRequired, APIResponse{
				Code:    402,
				Message: "积分不足，AI改写需要10积分，请充值后再试",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "扣减积分失败",
		})
		return
	}

	// 设置改写状态为进行中
	database.UpdateRewriteStatus(id, "rewriting")

	rewrittenText, err := service.RewriteText(*video.AIText, reqBody.Prompt)
	if err != nil {
		database.UpdateRewriteStatus(id, "failed")
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: fmt.Sprintf("改写失败: %v", err),
			Data:    nil,
		})
		return
	}

	// 保存改写结果到数据库
	rewrittenTextPtr := &rewrittenText
	if err := database.UpdateVideoRewrittenText(id, rewrittenTextPtr); err != nil {
		log.Printf("Failed to save rewritten text for video %d: %v", id, err)
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "改写成功",
		Data: gin.H{
			"text": rewrittenText,
		},
	})
}

// ReextractVideo 重新提取视频文案
func ReextractVideo(c *gin.Context) {
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

	// 扣减积分
	if err := service.DeductExtractCredits(userId, id); err != nil {
		if errors.Is(err, service.ErrInsufficientCredits) {
			c.JSON(http.StatusPaymentRequired, APIResponse{
				Code:    402,
				Message: "积分不足，重新提取需要5积分，请充值后再试",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "扣减积分失败",
		})
		return
	}

	// 重置状态为 processing
	err = database.UpdateVideoAIResult(id, nil, "processing")
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "重置状态失败",
			Data:    nil,
		})
		return
	}

	// 重新触发 AI 处理
	videoPath := "../uploads/" + video.Filename
	go service.ProcessVideoAI(id, videoPath)

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "已开始重新提取文案",
		Data:    nil,
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

// ExtractVideoByURL 通过链接提取视频文案
func ExtractVideoByURL(c *gin.Context) {
	type Request struct {
		URL      string `json:"url" binding:"required"`
		Title    string `json:"title"`
		Uploader string `json:"uploader"`
	}

	var req Request
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "请提供有效的视频链接",
			Data:    nil,
		})
		return
	}

	if !service.ValidateDouyinURL(req.URL) {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "目前仅支持抖音链接，请输入有效的抖音分享链接",
			Data:    nil,
		})
		return
	}

	userId := middleware.GetUserID(c)

	// 解析链接并下载视频
	savePath, filename, extractedTitle, err := service.ExtractVideoByDouyinURL(req.URL)
	if err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: err.Error(),
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
			Message: "无法读取视频信息: " + err.Error(),
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
	uuid := strings.TrimPrefix(filename, "video_")
	uuid = strings.TrimSuffix(uuid, ".mp4")
	thumbFilename := fmt.Sprintf("thumb_%s.jpg", uuid)
	thumbPath := fmt.Sprintf("../thumbnails/%s", thumbFilename)
	err = service.CaptureThumbnail(savePath, thumbPath)
	if err != nil {
		log.Printf("Failed to capture thumbnail: %v", err)
		thumbPath = ""
	}

	// 设置标题：如果请求中没有提供，使用提取到的标题
	title := req.Title
	if title == "" {
		if extractedTitle != "" {
			title = extractedTitle
		} else {
			title = "抖音视频"
		}
	}
	uploader := req.Uploader
	if uploader == "" {
		uploader = "匿名用户"
	}

	// 获取实际文件大小
	fileInfo, err := os.Stat(savePath)
	if err != nil {
		os.Remove(savePath)
		if thumbPath != "" {
			os.Remove(thumbPath)
		}
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "获取文件信息失败: " + err.Error(),
			Data:    nil,
		})
		return
	}
	fileSize := fileInfo.Size()

	// 创建数据库记录
	id, err := database.CreateVideo(
		title,
		filename,
		filename, // original filename
		thumbPath,
		duration,
		fileSize, // size - actual file size from os.Stat
		"video/mp4",         // content-type
		uploader,
		userId,
	)
	if err != nil {
		os.Remove(savePath)
		if thumbPath != "" {
			os.Remove(thumbPath)
		}
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "创建记录失败: " + err.Error(),
			Data:    nil,
		})
		return
	}

	// 扣减积分
	if err := service.DeductExtractCredits(userId, id); err != nil {
		if errors.Is(err, service.ErrInsufficientCredits) {
			// 删除已创建的文件和记录
			os.Remove(savePath)
			if thumbPath != "" {
				os.Remove(thumbPath)
			}
			database.DB.Exec("DELETE FROM video_credits WHERE video_id = ?", id)
			database.DB.Exec("DELETE FROM videos WHERE id = ?", id)
			c.JSON(http.StatusPaymentRequired, APIResponse{
				Code:    402,
				Message: "积分不足，提取文案需要5积分，请充值后再试",
			})
			return
		}
		log.Printf("Warning: deduct credits failed: %v", err)
		// 其他错误继续执行，不阻止流程
	}

	// 异步AI处理
	go service.ProcessVideoAI(id, savePath)

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "提取成功，正在处理文案...",
		Data: gin.H{
			"id":    id,
			"title": title,
		},
	})
}

// AnalyzeVideo 视频AI分析
func AnalyzeVideo(c *gin.Context) {
	videoIdStr := c.Param("id")
	videoId, err := strconv.Atoi(videoIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "无效的视频ID",
			Data:    nil,
		})
		return
	}

	userId := middleware.GetUserID(c)

	// 获取视频信息
	video, err := database.GetVideoByIDAndUser(videoId, userId)
	if err != nil || video == nil {
		c.JSON(http.StatusNotFound, APIResponse{
			Code:    404,
			Message: "视频不存在",
			Data:    nil,
		})
		return
	}

	// 检查是否有AI文案
	if video.AIText == nil || *video.AIText == "" {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "该视频还没有提取文案，请先提取文案后再进行分析",
			Data:    nil,
		})
		return
	}

	type Request struct {
		AnalysisType string `json:"analysisType" binding:"required"`
	}

	var req Request
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "请提供分析类型",
			Data:    nil,
		})
		return
	}

	// 先检查是否已有结果（不扣费直接返回）
	existingResult, err := database.GetAnalysisResult(videoId, userId, req.AnalysisType)
	if err == nil && existingResult != "" {
		c.JSON(http.StatusOK, APIResponse{
			Code:    200,
			Message: "获取成功",
			Data: gin.H{
				"result":          existingResult,
				"creditsDeducted": 0,
				"fromCache":       true,
			},
		})
		return
	}

	text := *video.AIText
	duration := video.Duration

	var result string
	var creditsToDeduct int

	switch req.AnalysisType {
	case "structure":
		creditsToDeduct = 5
		if err := service.DeductStructureAnalysisCredits(userId, videoId); err != nil {
			if errors.Is(err, service.ErrInsufficientCredits) {
				c.JSON(http.StatusPaymentRequired, APIResponse{
					Code:    402,
					Message: "积分不足，文案结构分析需要5积分",
				})
				return
			}
		}
		result, err = service.AnalyzeVideoStructure(text, duration)
		if err != nil {
			c.JSON(http.StatusInternalServerError, APIResponse{
				Code:    500,
				Message: "分析失败: " + err.Error(),
				Data:    nil,
			})
			return
		}

	case "viral_points":
		creditsToDeduct = 3
		if err := service.DeductViralPointsCredits(userId, videoId); err != nil {
			if errors.Is(err, service.ErrInsufficientCredits) {
				c.JSON(http.StatusPaymentRequired, APIResponse{
					Code:    402,
					Message: "积分不足，爆款点提炼需要3积分",
				})
				return
			}
		}
		result, err = service.AnalyzeViralPoints(text)
		if err != nil {
			c.JSON(http.StatusInternalServerError, APIResponse{
				Code:    500,
				Message: "分析失败: " + err.Error(),
				Data:    nil,
			})
			return
		}

	case "tags":
		creditsToDeduct = 2
		if err := service.DeductTagsExtractCredits(userId, videoId); err != nil {
			if errors.Is(err, service.ErrInsufficientCredits) {
				c.JSON(http.StatusPaymentRequired, APIResponse{
					Code:    402,
					Message: "积分不足，选题标签提取需要2积分",
				})
				return
			}
		}
		result, err = service.ExtractTags(text)
		if err != nil {
			c.JSON(http.StatusInternalServerError, APIResponse{
				Code:    500,
				Message: "分析失败: " + err.Error(),
				Data:    nil,
			})
			return
		}

	case "rhythm":
		creditsToDeduct = 4
		if err := service.DeductRhythmAnalysisCredits(userId, videoId); err != nil {
			if errors.Is(err, service.ErrInsufficientCredits) {
				c.JSON(http.StatusPaymentRequired, APIResponse{
					Code:    402,
					Message: "积分不足，口播节奏分析需要4积分",
				})
				return
			}
		}
		result, err = service.AnalyzeRhythm(text, duration)
		if err != nil {
			c.JSON(http.StatusInternalServerError, APIResponse{
				Code:    500,
				Message: "分析失败: " + err.Error(),
				Data:    nil,
			})
			return
		}

	case "report":
		creditsToDeduct = 6
		if err := service.DeductReportCredits(userId, videoId); err != nil {
			if errors.Is(err, service.ErrInsufficientCredits) {
				c.JSON(http.StatusPaymentRequired, APIResponse{
					Code:    402,
					Message: "积分不足，完整分析报告需要6积分",
				})
				return
			}
			c.JSON(http.StatusInternalServerError, APIResponse{
				Code:    500,
				Message: "扣减积分失败: " + err.Error(),
				Data:    nil,
			})
			return
		}
		result, err = service.GenerateAnalysisReport(text, duration, nil, nil, nil)
		if err != nil {
			c.JSON(http.StatusInternalServerError, APIResponse{
				Code:    500,
				Message: "生成报告失败: " + err.Error(),
				Data:    nil,
			})
			return
		}

	default:
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "不支持的分析类型",
			Data:    nil,
		})
		return
	}

	// 保存结果到数据库
	if err := database.SaveAnalysisResult(videoId, userId, req.AnalysisType, result); err != nil {
		log.Printf("Warning: save analysis result failed: %v", err)
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "分析成功",
		Data: gin.H{
			"result":          result,
			"creditsDeducted": creditsToDeduct,
			"fromCache":       false,
		},
	})
}

// GetAnalysisResults 获取视频的所有分析结果
func GetAnalysisResults(c *gin.Context) {
	videoIdStr := c.Param("id")
	videoId, err := strconv.Atoi(videoIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "无效的视频ID",
			Data:    nil,
		})
		return
	}

	userId := middleware.GetUserID(c)

	results, err := database.GetAnalysisResultsByVideo(videoId, userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "获取分析结果失败",
			Data:    nil,
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "获取成功",
		Data:    results,
	})
}
