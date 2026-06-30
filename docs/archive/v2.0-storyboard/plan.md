# V2.0 脚本画布（阶段一）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现分镜脚本画布，用户可以在画布上拖拽排列分镜节点、编辑内容、AI拆分、模板复用、导出脚本

**Architecture:** 后端新增 storyboards/storyboard_nodes/storyboard_edges/storyboard_templates 四张表，提供 CRUD API。前端引入 React Flow 实现无限画布，自定义 SceneNode 节点组件，右侧编辑面板编辑节点内容。

**Tech Stack:** Go/Gin (后端) + React 19/RTK Query/TypeScript/Tailwind CSS (前端) + SQLite + React Flow 11

---

## 文件结构

### 后端新建文件

| 文件 | 职责 |
|------|------|
| `backend/database/storyboard.go` | storyboards 表 CRUD |
| `backend/database/storyboard_node.go` | storyboard_nodes 表 CRUD |
| `backend/database/storyboard_edge.go` | storyboard_edges 表 CRUD |
| `backend/database/storyboard_template.go` | storyboard_templates 表 CRUD |
| `backend/handler/storyboard.go` | 画布 CRUD handler |
| `backend/handler/storyboard_node.go` | 节点/连线 CRUD handler |
| `backend/handler/storyboard_template.go` | 模板 CRUD handler |
| `backend/handler/storyboard_export.go` | 导出 handler |
| `backend/service/storyboard_split.go` | AI 自动分镜服务 |

### 后端修改文件

| 文件 | 改动 |
|------|------|
| `backend/database/db.go` | 新增4张表建表语句 |
| `backend/main.go` | 注册所有新路由 |

### 前端新建文件

| 文件 | 职责 |
|------|------|
| `frontend/src/pages/StoryboardListPage.tsx` | "我的脚本"列表页 |
| `frontend/src/pages/StoryboardEditorPage.tsx` | 画布编辑器页面 |
| `frontend/src/components/storyboard/Canvas.tsx` | React Flow 画布容器 |
| `frontend/src/components/storyboard/SceneNode.tsx` | 分镜节点组件 |
| `frontend/src/components/storyboard/CanvasToolbar.tsx` | 画布工具栏 |
| `frontend/src/components/storyboard/NodeEditorPanel.tsx` | 节点编辑面板 |
| `frontend/src/components/storyboard/AISplitPanel.tsx` | AI 分镜面板 |
| `frontend/src/components/storyboard/TemplatePanel.tsx` | 模板面板 |
| `frontend/src/components/storyboard/ExportMenu.tsx` | 导出菜单 |

### 前端修改文件

| 文件 | 改动 |
|------|------|
| `frontend/package.json` | 新增 reactflow 依赖 |
| `frontend/src/types/index.ts` | 新增 Storyboard 相关类型 |
| `frontend/src/store/videoApi.ts` | 新增 Storyboard API endpoints |
| `frontend/src/components/Header.tsx` | 新增"脚本"Tab |
| `frontend/src/main.tsx` | 新增路由 |
| `frontend/src/pages/DetailPage.tsx` | 新增"创建分镜脚本"按钮 |

---

## Task 1: 后端数据库 - 建表

**Files:**
- Modify: `backend/database/db.go`

- [ ] **Step 1: 在 db.go 的 InitDB() 中添加4张表**

在 `backend/database/db.go` 的 `InitDB()` 函数末尾追加：

```go
	// 创建 storyboards 表（画布）
	DB.Exec(`
		CREATE TABLE IF NOT EXISTS storyboards (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			video_id INTEGER,
			name TEXT NOT NULL,
			status TEXT DEFAULT 'draft',
			viewport_json TEXT,
			version INTEGER DEFAULT 1,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id)
		);
	`)

	// 创建 storyboard_nodes 表（分镜节点）
	DB.Exec(`
		CREATE TABLE IF NOT EXISTS storyboard_nodes (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			storyboard_id INTEGER NOT NULL,
			node_type TEXT NOT NULL DEFAULT 'scene',
			position_x REAL NOT NULL DEFAULT 0,
			position_y REAL NOT NULL DEFAULT 0,
			width REAL DEFAULT 300,
			height REAL DEFAULT 200,
			config_json TEXT,
			state TEXT DEFAULT 'idle',
			result_json TEXT,
			order_index INTEGER,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (storyboard_id) REFERENCES storyboards(id) ON DELETE CASCADE
		);
	`)

	// 创建 storyboard_edges 表（节点连线）
	DB.Exec(`
		CREATE TABLE IF NOT EXISTS storyboard_edges (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			storyboard_id INTEGER NOT NULL,
			source_node_id INTEGER NOT NULL,
			target_node_id INTEGER NOT NULL,
			source_handle TEXT,
			target_handle TEXT,
			label TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (storyboard_id) REFERENCES storyboards(id) ON DELETE CASCADE,
			FOREIGN KEY (source_node_id) REFERENCES storyboard_nodes(id) ON DELETE CASCADE,
			FOREIGN KEY (target_node_id) REFERENCES storyboard_nodes(id) ON DELETE CASCADE
		);
	`)

	// 创建 storyboard_templates 表（模板）
	DB.Exec(`
		CREATE TABLE IF NOT EXISTS storyboard_templates (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER,
			name TEXT NOT NULL,
			category TEXT,
			description TEXT,
			thumbnail TEXT,
			nodes_json TEXT NOT NULL,
			edges_json TEXT NOT NULL,
			is_system INTEGER DEFAULT 0,
			use_count INTEGER DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id)
		);
	`)
```

- [ ] **Step 2: 验证编译**

```bash
cd /Users/chenliangjun/code/project/ai-short-video-script/backend && go build ./...
```

- [ ] **Step 3: Commit**

```bash
git add backend/database/db.go
git commit -m "feat(storyboard): add storyboard tables"
```

---

## Task 2: 后端数据库 - Storyboard CRUD

**Files:**
- Create: `backend/database/storyboard.go`
- Create: `backend/database/storyboard_node.go`
- Create: `backend/database/storyboard_edge.go`

- [ ] **Step 1: 创建 storyboard.go**

