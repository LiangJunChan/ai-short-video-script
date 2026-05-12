# V1.7 短视频广场 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现短视频广场功能，让用户可以浏览所有用户公开的视频封面和选题，发现热门爆款，并收藏到自己的素材库后单独付费提取文案。

**Architecture:** 遵循现有项目架构，后端新增square handler处理广场相关API，前端新增SquarePage页面组件，数据库迁移增加两个字段用于广场功能。严格保持数据隔离：每个用户必须自己付费才能提取文案，即使原作者已经提取过。

**Tech Stack:**
- 后端: Go 1.21 + Gin + SQLite
- 前端: React 19 + TypeScript + Vite + Tailwind CSS + Redux Toolkit RTK Query
- 遵循现有项目编码规范和模块拆分方式

---

## 文件结构规划

| 文件 | 操作 | 职责 |
|------|------|------|
| `backend/database/migrations.go` | Create | 数据库迁移，新增字段 |
| `backend/database/square.go` | Create | 广场数据库查询操作 |
| `backend/handler/square.go` | Create | 广场API处理器 |
| `backend/main.go` | Modify | 注册广场路由 |
| `frontend/src/store/videoApi.ts` | Modify | 新增广场API端点定义 |
| `frontend/src/pages/SquarePage.tsx` | Create | 广场页面组件 |
| `frontend/src/components/Header.tsx` | Modify | 顶部导航新增广场Tab |
| `frontend/src/App.tsx` | Modify | 新增广场路由 |

---

## 任务分解

### Task 1: 数据库迁移 - 新增广场所需字段

**Files:**
- Create: `backend/database/migrations.go`

- [ ] **Step 1: 创建迁移文件**

```go
package database

import (
	"log"
)

// RunSquareMigrations 执行短视频广场功能数据库迁移
func RunSquareMigrations() {
	// 1. users表新增 allow_public_square 字段
	// 用户是否允许自己的视频出现在广场
	_, err := DB.Exec(`
		ALTER TABLE users ADD COLUMN allow_public_square INTEGER DEFAULT 1;
	`)
	if err != nil {
		// 如果列已存在，忽略错误
		log.Printf("Warning: add allow_public_square column: %v", err)
	}

	// 2. videos表新增 collect_count 字段
	// 记录被多少用户收藏，用于热门排序
	_, err = DB.Exec(`
		ALTER TABLE videos ADD COLUMN collect_count INTEGER DEFAULT 0;
	`)
	if err != nil {
		log.Printf("Warning: add collect_count column: %v", err)
	}
}
```

- [ ] **Step 2: 在数据库初始化调用迁移**

Modify `backend/database/db.go`:
Find the `InitDB()` function, add this line at the end after table creation:

```go
// Run migrations for new features
RunSquareMigrations()
```

- [ ] **Step 3: 编译验证**

Run:
```bash
cd backend && go build -o server
```
Expected: 编译成功，无错误

- [ ] **Step 4: Commit**

```bash
git add backend/database/migrations.go backend/database/db.go
git commit -m "feat(square): add database migrations for video square"
```

---

### Task 2: 实现广场数据库查询层

**Files:**
- Create: `backend/database/square.go`

- [ ] **Step 1: 完整代码**

```go
package database

import (
	"database/sql"
	"time"
)

// SquareVideo 广场视频列表项
type SquareVideo struct {
	ID           int       `json:"id"`
	Title        string    `json:"title"`
	ThumbnailURL string    `json:"thumbnailUrl"`
	Username     string    `json:"username"`
	Tags         *string   `json:"tags"`
	CollectCount int       `json:"collectCount"`
	CreatedAt    time.Time `json:"createdAt"`
}

// GetPublicVideos 获取公开视频列表（分页）
func GetPublicVideos(page, pageSize int, sortBy string) ([]SquareVideo, int, error) {
	// sortBy: "newest" 按时间倒序 / "popular" 按收藏数倒序
	offset := (page - 1) * pageSize

	query := `
		SELECT 
			v.id, 
			v.title, 
			v.thumbnail_url, 
			u.username, 
			v.ai_tags, 
			v.collect_count,
			v.created_at
		FROM videos v
		JOIN users u ON v.user_id = u.id
		WHERE u.allow_public_square = 1
		AND v.status = 'done'
	`

	var orderClause string
	switch sortBy {
	case "popular":
		orderClause = " ORDER BY v.collect_count DESC, v.created_at DESC"
	default: // newest
		orderClause = " ORDER BY v.created_at DESC"
	}

	rows, err := DB.Query(query + orderClause + " LIMIT ? OFFSET ?", pageSize, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var videos []SquareVideo
	for rows.Next() {
		var v SquareVideo
		err := rows.Scan(
			&v.ID,
			&v.Title,
			&v.ThumbnailURL,
			&v.Username,
			&v.Tags,
			&v.CollectCount,
			&v.CreatedAt,
		)
		if err != nil {
			return nil, 0, err
		}
		videos = append(videos, v)
	}

	// Get total count
	var total int
	err = DB.QueryRow(`
		SELECT COUNT(*)
		FROM videos v
		JOIN users u ON v.user_id = u.id
		WHERE u.allow_public_square = 1
		AND v.status = 'done'
	`).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	return videos, total, nil
}

// IncrementCollectCount 增加收藏计数
func IncrementCollectCount(videoId int) error {
	_, err := DB.Exec(`
		UPDATE videos SET collect_count = collect_count + 1 WHERE id = ?
	`, videoId)
	return err
}

// CheckVideoIsPublic 检查视频是否可以公开访问
func CheckVideoIsPublic(videoId int) (bool, error) {
	var allow bool
	err := DB.QueryRow(`
		SELECT u.allow_public_square
		FROM videos v
		JOIN users u ON v.user_id = u.id
		WHERE v.id = ?
	`, videoId).Scan(&allow)
	if err != nil {
		return false, err
	}
	return allow, nil
}
```

