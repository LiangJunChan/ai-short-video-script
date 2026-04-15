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

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

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
