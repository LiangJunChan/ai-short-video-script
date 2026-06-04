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

// BatchUpdate 批量更新画布（支持混合新增和更新）
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
			ID         int     `json:"id"` // 正数 = 已有节点ID, 1-based index = 新节点
			NodeType   string  `json:"nodeType"`
			PositionX  float64 `json:"positionX"`
			PositionY  float64 `json:"positionY"`
			ConfigJSON string  `json:"configJson"`
		} `json:"nodes"`
		Edges []struct {
			SourceNodeID int    `json:"sourceNodeId"` // 正数 = 已有节点ID, 1-based index = 新节点
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

	// Step 1: 创建新节点（ID <= 0 的节点，使用数组索引作为ID）
	// newNodeIDMap: 请求中的数组索引 (1-based) -> 数据库真实ID
	newNodeIDMap := make(map[int]int)
	for i, n := range req.Nodes {
		if n.ID <= 0 {
			newID, err := database.CreateNode(storyboardID, n.NodeType, n.PositionX, n.PositionY, n.ConfigJSON)
			if err == nil {
				newNodeIDMap[i+1] = newID // 1-based index
			}
		}
	}

	// Step 2: 更新已有节点
	for _, n := range req.Nodes {
		if n.ID > 0 {
			database.UpdateNode(n.ID, n.ConfigJSON, n.PositionX, n.PositionY)
		}
	}

	// Step 3: 处理连线
	// Edges中的source/target可能是已有节点ID（正数）或新节点索引（1-based）
	// 优先从newNodeIDMap查找，找不到则认为是已有节点ID
	getRealID := func(idOrIndex int) int {
		if idOrIndex <= 0 {
			return 0
		}
		// 先检查是否是新建节点的索引
		if realID, ok := newNodeIDMap[idOrIndex]; ok {
			return realID
		}
		// 否则是已有节点ID
		return idOrIndex
	}

	// 删除所有旧连线并重建
	database.DeleteEdgesByStoryboard(storyboardID)
	for _, e := range req.Edges {
		sourceID := getRealID(e.SourceNodeID)
		targetID := getRealID(e.TargetNodeID)
		if sourceID > 0 && targetID > 0 {
			database.CreateEdge(storyboardID, sourceID, targetID, e.SourceHandle, e.TargetHandle, e.Label)
		}
	}

	c.JSON(http.StatusOK, APIResponse{Code: 200, Message: "保存成功"})
}