- [ ] **Step 2: 编译验证**

```bash
cd backend && go build -o server
```
Expected: 编译成功

- [ ] **Step 3: Commit**

```bash
git add backend/database/square.go
git commit -m "feat(square): add database layer for square videos"
```

---

### Task 3: 实现广场API处理器

**Files:**
- Create: `backend/handler/square.go`

- [ ] **Step 1: 完整代码**

```go
package handler

import (
	"net/http"
	"strconv"

	"ai-short-video-backend/database"
	"ai-short-video-backend/middleware"

	"github.com/gin-gonic/gin"
)

// GetPublicVideos 获取公开视频列表
func GetPublicVideos(c *gin.Context) {
	page, err := strconv.Atoi(c.DefaultQuery("page", "1"))
	if err != nil || page < 1 {
		page = 1
	}

	pageSize, err := strconv.Atoi(c.DefaultQuery("pageSize", "12"))
	if err != nil || pageSize < 1 {
		pageSize = 12
	}

	sortBy := c.DefaultQuery("sortBy", "newest")

	videos, total, err := database.GetPublicVideos(page, pageSize, sortBy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "获取列表失败",
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code: 200,
		Data: gin.H{
			"videos": videos,
			"pagination": gin.H{
				"page":        page,
				"pageSize":    pageSize,
				"total":       total,
				"totalPages":  (total + pageSize - 1) / pageSize,
			},
		},
	})
}

// CollectSquareVideo 收藏广场视频到个人素材库
func CollectSquareVideo(c *gin.Context) {
	userId := middleware.GetUserId(c)
	videoIdStr := c.Param("id")
	videoId, err := strconv.Atoi(videoIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "视频ID错误",
		})
		return
	}

	// 检查视频是否公开
	allow, err := database.CheckVideoIsPublic(videoId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "检查失败",
		})
		return
	}
	if !allow {
		c.JSON(http.StatusForbidden, APIResponse{
			Code:    403,
			Message: "该视频不公开",
		})
		return
	}

	var req struct {
		CollectionID *int `json:"collectionId"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "参数错误",
		})
		return
	}

	// 添加到收藏夹
	if req.CollectionID != nil {
		err := database.AddVideoToCollection(userId, videoId, *req.CollectionID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, APIResponse{
				Code:    500,
				Message: "收藏失败",
			})
			return
		}
	}

	// 增加收藏计数
	_ = database.IncrementCollectCount(videoId)

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "收藏成功",
	})
}
```

- [ ] **Step 2: 编译验证**

```bash
cd backend && go build -o server
```
Expected: 编译成功

- [ ] **Step 3: Commit**

```bash
git add backend/handler/square.go
git commit -m "feat(square): add api handler for square"
```

---

### Task 4: 注册广场路由

**Files:**
- Modify: `backend/main.go`

- [ ] **Step 1: 添加路由**

Find where other auth routes are registered (after `/api` group and middleware.AuthMiddleware()), add:

```go
// Square routes
squareGroup := auth.Group("/square")
{
	squareGroup.GET("/videos", handler.GetPublicVideos)
	squareGroup.POST("/collect/:id", handler.CollectSquareVideo)
}
```

- [ ] **Step 2: 编译验证**

```bash
cd backend && go build -o server
```
Expected: 编译成功

- [ ] **Step 3: Commit**

```bash
git add backend/main.go
git commit -m "feat(square): register square routes"
```

---

### Task 5: 前端 - 新增RTK API定义

**Files:**
- Modify: `frontend/src/store/videoApi.ts`

- [ ] **Step 1: 添加API端点**

Add to the `videoApi` endpoints (inside the `createApi` builder callback):

```typescript
  // Square endpoints
  getPublicVideos: builder.query<{
    data: {
      videos: Array<{
        id: number
        title: string
        thumbnailUrl: string
        username: string
        tags: string | null
        collectCount: number
        createdAt: string
      }>
      pagination: {
        page: number
        pageSize: number
        total: number
        totalPages: number
      }
    }
  }, { page?: number; pageSize?: number; sortBy?: 'newest' | 'popular' }>({
    query: (params) => ({
      url: '/square/videos',
      method: 'GET',
      params,
    }),
  }),

  collectSquareVideo: builder.mutation<{ code: number; message: string }, { videoId: number; collectionId?: number }>({
    query: ({ videoId, collectionId }) => ({
      url: `/square/collect/${videoId}`,
      method: 'POST',
      body: { collectionId },
    }),
  }),
```

- [ ] **Step 2: TypeScript检查**

```bash
cd frontend && npx tsc --noEmit
```
Expected: 无类型错误

- [ ] **Step 3: Commit**

```bash
git add frontend/src/store/videoApi.ts
git commit -m "feat(square): add square api endpoints to rtk query"
```

---

### Task 6: 前端 - 创建SquarePage页面

**Files:**
- Create: `frontend/src/pages/SquarePage.tsx`
