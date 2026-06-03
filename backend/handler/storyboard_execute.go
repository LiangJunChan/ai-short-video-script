package handler

import (
	"net/http"
	"strconv"

	"ai-short-video-backend/database"
	"ai-short-video-backend/middleware"
	"ai-short-video-backend/service"

	"github.com/gin-gonic/gin"
)

// ExecuteStoryboard 执行整个工作流
func ExecuteStoryboard(c *gin.Context) {
	userId := middleware.GetUserID(c)
	storyboardID, _ := strconv.Atoi(c.Param("id"))

	// Verify ownership
	sb, _ := database.GetStoryboard(storyboardID, userId)
	if sb == nil {
		c.JSON(http.StatusNotFound, APIResponse{Code: 404, Message: "画布不存在"})
		return
	}

	engine := &service.WorkflowEngine{
		UserID:       userId,
		StoryboardID: storyboardID,
	}

	result, err := engine.Execute()
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{Code: 500, Message: "执行失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code: 200, Message: "执行完成",
		Data: result,
	})
}

// ExecuteNode 执行单个节点
func ExecuteNode(c *gin.Context) {
	userId := middleware.GetUserID(c)
	storyboardID, _ := strconv.Atoi(c.Param("id"))
	nodeID, _ := strconv.Atoi(c.Param("nodeId"))

	sb, _ := database.GetStoryboard(storyboardID, userId)
	if sb == nil {
		c.JSON(http.StatusNotFound, APIResponse{Code: 404, Message: "画布不存在"})
		return
	}

	engine := &service.WorkflowEngine{
		UserID:       userId,
		StoryboardID: storyboardID,
	}

	result, err := engine.ExecuteNode(nodeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{Code: 500, Message: "执行失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code: 200, Message: "执行完成",
		Data: result,
	})
}

// GetExecutionHistory 获取执行历史
func GetExecutionHistory(c *gin.Context) {
	userId := middleware.GetUserID(c)
	storyboardID, _ := strconv.Atoi(c.Param("id"))

	sb, _ := database.GetStoryboard(storyboardID, userId)
	if sb == nil {
		c.JSON(http.StatusNotFound, APIResponse{Code: 404, Message: "画布不存在"})
		return
	}

	rows, err := database.DB.Query(`
		SELECT id, status, started_at, finished_at, total_credits
		FROM storyboard_runs
		WHERE storyboard_id = ?
		ORDER BY started_at DESC
		LIMIT 20
	`, storyboardID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{Code: 500, Message: "获取失败"})
		return
	}
	defer rows.Close()

	var runs []gin.H
	for rows.Next() {
		var id, totalCredits int
		var status string
		var startedAt, finishedAt interface{}
		rows.Scan(&id, &status, &startedAt, &finishedAt, &totalCredits)
		runs = append(runs, gin.H{
			"id": id, "status": status,
			"startedAt": startedAt, "finishedAt": finishedAt,
			"totalCredits": totalCredits,
		})
	}

	c.JSON(http.StatusOK, APIResponse{
		Code: 200, Message: "获取成功",
		Data: gin.H{"runs": runs},
	})
}