```go
package database

import (
	"database/sql"
	"time"
)

// Storyboard 画布模型
type Storyboard struct {
	ID           int        `json:"id"`
	UserID       int        `json:"userId"`
	VideoID      *int       `json:"videoId,omitempty"`
	Name         string     `json:"name"`
	Status       string     `json:"status"`
	ViewportJSON string     `json:"viewportJson,omitempty"`
	Version      int        `json:"version"`
	CreatedAt    time.Time  `json:"createdAt"`
	UpdatedAt    time.Time  `json:"updatedAt"`
}

// CreateStoryboard 创建画布
func CreateStoryboard(userID int, name string, videoID *int) (int, error) {
	result, err := DB.Exec(`
		INSERT INTO storyboards (user_id, name, video_id)
		VALUES (?, ?, ?)
	`, userID, name, videoID)
	if err != nil {
		return 0, err
	}
	id, err := result.LastInsertId()
	return int(id), err
}

// GetStoryboard 获取画布详情
func GetStoryboard(id int, userID int) (*Storyboard, error) {
	var s Storyboard
	err := DB.QueryRow(`
		SELECT id, user_id, video_id, name, status, viewport_json, version, created_at, updated_at
		FROM storyboards WHERE id = ? AND user_id = ?
	`, id, userID).Scan(
		&s.ID, &s.UserID, &s.VideoID, &s.Name, &s.Status,
		&s.ViewportJSON, &s.Version, &s.CreatedAt, &s.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &s, nil
}

// GetStoryboards 获取用户画布列表
func GetStoryboards(userID int, page, pageSize int) ([]Storyboard, int, error) {
	var total int
	err := DB.QueryRow("SELECT COUNT(*) FROM storyboards WHERE user_id = ?", userID).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	rows, err := DB.Query(`
		SELECT id, user_id, video_id, name, status, viewport_json, version, created_at, updated_at
		FROM storyboards WHERE user_id = ?
		ORDER BY updated_at DESC
		LIMIT ? OFFSET ?
	`, userID, pageSize, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var storyboards []Storyboard
	for rows.Next() {
		var s Storyboard
		if err := rows.Scan(
			&s.ID, &s.UserID, &s.VideoID, &s.Name, &s.Status,
			&s.ViewportJSON, &s.Version, &s.CreatedAt, &s.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		storyboards = append(storyboards, s)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	return storyboards, total, nil
}

// UpdateStoryboard 更新画布
func UpdateStoryboard(id int, userID int, name string, viewportJSON string) error {
	_, err := DB.Exec(`
		UPDATE storyboards SET name = ?, viewport_json = ?, updated_at = ?
		WHERE id = ? AND user_id = ?
	`, name, viewportJSON, time.Now(), id, userID)
	return err
}

// DeleteStoryboard 删除画布
func DeleteStoryboard(id int, userID int) error {
	_, err := DB.Exec("DELETE FROM storyboards WHERE id = ? AND user_id = ?", id, userID)
	return err
}
```

- [ ] **Step 2: 创建 storyboard_node.go**

```go
package database

import (
	"database/sql"
	"time"
)

// StoryboardNode 分镜节点模型
type StoryboardNode struct {
	ID            int        `json:"id"`
	StoryboardID  int        `json:"storyboardId"`
	NodeType      string     `json:"nodeType"`
	PositionX     float64    `json:"positionX"`
	PositionY     float64    `json:"positionY"`
	Width         float64    `json:"width"`
	Height        float64    `json:"height"`
	ConfigJSON    string     `json:"configJson,omitempty"`
	State         string     `json:"state"`
	ResultJSON    string     `json:"resultJson,omitempty"`
	OrderIndex    *int       `json:"orderIndex,omitempty"`
	CreatedAt     time.Time  `json:"createdAt"`
	UpdatedAt     time.Time  `json:"updatedAt"`
}

// CreateNode 创建节点
func CreateNode(storyboardID int, nodeType string, posX, posY float64, configJSON string) (int, error) {
	result, err := DB.Exec(`
		INSERT INTO storyboard_nodes (storyboard_id, node_type, position_x, position_y, config_json)
		VALUES (?, ?, ?, ?, ?)
	`, storyboardID, nodeType, posX, posY, configJSON)
	if err != nil {
		return 0, err
	}
	id, err := result.LastInsertId()
	return int(id), err
}

// GetNodesByStoryboard 获取画布所有节点
func GetNodesByStoryboard(storyboardID int) ([]StoryboardNode, error) {
	rows, err := DB.Query(`
		SELECT id, storyboard_id, node_type, position_x, position_y, width, height,
		       config_json, state, result_json, order_index, created_at, updated_at
		FROM storyboard_nodes WHERE storyboard_id = ?
		ORDER BY order_index ASC, id ASC
	`, storyboardID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var nodes []StoryboardNode
	for rows.Next() {
		var n StoryboardNode
		if err := rows.Scan(
			&n.ID, &n.StoryboardID, &n.NodeType, &n.PositionX, &n.PositionY,
			&n.Width, &n.Height, &n.ConfigJSON, &n.State, &n.ResultJSON,
			&n.OrderIndex, &n.CreatedAt, &n.UpdatedAt,
		); err != nil {
			return nil, err
		}
		nodes = append(nodes, n)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return nodes, nil
}

// UpdateNode 更新节点
func UpdateNode(id int, configJSON string, posX, posY float64) error {
	_, err := DB.Exec(`
		UPDATE storyboard_nodes SET config_json = ?, position_x = ?, position_y = ?, updated_at = ?
		WHERE id = ?
	`, configJSON, posX, posY, time.Now(), id)
	return err
}

// UpdateNodePosition 更新节点位置（拖拽时调用）
func UpdateNodePosition(id int, posX, posY float64) error {
	_, err := DB.Exec(`
		UPDATE storyboard_nodes SET position_x = ?, position_y = ?, updated_at = ?
		WHERE id = ?
	`, posX, posY, time.Now(), id)
	return err
}

// DeleteNode 删除节点
func DeleteNode(id int) error {
	_, err := DB.Exec("DELETE FROM storyboard_nodes WHERE id = ?", id)
	return err
}

// BatchCreateNodes 批量创建节点
func BatchCreateNodes(storyboardID int, nodes []StoryboardNode) error {
	tx, err := DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	for i, n := range nodes {
		_, err := tx.Exec(`
			INSERT INTO storyboard_nodes (storyboard_id, node_type, position_x, position_y, width, height, config_json, order_index)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		`, storyboardID, n.NodeType, n.PositionX, n.PositionY, n.Width, n.Height, n.ConfigJSON, i)
		if err != nil {
			return err
		}
	}
	return tx.Commit()
}
```

- [ ] **Step 3: 创建 storyboard_edge.go**

```go
package database

import "time"

// StoryboardEdge 节点连线模型
type StoryboardEdge struct {
	ID           int       `json:"id"`
	StoryboardID int       `json:"storyboardId"`
	SourceNodeID int       `json:"sourceNodeId"`
	TargetNodeID int       `json:"targetNodeId"`
	SourceHandle string    `json:"sourceHandle,omitempty"`
	TargetHandle string    `json:"targetHandle,omitempty"`
	Label        string    `json:"label,omitempty"`
	CreatedAt    time.Time `json:"createdAt"`
}

// CreateEdge 创建连线
func CreateEdge(storyboardID, sourceNodeID, targetNodeID int, sourceHandle, targetHandle, label string) (int, error) {
	result, err := DB.Exec(`
		INSERT INTO storyboard_edges (storyboard_id, source_node_id, target_node_id, source_handle, target_handle, label)
		VALUES (?, ?, ?, ?, ?, ?)
	`, storyboardID, sourceNodeID, targetNodeID, sourceHandle, targetHandle, label)
	if err != nil {
		return 0, err
	}
	id, err := result.LastInsertId()
	return int(id), err
}

// GetEdgesByStoryboard 获取画布所有连线
func GetEdgesByStoryboard(storyboardID int) ([]StoryboardEdge, error) {
	rows, err := DB.Query(`
		SELECT id, storyboard_id, source_node_id, target_node_id, source_handle, target_handle, label, created_at
		FROM storyboard_edges WHERE storyboard_id = ?
	`, storyboardID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var edges []StoryboardEdge
	for rows.Next() {
		var e StoryboardEdge
		if err := rows.Scan(
			&e.ID, &e.StoryboardID, &e.SourceNodeID, &e.TargetNodeID,
			&e.SourceHandle, &e.TargetHandle, &e.Label, &e.CreatedAt,
		); err != nil {
			return nil, err
		}
		edges = append(edges, e)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return edges, nil
}

// DeleteEdge 删除连线
func DeleteEdge(id int) error {
	_, err := DB.Exec("DELETE FROM storyboard_edges WHERE id = ?", id)
	return err
}

// DeleteEdgesByStoryboard 删除画布所有连线
func DeleteEdgesByStoryboard(storyboardID int) error {
	_, err := DB.Exec("DELETE FROM storyboard_edges WHERE storyboard_id = ?", storyboardID)
	return err
}

// BatchCreateEdges 批量创建连线
func BatchCreateEdges(storyboardID int, edges []StoryboardEdge) error {
	tx, err := DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	for _, e := range edges {
		_, err := tx.Exec(`
			INSERT INTO storyboard_edges (storyboard_id, source_node_id, target_node_id, source_handle, target_handle, label)
			VALUES (?, ?, ?, ?, ?, ?)
		`, storyboardID, e.SourceNodeID, e.TargetNodeID, e.SourceHandle, e.TargetHandle, e.Label)
		if err != nil {
			return err
		}
	}
	return tx.Commit()
}
```

