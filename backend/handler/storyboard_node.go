package handler

import (
	"net/http"
	"strconv"

	"ai-short-video-backend/database"
	"ai-short-video-backend/middleware"

	"github.com/gin-gonic/gin"
)

// CreateNode 创建节点
func CreateNode(c *gin.Context) {
	userId := middleware.GetUserID(c)
	storyboardID, _ := strconv.Atoi(c.Param("id"))

	sb, _ := database.GetStoryboard(storyboardID, userId)
	if sb == nil {
		c.JSON(http.StatusNotFound, APIResponse{Code: 404, Message: "画布不存在"})
		return
	}

	var req struct {
		NodeType   string  `json:"nodeType"`
		PositionX  float64 `json:"positionX"`
		PositionY  float64 `json:"positionY"`
		ConfigJSON string  `json:"configJson"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		req.NodeType = "scene"
		req.ConfigJSON = "{}"
	}

	if req.NodeType == "" {
		req.NodeType = "scene"
	}

	id, err := database.CreateNode(storyboardID, req.NodeType, req.PositionX, req.PositionY, req.ConfigJSON)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{Code: 500, Message: "创建节点失败"})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code: 200, Message: "创建成功",
		Data: gin.H{"id": id},
	})
}

// UpdateNode 更新节点
func UpdateNode(c *gin.Context) {
	nodeID, _ := strconv.Atoi(c.Param("nodeId"))

	var req struct {
		ConfigJSON string  `json:"configJson"`
		PositionX  float64 `json:"positionX"`
		PositionY  float64 `json:"positionY"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{Code: 400, Message: "参数错误"})
		return
	}

	if err := database.UpdateNode(nodeID, req.ConfigJSON, req.PositionX, req.PositionY); err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{Code: 500, Message: "更新失败"})
		return
	}

	c.JSON(http.StatusOK, APIResponse{Code: 200, Message: "更新成功"})
}

// DeleteNode 删除节点
func DeleteNode(c *gin.Context) {
	nodeID, _ := strconv.Atoi(c.Param("nodeId"))

	if err := database.DeleteNode(nodeID); err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{Code: 500, Message: "删除失败"})
		return
	}

	c.JSON(http.StatusOK, APIResponse{Code: 200, Message: "删除成功"})
}

// CreateEdge 创建连线
func CreateEdge(c *gin.Context) {
	userId := middleware.GetUserID(c)
	storyboardID, _ := strconv.Atoi(c.Param("id"))

	sb, _ := database.GetStoryboard(storyboardID, userId)
	if sb == nil {
		c.JSON(http.StatusNotFound, APIResponse{Code: 404, Message: "画布不存在"})
		return
	}

	var req struct {
		SourceNodeID int    `json:"sourceNodeId" binding:"required"`
		TargetNodeID int    `json:"targetNodeId" binding:"required"`
		SourceHandle string `json:"sourceHandle"`
		TargetHandle string `json:"targetHandle"`
		Label        string `json:"label"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{Code: 400, Message: "参数错误"})
		return
	}

	id, err := database.CreateEdge(storyboardID, req.SourceNodeID, req.TargetNodeID, req.SourceHandle, req.TargetHandle, req.Label)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{Code: 500, Message: "创建连线失败"})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code: 200, Message: "创建成功",
		Data: gin.H{"id": id},
	})
}

// DeleteEdge 删除连线
func DeleteEdge(c *gin.Context) {
	edgeID, _ := strconv.Atoi(c.Param("edgeId"))

	if err := database.DeleteEdge(edgeID); err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{Code: 500, Message: "删除失败"})
		return
	}

	c.JSON(http.StatusOK, APIResponse{Code: 200, Message: "删除成功"})
}

// BatchUpdate 批量更新画布（保存整个画布状态）
func BatchUpdate(c *gin.Context) {
	userId := middleware.GetUserID(c)
	storyboardID, _ := strconv.Atoi(c.Param("id"))

	sb, _ := database.GetStoryboard(storyboardID, userId)
	if sb == nil {
		c.JSON(http.StatusNotFound, APIResponse{Code: 404, Message: "画布不存在"})
		return
	}

	var req struct {
		ViewportJSON string `json:"viewportJson"`
		Nodes        []struct {
			ID         int     `json:"id"`
			NodeType   string  `json:"nodeType"`
			PositionX  float64 `json:"positionX"`
			PositionY  float64 `json:"positionY"`
			ConfigJSON string  `json:"configJson"`
		} `json:"nodes"`
		Edges []struct {
			SourceNodeID int    `json:"sourceNodeId"`
			TargetNodeID int    `json:"targetNodeId"`
			SourceHandle string `json:"sourceHandle"`
			TargetHandle string `json:"targetHandle"`
			Label        string `json:"label"`
		} `json:"edges"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{Code: 400, Message: "参数错误"})
		return
	}

	// 更新视口
	database.UpdateStoryboard(storyboardID, userId, sb.Name, req.ViewportJSON)

	// 删除旧的节点和连线
	database.DeleteEdgesByStoryboard(storyboardID)
	oldNodes, _ := database.GetNodesByStoryboard(storyboardID)
	for _, n := range oldNodes {
		database.DeleteNode(n.ID)
	}

	// 创建新节点
	nodeIDMap := make(map[int]int)
	for _, n := range req.Nodes {
		newID, err := database.CreateNode(storyboardID, n.NodeType, n.PositionX, n.PositionY, n.ConfigJSON)
		if err == nil {
			nodeIDMap[n.ID] = newID
		}
	}

	// 创建新连线
	for _, e := range req.Edges {
		sourceID := nodeIDMap[e.SourceNodeID]
		targetID := nodeIDMap[e.TargetNodeID]
		if sourceID > 0 && targetID > 0 {
			database.CreateEdge(storyboardID, sourceID, targetID, e.SourceHandle, e.TargetHandle, e.Label)
		}
	}

	c.JSON(http.StatusOK, APIResponse{Code: 200, Message: "保存成功"})
}
