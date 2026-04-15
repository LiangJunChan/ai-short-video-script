package handler

import (
	"ai-short-video-backend/database"
	"ai-short-video-backend/middleware"
	"ai-short-video-backend/service"
	"errors"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

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
