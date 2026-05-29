package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"ai-short-video-backend/database"
	"ai-short-video-backend/middleware"

	"github.com/gin-gonic/gin"
)

// GetTemplates 获取模板列表
func GetTemplates(c *gin.Context) {
	userId := middleware.GetUserID(c)
	rows, err := database.DB.Query(`
		SELECT id, name, category, description, is_system, use_count
		FROM storyboard_templates
		WHERE is_system = 1 OR user_id = ?
		ORDER BY is_system DESC, use_count DESC
	`, userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{Code: 500, Message: "获取失败"})
		return
	}
	defer rows.Close()

	var templates []gin.H
	for rows.Next() {
		var id, isSystem, useCount int
		var name, category, description string
		rows.Scan(&id, &name, &category, &description, &isSystem, &useCount)
		templates = append(templates, gin.H{
			"id": id, "name": name, "category": category,
			"description": description, "isSystem": isSystem == 1, "useCount": useCount,
		})
	}

	c.JSON(http.StatusOK, APIResponse{
		Code: 200, Message: "获取成功",
		Data: gin.H{"templates": templates},
	})
}

// GetTemplate 获取模板详情
func GetTemplate(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var name, nodesJSON, edgesJSON string
	err := database.DB.QueryRow(`
		SELECT name, nodes_json, edges_json FROM storyboard_templates WHERE id = ?
	`, id).Scan(&name, &nodesJSON, &edgesJSON)
	if err != nil {
		c.JSON(http.StatusNotFound, APIResponse{Code: 404, Message: "模板不存在"})
		return
	}
	c.JSON(http.StatusOK, APIResponse{
		Code: 200, Message: "获取成功",
		Data: gin.H{"name": name, "nodesJson": nodesJSON, "edgesJson": edgesJSON},
	})
}

// SaveAsTemplate 保存画布为模板
func SaveAsTemplate(c *gin.Context) {
	userId := middleware.GetUserID(c)
	storyboardID, _ := strconv.Atoi(c.Param("id"))

	var req struct {
		Name        string `json:"name" binding:"required"`
		Category    string `json:"category"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{Code: 400, Message: "请输入模板名称"})
		return
	}

	nodes, _ := database.GetNodesByStoryboard(storyboardID)
	edges, _ := database.GetEdgesByStoryboard(storyboardID)

	nodesJSON, _ := json.Marshal(nodes)
	edgesJSON, _ := json.Marshal(edges)

	_, err := database.DB.Exec(`
		INSERT INTO storyboard_templates (user_id, name, category, description, nodes_json, edges_json)
		VALUES (?, ?, ?, ?, ?, ?)
	`, userId, req.Name, req.Category, req.Description, string(nodesJSON), string(edgesJSON))
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{Code: 500, Message: "保存失败"})
		return
	}

	c.JSON(http.StatusOK, APIResponse{Code: 200, Message: "保存成功"})
}

// ApplyTemplate 应用模板到画布
func ApplyTemplate(c *gin.Context) {
	userId := middleware.GetUserID(c)
	storyboardID, _ := strconv.Atoi(c.Param("id"))
	templateID, _ := strconv.Atoi(c.Param("templateId"))

	var nodesJSON string
	err := database.DB.QueryRow(`
		SELECT nodes_json FROM storyboard_templates WHERE id = ?
	`, templateID).Scan(&nodesJSON)
	if err != nil {
		c.JSON(http.StatusNotFound, APIResponse{Code: 404, Message: "模板不存在"})
		return
	}

	sb, _ := database.GetStoryboard(storyboardID, userId)
	if sb == nil {
		c.JSON(http.StatusNotFound, APIResponse{Code: 404, Message: "画布不存在"})
		return
	}

	var templateNodes []database.StoryboardNode
	json.Unmarshal([]byte(nodesJSON), &templateNodes)

	database.DeleteEdgesByStoryboard(storyboardID)
	existingNodes, _ := database.GetNodesByStoryboard(storyboardID)
	for _, n := range existingNodes {
		database.DeleteNode(n.ID)
	}

	database.BatchCreateNodes(storyboardID, templateNodes)
	database.DB.Exec("UPDATE storyboard_templates SET use_count = use_count + 1 WHERE id = ?", templateID)

	c.JSON(http.StatusOK, APIResponse{Code: 200, Message: "应用成功"})
}

// DeleteTemplate 删除用户模板
func DeleteTemplate(c *gin.Context) {
	userId := middleware.GetUserID(c)
	id, _ := strconv.Atoi(c.Param("id"))

	database.DB.Exec("DELETE FROM storyboard_templates WHERE id = ? AND user_id = ? AND is_system = 0", id, userId)
	c.JSON(http.StatusOK, APIResponse{Code: 200, Message: "删除成功"})
}