- [ ] **Step 4: 验证编译**

```bash
cd /Users/chenliangjun/code/project/ai-short-video-script/backend && go build ./...
```

- [ ] **Step 5: Commit**

```bash
git add backend/database/storyboard.go backend/database/storyboard_node.go backend/database/storyboard_edge.go
git commit -m "feat(storyboard): add storyboard/node/edge database CRUD"
```

---

## Task 3: 后端 Handler - 画布 CRUD

**Files:**
- Create: `backend/handler/storyboard.go`

- [ ] **Step 1: 创建 storyboard.go handler**

```go
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

	// 创建一个默认的 start 节点
	database.CreateNode(id, "start", 100, 200, `{"label":"开始"}`)
	// 创建一个默认的 end 节点
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
```

- [ ] **Step 2: 验证编译**

```bash
cd /Users/chenliangjun/code/project/ai-short-video-script/backend && go build ./...
```

- [ ] **Step 3: Commit**

```bash
git add backend/handler/storyboard.go
git commit -m "feat(storyboard): add storyboard CRUD handlers"
```

---

## Task 4: 后端 Handler - 节点/连线 CRUD + 批量更新

**Files:**
- Create: `backend/handler/storyboard_node.go`

- [ ] **Step 1: 创建 storyboard_node.go handler**

```go
package handler

import (
	"encoding/json"
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

	// 验证画布归属
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

	// 删除旧的节点和连线，重新创建
	database.DeleteEdgesByStoryboard(storyboardID)
	nodes, _ := database.GetNodesByStoryboard(storyboardID)
	for _, n := range nodes {
		database.DeleteNode(n.ID)
	}

	// 创建新节点
	nodeIDMap := make(map[int]int) // oldID -> newID
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
```

- [ ] **Step 2: 验证编译**

```bash
cd /Users/chenliangjun/code/project/ai-short-video-script/backend && go build ./...
```

- [ ] **Step 3: Commit**

```bash
git add backend/handler/storyboard_node.go
git commit -m "feat(storyboard): add node/edge CRUD and batch update handlers"
```

---

## Task 5: 后端 - 模板 + AI分镜 + 导出 + 路由注册

**Files:**
- Create: `backend/handler/storyboard_template.go`
- Create: `backend/handler/storyboard_export.go`
- Create: `backend/service/storyboard_split.go`
- Modify: `backend/main.go`

- [ ] **Step 1: 创建 storyboard_template.go**

```go
package handler

import (
	"net/http"
	"strconv"

	"ai-short-video-backend/database"
	"ai-short-video-backend/middleware"

	"github.com/gin-gonic/gin"
)

// GetTemplates 获取模板列表
func GetTemplates(c *gin.Context) {
	rows, err := database.DB.Query(`
		SELECT id, name, category, description, is_system, use_count
		FROM storyboard_templates
		WHERE is_system = 1 OR user_id = ?
		ORDER BY is_system DESC, use_count DESC
	`, middleware.GetUserID(c))
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

	// 获取画布节点和连线
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

	// 获取模板
	var nodesJSON, edgesJSON string
	err := database.DB.QueryRow(`
		SELECT nodes_json, edges_json FROM storyboard_templates WHERE id = ?
	`, templateID).Scan(&nodesJSON, &edgesJSON)
	if err != nil {
		c.JSON(http.StatusNotFound, APIResponse{Code: 404, Message: "模板不存在"})
		return
	}

	// 验证画布归属
	sb, _ := database.GetStoryboard(storyboardID, userId)
	if sb == nil {
		c.JSON(http.StatusNotFound, APIResponse{Code: 404, Message: "画布不存在"})
		return
	}

	// 解析模板节点
	var templateNodes []database.StoryboardNode
	json.Unmarshal([]byte(nodesJSON), &templateNodes)

	// 清空现有节点和连线
	database.DeleteEdgesByStoryboard(storyboardID)
	existingNodes, _ := database.GetNodesByStoryboard(storyboardID)
	for _, n := range existingNodes {
		database.DeleteNode(n.ID)
	}

	// 创建模板节点
	database.BatchCreateNodes(storyboardID, templateNodes)

	// 增加模板使用次数
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
```

- [ ] **Step 2: 创建 storyboard_export.go**

```go
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

// ExportMarkdown 导出 Markdown
func ExportMarkdown(c *gin.Context) {
	userId := middleware.GetUserID(c)
	id, _ := strconv.Atoi(c.Param("id"))

	sb, _ := database.GetStoryboard(id, userId)
	if sb == nil {
		c.JSON(http.StatusNotFound, APIResponse{Code: 404, Message: "画布不存在"})
		return
	}

	nodes, _ := database.GetNodesByStoryboard(id)

	var md strings.Builder
	md.WriteString(fmt.Sprintf("# 分镜脚本：%s\n\n", sb.Name))

	sceneIndex := 1
	for _, n := range nodes {
		if n.NodeType != "scene" {
			continue
		}

		// 解析 config_json
		var config map[string]interface{}
		if n.ConfigJSON != "" {
			fmt.Sscanf(n.ConfigJSON, "%s", &config)
		}

		md.WriteString(fmt.Sprintf("## 分镜%d\n", sceneIndex))
		if script, ok := config["script"].(string); ok && script != "" {
			md.WriteString(fmt.Sprintf("- **文案**：%s\n", script))
		}
		if desc, ok := config["description"].(string); ok && desc != "" {
			md.WriteString(fmt.Sprintf("- **画面描述**：%s\n", desc))
		}
		if dur, ok := config["duration"].(string); ok && dur != "" {
			md.WriteString(fmt.Sprintf("- **时长**：%s\n", dur))
		}
		if shot, ok := config["shot_type"].(string); ok && shot != "" {
			shotLabels := map[string]string{"close": "近景", "medium": "中景", "long": "远景", "extreme_close": "特写"}
			md.WriteString(fmt.Sprintf("- **景别**：%s\n", shotLabels[shot]))
		}
		if cam, ok := config["camera_move"].(string); ok && cam != "" {
			camLabels := map[string]string{"static": "固定", "push": "推", "pull": "拉", "pan": "摇", "track": "跟"}
			md.WriteString(fmt.Sprintf("- **运镜**：%s\n", camLabels[cam]))
		}
		if notes, ok := config["notes"].(string); ok && notes != "" {
			md.WriteString(fmt.Sprintf("- **备注**：%s\n", notes))
		}
		md.WriteString("\n")
		sceneIndex++
	}

	c.Header("Content-Type", "text/markdown; charset=utf-8")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s.md", sb.Name))
	c.String(http.StatusOK, md.String())
}

// ExportText 导出纯文案
func ExportText(c *gin.Context) {
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
		// 简单提取 script 字段
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
```

