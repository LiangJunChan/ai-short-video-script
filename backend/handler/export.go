package handler

import (
	"ai-short-video-backend/database"
	"ai-short-video-backend/middleware"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// ExportMarkdown 批量导出文案到Markdown
func ExportMarkdown(c *gin.Context) {
	userId := middleware.GetUserID(c)

	var req struct {
		VideoIDs []int `json:"videoIds" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "请求参数错误",
		})
		return
	}

	if len(req.VideoIDs) == 0 {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "请选择要导出的视频",
		})
		return
	}

	if len(req.VideoIDs) > 50 {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "一次最多只能导出50个视频",
		})
		return
	}

	// 获取所有视频
	var videos []database.Video
	for _, videoId := range req.VideoIDs {
		video, err := database.GetVideoByIDAndUser(videoId, userId)
		if err != nil || video == nil {
			continue
		}
		videos = append(videos, *video)
	}

	if len(videos) == 0 {
		c.JSON(http.StatusNotFound, APIResponse{
			Code:    404,
			Message: "没有找到有效的视频",
		})
		return
	}

	// 生成Markdown内容
	var sb strings.Builder
	sb.WriteString("# 爆款文案导出\n\n")
	sb.WriteString(fmt.Sprintf("导出时间: %s\n\n", time.Now().Format("2006-01-02 15:04:05")))
	sb.WriteString(fmt.Sprintf("共导出 %d 个视频\n\n", len(videos)))

	for i, video := range videos {
		sb.WriteString("---\n\n")
		sb.WriteString(fmt.Sprintf("## 视频%d: %s\n\n", i+1, video.Title))

		if video.AIText != nil && *video.AIText != "" {
			sb.WriteString("### 提取文案\n\n")
			sb.WriteString(*video.AIText)
			sb.WriteString("\n\n")
		}

		if video.RewrittenText != nil && *video.RewrittenText != "" {
			sb.WriteString("### 改写文案\n\n")
			sb.WriteString(*video.RewrittenText)
			sb.WriteString("\n\n")
		}

		// 获取标签
		tags, err := database.GetTagsByVideo(video.ID, userId)
		if err == nil && len(tags) > 0 {
			tagNames := make([]string, len(tags))
			for j, tag := range tags {
				tagNames[j] = "#" + tag.Name
			}
			sb.WriteString(fmt.Sprintf("**标签**: %s\n\n", strings.Join(tagNames, " ")))
		}

		sb.WriteString(fmt.Sprintf("**创建时间**: %s\n\n", video.CreatedAt.Format("2006-01-02")))
	}

	// 设置响应头
	filename := fmt.Sprintf("爆款文案导出_%s.md", time.Now().Format("20060102_150405"))
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Header("Content-Type", "text/markdown; charset=utf-8")
	c.String(http.StatusOK, sb.String())
}
