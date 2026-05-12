package handler

import (
	"ai-short-video-backend/database"
	"ai-short-video-backend/middleware"
	"ai-short-video-backend/service"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// RewriteVideoText AI 改写视频文案
// 支持自己上传视频和广场公开视频，每个用户独立保存改写结果
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

	// 获取视频基础信息
	video, err := database.GetVideoByID(id)
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

	// 获取用户提取状态
	userVideo, err := database.GetUserVideo(userId, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "获取用户状态失败",
			Data:    nil,
		})
		return
	}

	// 获取原文案 - 如果是所有者从videos获取，否则从user_videos获取
	var originalText string
	var hasOriginalText bool

	isOwner := video.UserID == userId

	if isOwner {
		if video.AIText != nil && *video.AIText != "" {
			originalText = *video.AIText
			hasOriginalText = true
		}
	} else {
		if userVideo != nil && userVideo.Extracted && userVideo.Text != nil && *userVideo.Text != "" {
			originalText = *userVideo.Text
			hasOriginalText = true
		}
	}

	if !hasOriginalText {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "请先提取文案，再进行AI改写",
			Data:    nil,
		})
		return
	}

	// 扣减积分
	if err := service.DeductRewriteCredits(userId, id); err != nil {
		if errors.Is(err, service.ErrInsufficientCredits) {
			c.JSON(http.StatusPaymentRequired, APIResponse{
				Code:    402,
				Message: "积分不足，AI改写需要10积分，请签到后再试",
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
	if isOwner {
		database.UpdateRewriteStatus(id, "rewriting")
	} else {
		database.UpdateUserVideoRewriteStatus(userId, id, "rewriting")
	}

	rewrittenText, err := service.RewriteText(originalText, reqBody.Prompt)
	if err != nil {
		if isOwner {
			database.UpdateRewriteStatus(id, "failed")
		} else {
			database.UpdateUserVideoRewriteStatus(userId, id, "failed")
		}
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: fmt.Sprintf("改写失败: %v", err),
			Data:    nil,
		})
		return
	}

	// 保存改写结果到数据库
	rewrittenTextPtr := &rewrittenText
	if isOwner {
		if err := database.UpdateVideoRewrittenText(id, rewrittenTextPtr); err != nil {
			log.Printf("Failed to save rewritten text for video %d: %v", id, err)
		}
	} else {
		if err := database.UpsertUserVideoRewritten(userId, id, rewrittenTextPtr); err != nil {
			log.Printf("Failed to save rewritten text for video %d user %d: %v", id, userId, err)
		}
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "改写成功",
		Data: gin.H{
			"text": rewrittenText,
		},
	})
}
