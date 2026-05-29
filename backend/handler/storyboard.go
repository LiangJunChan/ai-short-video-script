package handler

import (
	"net/http"
	"strconv"

	"ai-short-video-backend/database"
	"ai-short-video-backend/middleware"

	"github.com/gin-gonic/gin"
)

// CreateStoryboard 创建画布
func CreateStoryboard(c *gin.Context) {
	userId := middleware.GetUserID(c)
	var req struct {
		Name    string `json:"name" binding:"required,min=1,max=100"`
		VideoID *int   `json:"videoId"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{Code: 400, Message: "请输入画布名称"})
		return
	}

	id, err := database.CreateStoryboard(userId, req.Name, req.VideoID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{Code: 500, Message: "创建画布失败"})
		return
	}

	// 创建默认的 start 和 end 节点
	database.CreateNode(id, "start", 100, 200, `{"label":"开始"}`)
	database.CreateNode(id, "end", 600, 200, `{"label":"结束"}`)

	c.JSON(http.StatusOK, APIResponse{
		Code: 200, Message: "创建成功",
		Data: gin.H{"id": id},
	})
}

// GetStoryboards 获取画布列表
func GetStoryboards(c *gin.Context) {
	userId := middleware.GetUserID(c)
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))

	storyboards, total, err := database.GetStoryboards(userId, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{Code: 500, Message: "获取列表失败"})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code: 200, Message: "获取成功",
		Data: gin.H{
			"storyboards": storyboards,
			"pagination": gin.H{
				"page": page, "pageSize": pageSize, "total": total,
			},
		},
	})
}

// GetStoryboard 获取画布详情（含节点+连线）
func GetStoryboard(c *gin.Context) {
	userId := middleware.GetUserID(c)
	id, _ := strconv.Atoi(c.Param("id"))

	storyboard, err := database.GetStoryboard(id, userId)
	if err != nil || storyboard == nil {
		c.JSON(http.StatusNotFound, APIResponse{Code: 404, Message: "画布不存在"})
		return
	}

	nodes, _ := database.GetNodesByStoryboard(id)
	edges, _ := database.GetEdgesByStoryboard(id)

	c.JSON(http.StatusOK, APIResponse{
		Code: 200, Message: "获取成功",
		Data: gin.H{
			"storyboard": storyboard,
			"nodes":      nodes,
			"edges":      edges,
		},
	})
}

// UpdateStoryboard 更新画布
func UpdateStoryboard(c *gin.Context) {
	userId := middleware.GetUserID(c)
	id, _ := strconv.Atoi(c.Param("id"))

	var req struct {
		Name         string `json:"name"`
		ViewportJSON string `json:"viewportJson"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{Code: 400, Message: "参数错误"})
		return
	}

	if err := database.UpdateStoryboard(id, userId, req.Name, req.ViewportJSON); err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{Code: 500, Message: "更新失败"})
		return
	}

	c.JSON(http.StatusOK, APIResponse{Code: 200, Message: "更新成功"})
}

// DeleteStoryboard 删除画布
func DeleteStoryboard(c *gin.Context) {
	userId := middleware.GetUserID(c)
	id, _ := strconv.Atoi(c.Param("id"))

	if err := database.DeleteStoryboard(id, userId); err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{Code: 500, Message: "删除失败"})
		return
	}

	c.JSON(http.StatusOK, APIResponse{Code: 200, Message: "删除成功"})
}
