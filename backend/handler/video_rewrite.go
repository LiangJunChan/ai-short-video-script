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
