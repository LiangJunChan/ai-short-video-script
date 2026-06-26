package handler

import (
	"net/http"
	"strconv"

	"ai-short-video-backend/database"
	"ai-short-video-backend/middleware"
	"ai-short-video-backend/service"

	"github.com/gin-gonic/gin"
)

// ExecuteStoryboard 异步执行整个工作流：建 run → go goroutine 执行 → 秒回 runId
func ExecuteStoryboard(c *gin.Context) {
	userId := middleware.GetUserID(c)
	storyboardID, _ := strconv.Atoi(c.Param("id"))

	// Verify ownership
	sb, _ := database.GetStoryboard(storyboardID, userId)
	if sb == nil {
		c.JSON(http.StatusNotFound, APIResponse{Code: 404, Message: "画布不存在"})
		return
	}

	// 防重入：该 storyboard 已有 running 的 run 则拒绝
	var existingRunID int
	database.DB.QueryRow(`
		SELECT id FROM storyboard_runs
		WHERE storyboard_id = ? AND status = 'running'
		ORDER BY id DESC LIMIT 1
	`, storyboardID).Scan(&existingRunID)
	if existingRunID > 0 {
		c.JSON(http.StatusConflict, APIResponse{
			Code: 409, Message: "已有执行进行中",
			Data: gin.H{"runId": existingRunID, "status": "running"},
		})
		return
	}

	force := c.DefaultQuery("force", "false") == "true"

	// 预先创建 run，保证返回前 run 已存在
	runID, err := service.CreateRun(storyboardID, userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{Code: 500, Message: "创建执行记录失败"})
		return
	}

	// 后台异步执行，不阻塞请求
	engine := &service.WorkflowEngine{
		UserID:       userId,
		StoryboardID: storyboardID,
		Force:        force,
	}
	go func() {
		engine.Execute(runID)
	}()

	c.JSON(http.StatusOK, APIResponse{
		Code: 200, Message: "已开始执行",
		Data: gin.H{"runId": runID, "status": "running"},
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

// GetRunProgress 轮询：返回一个 run 的进度快照（run 状态 + 各节点 state）
func GetRunProgress(c *gin.Context) {
	userId := middleware.GetUserID(c)
	storyboardID, _ := strconv.Atoi(c.Param("id"))
	runID, _ := strconv.Atoi(c.Param("runId"))

	sb, _ := database.GetStoryboard(storyboardID, userId)
	if sb == nil {
		c.JSON(http.StatusNotFound, APIResponse{Code: 404, Message: "画布不存在"})
		return
	}

	// run 状态
	var status string
	var startedAt, finishedAt interface{}
	var totalCredits int
	err := database.DB.QueryRow(`
		SELECT status, started_at, finished_at, total_credits
		FROM storyboard_runs WHERE id = ? AND storyboard_id = ?
	`, runID, storyboardID).Scan(&status, &startedAt, &finishedAt, &totalCredits)
	if err != nil {
		c.JSON(http.StatusNotFound, APIResponse{Code: 404, Message: "执行记录不存在"})
		return
	}

	// 各节点 state
	rows, err := database.DB.Query(`
		SELECT id, node_type, state FROM storyboard_nodes WHERE storyboard_id = ?
	`, storyboardID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{Code: 500, Message: "获取节点失败"})
		return
	}
	defer rows.Close()

	var nodes []gin.H
	for rows.Next() {
		var id int
		var nodeType, state string
		rows.Scan(&id, &nodeType, &state)
		nodes = append(nodes, gin.H{"id": id, "nodeType": nodeType, "state": state})
	}

	c.JSON(http.StatusOK, APIResponse{
		Code: 200, Message: "获取成功",
		Data: gin.H{
			"run": gin.H{
				"id": runID, "status": status,
				"startedAt": startedAt, "finishedAt": finishedAt,
				"totalCredits": totalCredits,
			},
			"nodes": nodes,
		},
	})
}
