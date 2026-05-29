package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"ai-short-video-backend/database"
	"ai-short-video-backend/middleware"

	"github.com/gin-gonic/gin"
)

// ExportStoryboardMarkdown 导出分镜画布为 Markdown
func ExportStoryboardMarkdown(c *gin.Context) {
	userId := middleware.GetUserID(c)
	id, _ := strconv.Atoi(c.Param("id"))

	sb, _ := database.GetStoryboard(id, userId)
	if sb == nil {
		c.JSON(http.StatusNotFound, APIResponse{Code: 404, Message: "画布不存在"})
		return
	}

	nodes, _ := database.GetNodesByStoryboard(id)

	shotLabels := map[string]string{"close": "近景", "medium": "中景", "long": "远景", "extreme_close": "特写"}
	camLabels := map[string]string{"static": "固定", "push": "推", "pull": "拉", "pan": "摇", "track": "跟"}

	var md strings.Builder
	md.WriteString(fmt.Sprintf("# 分镜脚本：%s\n\n", sb.Name))

	sceneIndex := 1
	for _, n := range nodes {
		if n.NodeType != "scene" || n.ConfigJSON == "" {
			continue
		}

		var config map[string]interface{}
		json.Unmarshal([]byte(n.ConfigJSON), &config)

		md.WriteString(fmt.Sprintf("## 分镜%d\n", sceneIndex))
		if v, ok := config["script"].(string); ok && v != "" {
			md.WriteString(fmt.Sprintf("- **文案**：%s\n", v))
		}
		if v, ok := config["description"].(string); ok && v != "" {
			md.WriteString(fmt.Sprintf("- **画面描述**：%s\n", v))
		}
		if v, ok := config["duration"].(string); ok && v != "" {
			md.WriteString(fmt.Sprintf("- **时长**：%s\n", v))
		}
		if v, ok := config["shot_type"].(string); ok && v != "" {
			md.WriteString(fmt.Sprintf("- **景别**：%s\n", shotLabels[v]))
		}
		if v, ok := config["camera_move"].(string); ok && v != "" {
			md.WriteString(fmt.Sprintf("- **运镜**：%s\n", camLabels[v]))
		}
		if v, ok := config["notes"].(string); ok && v != "" {
			md.WriteString(fmt.Sprintf("- **备注**：%s\n", v))
		}
		md.WriteString("\n")
		sceneIndex++
	}

	c.Header("Content-Type", "text/markdown; charset=utf-8")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s.md", sb.Name))
	c.String(http.StatusOK, md.String())
}

// ExportStoryboardText 导出分镜画布纯文案
func ExportStoryboardText(c *gin.Context) {
	userId := middleware.GetUserID(c)
	id, _ := strconv.Atoi(c.Param("id"))

	sb, _ := database.GetStoryboard(id, userId)
	if sb == nil {
		c.JSON(http.StatusNotFound, APIResponse{Code: 404, Message: "画布不存在"})
		return
	}

	nodes, _ := database.GetNodesByStoryboard(id)

	var texts []string
	for _, n := range nodes {
		if n.NodeType != "scene" || n.ConfigJSON == "" {
			continue
		}
		var config map[string]interface{}
		json.Unmarshal([]byte(n.ConfigJSON), &config)
		if script, ok := config["script"].(string); ok && script != "" {
			texts = append(texts, script)
		}
	}

	c.Header("Content-Type", "text/plain; charset=utf-8")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s.txt", sb.Name))
	c.String(http.StatusOK, strings.Join(texts, "\n\n"))
}