- [ ] **Step 3: 创建 service/storyboard_split.go**

```go
package service

import (
	"encoding/json"
	"fmt"
	"strings"

	"ai-short-video-backend/database"
)

// SplitScene 分镜结果
type SplitScene struct {
	Script      string `json:"script"`
	Description string `json:"description"`
	Duration    string `json:"duration"`
	ShotType    string `json:"shot_type"`
	CameraMove  string `json:"camera_move"`
}

// AutoSplitStoryboard AI 自动拆分分镜
func AutoSplitStoryboard(userID int, storyboardID int, text string) ([]SplitScene, error) {
	prompt := fmt.Sprintf(`你是一个短视频分镜脚本专家。请根据以下文案内容，将其拆分为合理的分镜节点。

要求：
1. 每个分镜节点包含：文案片段、画面描述、建议时长、景别、运镜
2. 遵循"钩子→内容→结尾"的短视频结构
3. 每个分镜时长建议 3-15 秒
4. 总分镜数控制在 4-8 个
5. 景别使用：close/medium/long/extreme_close
6. 运镜使用：static/push/pull/pan/track

文案内容：
%s

请以 JSON 数组格式返回，不要包含其他文字：
[{"script":"文案片段","description":"画面描述","duration":"建议时长","shot_type":"景别","camera_move":"运镜"}]`, text)

	provider := GetProviderForUser(userID)
	response, err := provider.Chat([]ChatMessage{
		{Role: "user", Content: prompt},
	})
	if err != nil {
		return nil, fmt.Errorf("AI 调用失败: %v", err)
	}

	// 解析 JSON
	response = cleanJSONResponse(response)
	var scenes []SplitScene
	if err := json.Unmarshal([]byte(response), &scenes); err != nil {
		return nil, fmt.Errorf("解析 AI 响应失败: %v", err)
	}

	// 创建节点到画布
	for i, scene := range scenes {
		configJSON, _ := json.Marshal(map[string]interface{}{
			"script":       scene.Script,
			"description":  scene.Description,
			"duration":     scene.Duration,
			"shot_type":    scene.ShotType,
			"camera_move":  scene.CameraMove,
		})
		database.CreateNode(storyboardID, "scene", float64(100+i*350), 200, string(configJSON))
	}

	return scenes, nil
}

// cleanJSONResponse 清理 LLM 返回的 JSON（去掉可能的 markdown 代码块）
func cleanJSONResponse(s string) string {
	s = trimSpace(s)
	s = strings.TrimPrefix(s, "```json")
	s = strings.TrimPrefix(s, "```")
	s = strings.TrimSuffix(s, "```")
	return strings.TrimSpace(s)
}
```

注意：需要在 `service/storyboard_split.go` 顶部添加 `"strings"` import。

- [ ] **Step 4: 创建 storyboard_split handler**

在 `backend/handler/storyboard.go` 中追加：

```go
// AutoSplitStoryboard AI 自动拆分分镜
func AutoSplitStoryboard(c *gin.Context) {
	userId := middleware.GetUserID(c)
	storyboardID, _ := strconv.Atoi(c.Param("id"))

	sb, _ := database.GetStoryboard(storyboardID, userId)
	if sb == nil {
		c.JSON(http.StatusNotFound, APIResponse{Code: 404, Message: "画布不存在"})
		return
	}

	var req struct {
		Text string `json:"text" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{Code: 400, Message: "请输入文案内容"})
		return
	}

	scenes, err := service.AutoSplitStoryboard(userId, storyboardID, req.Text)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{Code: 500, Message: err.Error()})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code: 200, Message: "拆分成功",
		Data: gin.H{"scenes": scenes, "count": len(scenes)},
	})
}
```

- [ ] **Step 5: 注册所有路由**

在 `backend/main.go` 的 `auth` 路由组中追加：

```go
		// 画布
		auth.POST("/storyboards", handler.CreateStoryboard)
		auth.GET("/storyboards", handler.GetStoryboards)
		auth.GET("/storyboards/:id", handler.GetStoryboard)
		auth.PUT("/storyboards/:id", handler.UpdateStoryboard)
		auth.DELETE("/storyboards/:id", handler.DeleteStoryboard)

		// 画布节点
		auth.POST("/storyboards/:id/nodes", handler.CreateNode)
		auth.PUT("/storyboards/:id/nodes/:nodeId", handler.UpdateNode)
		auth.DELETE("/storyboards/:id/nodes/:nodeId", handler.DeleteNode)

		// 画布连线
		auth.POST("/storyboards/:id/edges", handler.CreateEdge)
		auth.DELETE("/storyboards/:id/edges/:edgeId", handler.DeleteEdge)

		// 批量更新
		auth.PUT("/storyboards/:id/batch", handler.BatchUpdate)

		// AI 分镜
		auth.POST("/storyboards/:id/auto-split", handler.AutoSplitStoryboard)

		// 模板
		auth.GET("/storyboard-templates", handler.GetTemplates)
		auth.GET("/storyboard-templates/:id", handler.GetTemplate)
		auth.POST("/storyboards/:id/save-as-template", handler.SaveAsTemplate)
		auth.POST("/storyboards/:id/apply-template/:templateId", handler.ApplyTemplate)
		auth.DELETE("/storyboard-templates/:id", handler.DeleteTemplate)

		// 导出
		auth.GET("/storyboards/:id/export/md", handler.ExportMarkdown)
		auth.GET("/storyboards/:id/export/text", handler.ExportText)
```

- [ ] **Step 6: 验证编译**

```bash
cd /Users/chenliangjun/code/project/ai-short-video-script/backend && go build ./...
```

- [ ] **Step 7: Commit**

```bash
git add backend/handler/storyboard_template.go backend/handler/storyboard_export.go backend/service/storyboard_split.go backend/handler/storyboard.go backend/main.go
git commit -m "feat(storyboard): add template, AI split, export handlers and routes"
```

---

## Task 6: 前端 - 安装依赖 + 类型 + API

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/store/videoApi.ts`

- [ ] **Step 1: 安装 reactflow**

```bash
cd /Users/chenliangjun/code/project/ai-short-video-script/frontend && pnpm add reactflow
```

- [ ] **Step 2: 在 types/index.ts 中添加类型**

在文件末尾追加：

```typescript
// V2.0 画布类型
export interface Storyboard {
  id: number
  userId: number
  videoId?: number
  name: string
  status: string
  viewportJson?: string
  version: number
  createdAt: string
  updatedAt: string
}

export interface StoryboardNode {
  id: number
  storyboardId: number
  nodeType: string
  positionX: number
  positionY: number
  width: number
  height: number
  configJson?: string
  state: string
  resultJson?: string
  orderIndex?: number
  createdAt: string
  updatedAt: string
}

export interface StoryboardEdge {
  id: number
  storyboardId: number
  sourceNodeId: number
  targetNodeId: number
  sourceHandle?: string
  targetHandle?: string
  label?: string
  createdAt: string
}

export interface StoryboardDetailResponse {
  code: number
  data: {
    storyboard: Storyboard
    nodes: StoryboardNode[]
    edges: StoryboardEdge[]
  }
}

export interface StoryboardListResponse {
  code: number
  data: {
    storyboards: Storyboard[]
    pagination: { page: number; pageSize: number; total: number }
  }
}

export interface SceneConfig {
  script?: string
  description?: string
  duration?: string
  imageUrl?: string
  shot_type?: string
  camera_move?: string
  notes?: string
  tags?: string[]
  label?: string
}
```

- [ ] **Step 3: 在 videoApi.ts 中添加 endpoints**

在 `endpoints` 函数末尾追加：

```typescript
    // Storyboard
    getStoryboardList: builder.query<StoryboardListResponse, { page: number; pageSize: number }>({
      query: ({ page, pageSize }) => `/storyboards?page=${page}&pageSize=${pageSize}`,
      providesTags: ['Video'],
    }),
    getStoryboard: builder.query<StoryboardDetailResponse, number>({
      query: (id) => `/storyboards/${id}`,
      providesTags: ['Video'],
    }),
    createStoryboard: builder.mutation<{ code: number; data: { id: number } }, { name: string; videoId?: number }>({
      query: (body) => ({ url: '/storyboards', method: 'POST', body }),
      invalidatesTags: ['Video'],
    }),
    updateStoryboard: builder.mutation<{ code: number }, { id: number; name?: string; viewportJson?: string }>({
      query: ({ id, ...body }) => ({ url: `/storyboards/${id}`, method: 'PUT', body }),
    }),
    deleteStoryboard: builder.mutation<{ code: number }, number>({
      query: (id) => ({ url: `/storyboards/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Video'],
    }),
    batchUpdateStoryboard: builder.mutation<{ code: number }, { id: number; viewportJson?: string; nodes: any[]; edges: any[] }>({
      query: ({ id, ...body }) => ({ url: `/storyboards/${id}/batch`, method: 'PUT', body }),
    }),
    autoSplitStoryboard: builder.mutation<{ code: number; data: { scenes: any[] } }, { id: number; text: string }>({
      query: ({ id, ...body }) => ({ url: `/storyboards/${id}/auto-split`, method: 'POST', body }),
    }),
    getTemplates: builder.query<{ code: number; data: { templates: any[] } }, void>({
      query: () => '/storyboard-templates',
    }),
    getTemplate: builder.query<{ code: number; data: any }, number>({
      query: (id) => `/storyboard-templates/${id}`,
    }),
    applyTemplate: builder.mutation<{ code: number }, { storyboardId: number; templateId: number }>({
      query: ({ storyboardId, templateId }) => ({
        url: `/storyboards/${storyboardId}/apply-template/${templateId}`,
        method: 'POST',
      }),
    }),
    saveAsTemplate: builder.mutation<{ code: number }, { storyboardId: number; name: string; category?: string }>({
      query: ({ storyboardId, ...body }) => ({
        url: `/storyboards/${storyboardId}/save-as-template`,
        method: 'POST',
        body,
      }),
    }),
```

确保在 import 中添加新类型。

- [ ] **Step 4: 验证前端编译**

```bash
cd /Users/chenliangjun/code/project/ai-short-video-script/frontend && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/pnpm-lock.yaml frontend/src/types/index.ts frontend/src/store/videoApi.ts
git commit -m "feat(storyboard): add reactflow, types and API endpoints"
```

---

## Task 7: 前端 - SceneNode 组件

**Files:**
- Create: `frontend/src/components/storyboard/SceneNode.tsx`

- [ ] **Step 1: 创建 SceneNode.tsx**

```tsx
import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { SceneConfig } from '../../types'

const SceneNode = memo(({ data, selected }: NodeProps) => {
  const config: SceneConfig = data.config || {}
  const nodeType = data.nodeType || 'scene'

  if (nodeType === 'start') {
    return (
      <div className="px-4 py-2 shadow-md rounded-full bg-green-100 border-2 border-green-400 min-w-[80px] text-center">
        <div className="text-sm font-medium text-green-800">{config.label || '开始'}</div>
        <Handle type="source" position={Position.Right} className="w-3 h-3 bg-green-500" />
      </div>
    )
  }

  if (nodeType === 'end') {
    return (
      <div className="px-4 py-2 shadow-md rounded-full bg-red-100 border-2 border-red-400 min-w-[80px] text-center">
        <Handle type="target" position={Position.Left} className="w-3 h-3 bg-red-500" />
        <div className="text-sm font-medium text-red-800">{config.label || '结束'}</div>
      </div>
    )
  }

  // scene 节点
  const shotLabels: Record<string, string> = {
    close: '近景', medium: '中景', long: '远景', extreme_close: '特写',
  }
  const camLabels: Record<string, string> = {
    static: '固定', push: '推', pull: '拉', pan: '摇', track: '跟',
  }

  return (
    <div className={`shadow-md rounded-lg bg-white border-2 min-w-[250px] max-w-[300px] ${
      selected ? 'border-sky-500' : 'border-slate-200'
    }`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-sky-500" />

      {/* Header */}
      <div className="px-3 py-2 bg-sky-50 border-b border-slate-100 rounded-t-lg flex items-center justify-between">
        <span className="text-xs font-medium text-sky-700">🎬 分镜</span>
        {config.duration && (
          <span className="text-xs text-slate-500">{config.duration}</span>
        )}
      </div>

      {/* Content */}
      <div className="px-3 py-2 space-y-1">
        {config.script && (
          <p className="text-xs text-slate-800 line-clamp-3">{config.script}</p>
        )}
        {config.description && (
          <p className="text-xs text-slate-500 line-clamp-2">📷 {config.description}</p>
        )}
        <div className="flex gap-1 flex-wrap">
          {config.shot_type && (
            <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">
              {shotLabels[config.shot_type] || config.shot_type}
            </span>
          )}
          {config.camera_move && (
            <span className="text-xs px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded">
              {camLabels[config.camera_move] || config.camera_move}
            </span>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-sky-500" />
    </div>
  )
})

SceneNode.displayName = 'SceneNode'

export default SceneNode
```

- [ ] **Step 2: 验证编译**

```bash
cd /Users/chenliangjun/code/project/ai-short-video-script/frontend && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/storyboard/SceneNode.tsx
git commit -m "feat(storyboard): add SceneNode component"
```

---

## Task 8: 前端 - Canvas 组件

**Files:**
- Create: `frontend/src/components/storyboard/Canvas.tsx`

- [ ] **Step 1: 创建 Canvas.tsx**

```tsx
import { useCallback, useRef } from 'react'
import ReactFlow, {
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  Connection,
  Edge,
  Node,
  ReactFlowInstance,
  NodeChange,
  EdgeChange,
} from 'reactflow'
import 'reactflow/dist/style.css'

import SceneNode from './SceneNode'

const nodeTypes = { scene: SceneNode, start: SceneNode, end: SceneNode }

interface CanvasProps {
  initialNodes: Node[]
  initialEdges: Edge[]
  onNodesChange: (nodes: Node[]) => void
  onEdgesChange: (edges: Edge[]) => void
  onNodeClick: (nodeId: string) => void
  onPaneDoubleClick: (position: { x: number; y: number }) => void
}

export default function Canvas({
  initialNodes,
  initialEdges,
  onNodesChange,
  onEdgesChange,
  onNodeClick,
  onPaneDoubleClick,
}: CanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [nodes, setNodes, handleNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, handleEdgesChange] = useEdgesState(initialEdges)
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null)

  // 同步节点变化到父组件
  const onNodesChangeWrapper = useCallback(
    (changes: NodeChange[]) => {
      handleNodesChange(changes)
      // 延迟同步，避免频繁更新
      setTimeout(() => {
        setNodes((nds) => {
          onNodesChange(nds)
          return nds
        })
      }, 300)
    },
    [handleNodesChange, onNodesChange, setNodes]
  )

  const onEdgesChangeWrapper = useCallback(
    (changes: EdgeChange[]) => {
      handleEdgesChange(changes)
      setTimeout(() => {
        setEdges((eds) => {
          onEdgesChange(eds)
          return eds
        })
      }, 300)
    },
    [handleEdgesChange, onEdgesChange, setEdges]
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, animated: true }, eds))
    },
    [setEdges]
  )

  const onNodeClickWrapper = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeClick(node.id)
    },
    [onNodeClick]
  )

  const onPaneDoubleClickWrapper = useCallback(
    (_: React.MouseEvent) => {
      if (reactFlowInstance.current) {
        const position = reactFlowInstance.current.screenToFlowPosition({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        })
        onPaneDoubleClick(position)
      }
    },
    [onPaneDoubleClick]
  )

  return (
    <div ref={reactFlowWrapper} className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChangeWrapper}
        onEdgesChange={onEdgesChangeWrapper}
        onConnect={onConnect}
        onNodeClick={onNodeClickWrapper}
        onPaneDoubleClick={onPaneDoubleClickWrapper}
        onInit={(instance) => (reactFlowInstance.current = instance)}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        defaultEdgeOptions={{ animated: true }}
        deleteKeyCode={['Backspace', 'Delete']}
      >
        <Controls />
        <MiniMap />
        <Background gap={15} size={1} />
      </ReactFlow>
    </div>
  )
}
```

- [ ] **Step 2: 验证编译**

```bash
cd /Users/chenliangjun/code/project/ai-short-video-script/frontend && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/storyboard/Canvas.tsx
git commit -m "feat(storyboard): add Canvas component with React Flow"
```

---

## Task 9: 前端 - StoryboardListPage

**Files:**
- Create: `frontend/src/pages/StoryboardListPage.tsx`

- [ ] **Step 1: 创建 StoryboardListPage.tsx**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { videoApi } from '../store/videoApi'

export default function StoryboardListPage() {
  const navigate = useNavigate()
  const [page] = useState(1)
  const { data, isLoading } = videoApi.useGetStoryboardListQuery({ page, pageSize: 20 })
  const [createStoryboard] = videoApi.useCreateStoryboardMutation()
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')

  const storyboards = data?.data?.storyboards || []

  const handleCreate = async () => {
    if (!newName.trim()) return
    try {
      const result = await createStoryboard({ name: newName.trim() }).unwrap()
      setShowCreate(false)
      setNewName('')
      navigate(`/storyboard/${result.data.id}`)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="flex items-center justify-between h-16 px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="text-sm text-slate-500 hover:text-slate-900">
              ← 返回首页
            </button>
            <h1 className="text-lg font-semibold text-slate-900">我的脚本</h1>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-sky-500 text-white text-sm font-medium rounded-lg hover:bg-sky-600 transition-colors"
          >
            新建画布
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {isLoading ? (
          <p className="text-sm text-slate-400">加载中...</p>
        ) : storyboards.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-400 mb-4">还没有脚本</p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-sky-500 text-white text-sm rounded-lg hover:bg-sky-600"
            >
              创建第一个画布
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {storyboards.map((sb) => (
              <div
                key={sb.id}
                onClick={() => navigate(`/storyboard/${sb.id}`)}
                className="bg-white rounded-xl border border-slate-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
              >
                <h3 className="text-sm font-semibold text-slate-900 mb-1">{sb.name}</h3>
                <p className="text-xs text-slate-400">
                  更新于 {new Date(sb.updatedAt).toLocaleDateString('zh-CN')}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-96">
            <h2 className="text-lg font-semibold mb-4">新建画布</h2>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="输入画布名称"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mb-4"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-slate-500">
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="px-4 py-2 bg-sky-500 text-white text-sm rounded-lg hover:bg-sky-600 disabled:opacity-50"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 验证编译**

```bash
cd /Users/chenliangjun/code/project/ai-short-video-script/frontend && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/StoryboardListPage.tsx
git commit -m "feat(storyboard): add StoryboardListPage"
```

---

## Task 10: 前端 - StoryboardEditorPage + NodeEditorPanel

**Files:**
- Create: `frontend/src/pages/StoryboardEditorPage.tsx`
- Create: `frontend/src/components/storyboard/NodeEditorPanel.tsx`
- Create: `frontend/src/components/storyboard/CanvasToolbar.tsx`
- Create: `frontend/src/components/storyboard/AISplitPanel.tsx`
- Create: `frontend/src/components/storyboard/TemplatePanel.tsx`
- Create: `frontend/src/components/storyboard/ExportMenu.tsx`

- [ ] **Step 1: 创建 NodeEditorPanel.tsx**

```tsx
import { useState, useEffect } from 'react'
import { SceneConfig } from '../../types'

interface NodeEditorPanelProps {
  nodeId: string
  config: SceneConfig
  onSave: (config: SceneConfig) => void
  onClose: () => void
}

export default function NodeEditorPanel({ nodeId, config, onSave, onClose }: NodeEditorPanelProps) {
  const [script, setScript] = useState(config.script || '')
  const [description, setDescription] = useState(config.description || '')
  const [duration, setDuration] = useState(config.duration || '')
  const [shotType, setShotType] = useState(config.shot_type || '')
  const [cameraMove, setCameraMove] = useState(config.camera_move || '')
  const [notes, setNotes] = useState(config.notes || '')

  useEffect(() => {
    setScript(config.script || '')
    setDescription(config.description || '')
    setDuration(config.duration || '')
    setShotType(config.shot_type || '')
    setCameraMove(config.camera_move || '')
    setNotes(config.notes || '')
  }, [config, nodeId])

  const handleSave = () => {
    onSave({
      script, description, duration,
      shot_type: shotType, camera_move: cameraMove,
      notes,
    })
  }

  return (
    <div className="w-80 bg-white border-l border-slate-200 h-full overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-900">编辑分镜</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">文案</label>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">画面描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-500 mb-1">时长</label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="0-5s"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">景别</label>
              <select
                value={shotType}
                onChange={(e) => setShotType(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="">选择</option>
                <option value="extreme_close">特写</option>
                <option value="close">近景</option>
                <option value="medium">中景</option>
                <option value="long">远景</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">运镜</label>
            <select
              value={cameraMove}
              onChange={(e) => setCameraMove(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">选择</option>
              <option value="static">固定</option>
              <option value="push">推</option>
              <option value="pull">拉</option>
              <option value="pan">摇</option>
              <option value="track">跟</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">备注</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <button
            onClick={handleSave}
            className="w-full py-2 bg-sky-500 text-white text-sm font-medium rounded-lg hover:bg-sky-600 transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 创建 CanvasToolbar.tsx**

```tsx
interface CanvasToolbarProps {
  name: string
  onNameChange: (name: string) => void
  onSave: () => void
  onAISplit: () => void
  onTemplate: () => void
  onExport: () => void
  isSaving: boolean
}

export default function CanvasToolbar({
  name, onNameChange, onSave, onAISplit, onTemplate, onExport, isSaving,
}: CanvasToolbarProps) {
  return (
    <div className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="text-sm font-medium text-slate-900 bg-transparent border-none outline-none max-w-[200px]"
          placeholder="画布名称"
        />
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onAISplit} className="px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100">
          AI 分镜
        </button>
        <button onClick={onTemplate} className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100">
          模板
        </button>
        <button onClick={onExport} className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 rounded-lg hover:bg-slate-100">
          导出
        </button>
        <button
          onClick={onSave}
          disabled={isSaving}
          className="px-3 py-1.5 text-xs font-medium text-white bg-sky-500 rounded-lg hover:bg-sky-600 disabled:opacity-50"
        >
          {isSaving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 创建 AISplitPanel.tsx**

```tsx
import { useState } from 'react'

interface AISplitPanelProps {
  onSplit: (text: string) => void
  onClose: () => void
  isLoading: boolean
}

export default function AISplitPanel({ onSplit, onClose, isLoading }: AISplitPanelProps) {
  const [text, setText] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl p-6 w-[500px]">
        <h2 className="text-lg font-semibold mb-2">AI 智能分镜</h2>
        <p className="text-xs text-slate-400 mb-4">输入文案，AI 自动拆分为分镜节点（消耗 5 积分）</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder="粘贴你的短视频文案..."
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-500 mb-4"
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500">取消</button>
          <button
            onClick={() => onSplit(text)}
            disabled={!text.trim() || isLoading}
            className="px-4 py-2 bg-purple-500 text-white text-sm rounded-lg hover:bg-purple-600 disabled:opacity-50"
          >
            {isLoading ? '拆分中...' : '开始拆分'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 创建 TemplatePanel.tsx**

```tsx
interface TemplatePanelProps {
  templates: any[]
  onApply: (templateId: number) => void
  onSaveAs: () => void
  onClose: () => void
}

export default function TemplatePanel({ templates, onApply, onSaveAs, onClose }: TemplatePanelProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl p-6 w-[400px]">
        <h2 className="text-lg font-semibold mb-4">模板</h2>
        <div className="space-y-2 max-h-[300px] overflow-y-auto mb-4">
          {templates.map((t) => (
            <div
              key={t.id}
              onClick={() => onApply(t.id)}
              className="p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50"
            >
              <h3 className="text-sm font-medium text-slate-900">{t.name}</h3>
              {t.description && <p className="text-xs text-slate-400 mt-1">{t.description}</p>}
            </div>
          ))}
          {templates.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">暂无模板</p>
          )}
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500">关闭</button>
          <button
            onClick={onSaveAs}
            className="px-4 py-2 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600"
          >
            保存当前为模板
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: 创建 ExportMenu.tsx**

```tsx
interface ExportMenuProps {
  storyboardId: number
  onClose: () => void
}

export default function ExportMenu({ storyboardId, onClose }: ExportMenuProps) {
  const handleExport = (format: string) => {
    const url = `/api/storyboards/${storyboardId}/export/${format}`
    const token = localStorage.getItem('token')
    const a = document.createElement('a')
    a.href = url
    a.setAttribute('download', '')
    // 需要通过 fetch 下载（带 token）
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob)
        a.href = blobUrl
        a.click()
        URL.revokeObjectURL(blobUrl)
      })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-[300px]" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">导出</h2>
        <div className="space-y-2">
          <button
            onClick={() => handleExport('md')}
            className="w-full p-3 text-left border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <span className="text-sm font-medium">Markdown</span>
            <span className="text-xs text-slate-400 block">分镜号+画面描述+文案+时长</span>
          </button>
          <button
            onClick={() => handleExport('text')}
            className="w-full p-3 text-left border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <span className="text-sm font-medium">纯文案</span>
            <span className="text-xs text-slate-400 block">只导出文案内容</span>
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: 创建 StoryboardEditorPage.tsx**

```tsx
import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Node, Edge } from 'reactflow'
import { videoApi } from '../store/videoApi'
import { SceneConfig } from '../types'
import Canvas from '../components/storyboard/Canvas'
import CanvasToolbar from '../components/storyboard/CanvasToolbar'
import NodeEditorPanel from '../components/storyboard/NodeEditorPanel'
import AISplitPanel from '../components/storyboard/AISplitPanel'
import TemplatePanel from '../components/storyboard/TemplatePanel'
import ExportMenu from '../components/storyboard/ExportMenu'

export default function StoryboardEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const storyboardId = Number(id)

  const { data: sbData, isLoading, refetch } = videoApi.useGetStoryboardQuery(storyboardId)
  const [updateStoryboard] = videoApi.useUpdateStoryboardMutation()
  const [batchUpdate] = videoApi.useBatchUpdateStoryboardMutation()
  const [autoSplit] = videoApi.useAutoSplitStoryboardMutation()
  const { data: templatesData } = videoApi.useGetTemplatesQuery()
  const [applyTemplate] = videoApi.useApplyTemplateMutation()
  const [saveAsTemplate] = videoApi.useSaveAsTemplateMutation()

  const [name, setName] = useState('')
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showAISplit, setShowAISplit] = useState(false)
  const [showTemplate, setShowTemplate] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [isSplitting, setIsSplitting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // 从 API 数据初始化
  useEffect(() => {
    if (sbData?.data) {
      const { storyboard, nodes: dbNodes, edges: dbEdges } = sbData.data
      setName(storyboard.name)

      const flowNodes: Node[] = (dbNodes || []).map((n) => ({
        id: String(n.id),
        type: n.nodeType,
        position: { x: n.positionX, y: n.positionY },
        data: {
          nodeType: n.nodeType,
          config: n.configJson ? JSON.parse(n.configJson) : {},
        },
      }))
      setNodes(flowNodes)

      const flowEdges: Edge[] = (dbEdges || []).map((e) => ({
        id: String(e.id),
        source: String(e.sourceNodeId),
        target: String(e.targetNodeId),
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        animated: true,
      }))
      setEdges(flowEdges)
    }
  }, [sbData])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // 保存画布
  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      await batchUpdate({
        id: storyboardId,
        nodes: nodes.map((n) => ({
          id: Number(n.id),
          nodeType: n.data?.nodeType || 'scene',
          positionX: n.position.x,
          positionY: n.position.y,
          configJson: JSON.stringify(n.data?.config || {}),
        })),
        edges: edges.map((e) => ({
          sourceNodeId: Number(e.source),
          targetNodeId: Number(e.target),
          sourceHandle: e.sourceHandle || '',
          targetHandle: e.targetHandle || '',
        })),
      }).unwrap()
      showToast('保存成功')
      refetch()
    } catch (err) {
      showToast('保存失败')
    }
    setIsSaving(false)
  }, [storyboardId, nodes, edges, batchUpdate, refetch])

  // 双击创建节点
  const handlePaneDoubleClick = useCallback(
    (position: { x: number; y: number }) => {
      const newNode: Node = {
        id: `temp-${Date.now()}`,
        type: 'scene',
        position,
        data: {
          nodeType: 'scene',
          config: { script: '', description: '', duration: '' },
        },
      }
      setNodes((nds) => [...nds, newNode])
    },
    []
  )

  // 选中节点
  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId)
  }, [])

  // 更新节点配置
  const handleNodeConfigSave = useCallback(
    (config: SceneConfig) => {
      if (!selectedNodeId) return
      setNodes((nds) =>
        nds.map((n) =>
          n.id === selectedNodeId ? { ...n, data: { ...n.data, config } } : n
        )
      )
      setSelectedNodeId(null)
    },
    [selectedNodeId]
  )

  // AI 分镜
  const handleAISplit = useCallback(
    async (text: string) => {
      setIsSplitting(true)
      try {
        const result = await autoSplit({ id: storyboardId, text }).unwrap()
        showToast(`拆分成功，生成 ${result.data.count} 个分镜`)
        refetch()
        setShowAISplit(false)
      } catch (err: any) {
        showToast(err.data?.message || '拆分失败')
      }
      setIsSplitting(false)
    },
    [storyboardId, autoSplit, refetch]
  )

  // 应用模板
  const handleApplyTemplate = useCallback(
    async (templateId: number) => {
      try {
        await applyTemplate({ storyboardId, templateId }).unwrap()
        showToast('应用成功')
        refetch()
        setShowTemplate(false)
      } catch (err) {
        showToast('应用失败')
      }
    },
    [storyboardId, applyTemplate, refetch]
  )

  // 保存为模板
  const handleSaveAsTemplate = useCallback(async () => {
    const templateName = prompt('输入模板名称')
    if (!templateName) return
    try {
      await saveAsTemplate({ storyboardId, name: templateName }).unwrap()
      showToast('保存成功')
    } catch (err) {
      showToast('保存失败')
    }
  }, [storyboardId, saveAsTemplate])

  // 选中的节点
  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen text-slate-400">加载中...</div>
  }

  return (
    <div className="h-screen flex flex-col">
      <CanvasToolbar
        name={name}
        onNameChange={setName}
        onSave={handleSave}
        onAISplit={() => setShowAISplit(true)}
        onTemplate={() => setShowTemplate(true)}
        onExport={() => setShowExport(true)}
        isSaving={isSaving}
      />
      <div className="flex-1 flex">
        <div className="flex-1">
          <Canvas
            initialNodes={nodes}
            initialEdges={edges}
            onNodesChange={setNodes}
            onEdgesChange={setEdges}
            onNodeClick={handleNodeClick}
            onPaneDoubleClick={handlePaneDoubleClick}
          />
        </div>
        {selectedNode && selectedNode.data?.nodeType === 'scene' && (
          <NodeEditorPanel
            nodeId={selectedNodeId!}
            config={selectedNode.data.config || {}}
            onSave={handleNodeConfigSave}
            onClose={() => setSelectedNodeId(null)}
          />
        )}
      </div>

      {showAISplit && (
        <AISplitPanel
          onSplit={handleAISplit}
          onClose={() => setShowAISplit(false)}
          isLoading={isSplitting}
        />
      )}
      {showTemplate && (
        <TemplatePanel
          templates={templatesData?.data?.templates || []}
          onApply={handleApplyTemplate}
          onSaveAs={handleSaveAsTemplate}
          onClose={() => setShowTemplate(false)}
        />
      )}
      {showExport && (
        <ExportMenu storyboardId={storyboardId} onClose={() => setShowExport(false)} />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-900 text-white text-sm rounded-lg shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 7: 验证编译**

```bash
cd /Users/chenliangjun/code/project/ai-short-video-script/frontend && npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add frontend/src/pages/StoryboardEditorPage.tsx frontend/src/components/storyboard/
git commit -m "feat(storyboard): add StoryboardEditorPage and all subcomponents"
```

---

## Task 11: 前端 - Header + 路由 + DetailPage 入口

**Files:**
- Modify: `frontend/src/components/Header.tsx`
- Modify: `frontend/src/main.tsx`
- Modify: `frontend/src/pages/DetailPage.tsx`

- [ ] **Step 1: 修改 Header.tsx 添加"脚本"Tab**

在 Header.tsx 的"素材库"按钮之后添加：

```tsx
              {/* Storyboard */}
              <button
                onClick={() => navigate('/storyboards')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  location.pathname === '/storyboards'
                    ? 'bg-sky-100 text-sky-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                脚本
              </button>
```

- [ ] **Step 2: 在 main.tsx 添加路由**

import 添加：
```typescript
import StoryboardListPage from './pages/StoryboardListPage'
import StoryboardEditorPage from './pages/StoryboardEditorPage'
```

路由添加（在 `/profile` 路由之后）：
```typescript
  {
    path: '/storyboards',
    element: (
      <ProtectedRoute>
        <StoryboardListPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/storyboard/:id',
    element: (
      <ProtectedRoute>
        <StoryboardEditorPage />
      </ProtectedRoute>
    ),
  },
```

- [ ] **Step 3: 在 DetailPage 添加"创建分镜脚本"按钮**

在 DetailPage 的文案区域附近添加按钮：

```tsx
import { useNavigate } from 'react-router-dom'
import { videoApi } from '../store/videoApi'

// 在组件内部：
const navigate = useNavigate()
const [createStoryboard] = videoApi.useCreateStoryboardMutation()

const handleCreateStoryboard = async () => {
  try {
    const result = await createStoryboard({ name: video.title, videoId: video.id }).unwrap()
    navigate(`/storyboard/${result.data.id}`)
  } catch (err) {
    console.error(err)
  }
}

// 在文案区域附近添加按钮：
<button
  onClick={handleCreateStoryboard}
  className="px-3 py-1.5 text-xs font-medium text-sky-700 bg-sky-50 rounded-lg hover:bg-sky-100 transition-colors"
>
  创建分镜脚本
</button>
```

- [ ] **Step 4: 验证编译**

```bash
cd /Users/chenliangjun/code/project/ai-short-video-script/frontend && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Header.tsx frontend/src/main.tsx frontend/src/pages/DetailPage.tsx
git commit -m "feat(storyboard): add header tab, routes and DetailPage entry"
```

---

## Task 12: 端到端验证

- [ ] **Step 1: 启动后端**

```bash
cd /Users/chenliangjun/code/project/ai-short-video-script/backend && go run .
```

- [ ] **Step 2: 测试画布 API**

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"luka","password":"your_pass"}' | jq -r '.data.token')

# 创建画布
curl -s -X POST http://localhost:3000/api/storyboards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"测试画布"}' | jq .

# 获取画布列表
curl -s http://localhost:3000/api/storyboards \
  -H "Authorization: Bearer $TOKEN" | jq .

# 获取画布详情
curl -s http://localhost:3000/api/storyboards/1 \
  -H "Authorization: Bearer $TOKEN" | jq .
```

- [ ] **Step 3: 启动前端并验证**

```bash
cd /Users/chenliangjun/code/project/ai-short-video-script/frontend && pnpm dev
```

访问 http://localhost:5173/storyboards，验证：
- 列表页正常显示
- 可以创建新画布
- 画布编辑器正常加载
- 双击可以创建节点
- 节点可以拖拽
- 可以连线
- 点击节点弹出编辑面板
- AI 分镜功能可用
- 导出功能可用

- [ ] **Step 4: Final Commit**

```bash
git add -A
git commit -m "feat(storyboard): complete V2.0 phase 1 storyboard canvas"
```
