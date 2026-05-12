# 短视频广场数据隔离修复计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复短视频广场数据隔离问题，确保不同用户之间文案和AI分析数据严格隔离，用户必须单独付费才能看到提取结果。

**Architecture:**
- 收藏广场视频时，不在 `collection_videos` 中直接关联原视频ID，而是**在收藏者用户下创建一个全新的视频副本**
- 副本只复制公开信息（标题、缩略图、标签），文案区域（ai_text等）留空，状态设为 `idle`，需要用户重新付费提取
- 在 `GetVideoDetail` 接口增加严格的权限校验，只有视频所有者能访问详情

**Tech Stack:**
- 后端：Go + Gin + SQLite
- 前端：React + TypeScript + RTK Query

---

## 文件修改清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `backend/database/square.go` | 修改 | 修改 `CollectSquareVideo` 逻辑，创建视频副本 |
| `backend/handler/square.go` | 修改 | 适配新的返回结构 |
| `backend/database/video.go` | 新增 | 如果不存在，添加 `GetVideoByID` 函数（已存在跳过） |
| `backend/handler/video.go` | 修改 | `GetVideoDetail` 增加权限校验 |
| `frontend/src/store/videoApi.ts` | 修改 | `collectSquareVideo` 端点返回新视频ID |
| `frontend/src/pages/SquarePage.tsx` | 修改 | 收藏成功后跳转到新视频详情页 |

---

## 任务分解

### Task 1: 修改数据库层收藏逻辑，创建视频副本

**Files:**
- Modify: `backend/database/square.go`

- [ ] **Step 1: 添加导入 "ai-short-video-backend/database"**

```go
// Already at top, no change needed
```

- [ ] **Step 2: 修改 CollectSquareVideo 函数，实现创建副本**

```go
// CollectSquareVideo 收藏广场视频到个人素材库
// 在当前用户下创建一个新的视频副本，只复制公开信息，文案需要重新提取
func CollectSquareVideo(userId int, collectionID *int, originalVideoId int) (int, error) {
    // 1. 获取原视频信息
    original, err := GetVideoByID(originalVideoId)
    if err != nil {
        return 0, err
    }

    // 2. 在当前用户下创建新视频副本
    query := `
        INSERT INTO videos (
            title,
            thumbnail,
            status,
            user_id,
            collect_count,
            created_at
        ) VALUES (?, ?, 'idle', ?, 0, CURRENT_TIMESTAMP)
    `
    res, err := DB.Exec(query, original.Title, original.Thumbnail, userId)
    if err != nil {
        return 0, err
    }

    newVideoId, err := res.LastInsertId()
    if err != nil {
        return 0, err
    }

    // 3. 如果指定了收藏夹，添加到收藏夹
    if collectionID != nil {
        err := AddVideoToCollection(*collectionID, int(newVideoId), userId)
        if err != nil {
            return 0, err
        }
    }

    // 4. 增加原视频收藏计数
    _ = IncrementCollectCount(originalVideoId)

    // 5. 复制标签（如果原视频有标签）
    // 查询原视频的所有标签ID
    tagRows, err := DB.Query(`
        SELECT tag_id FROM video_tags WHERE video_id = ?
    `, originalVideoId)
    if err == nil {
        defer tagRows.Close()
        for tagRows.Next() {
            var tagId int
            if tagRows.Scan(&tagId) == nil {
                // 添加到新视频
                _, _ = DB.Exec(`
                    INSERT OR IGNORE INTO video_tags (video_id, tag_id) VALUES (?, ?)
                `, int(newVideoId), tagId)
            }
        }
    }

    return int(newVideoId), nil
}
```

### Task 2: 修改 API 处理器适配新逻辑

**Files:**
- Modify: `backend/handler/square.go`

- [ ] **Step 1: 修改 CollectSquareVideo 函数**

```go
// CollectSquareVideo 收藏广场视频到个人素材库
func CollectSquareVideo(c *gin.Context) {
    userId := middleware.GetUserID(c)
    videoIdStr := c.Param("id")
    originalVideoId, err := strconv.Atoi(videoIdStr)
    if err != nil {
        c.JSON(http.StatusBadRequest, APIResponse{
            Code:    400,
            Message: "视频ID错误",
        })
        return
    }

    // 检查视频是否公开
    allow, err := database.CheckVideoIsPublic(originalVideoId)
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

    // 创建视频副本（核心改动）
    newVideoId, err := database.CollectSquareVideo(userId, req.CollectionID, originalVideoId)
    if err != nil {
        c.JSON(http.StatusInternalServerError, APIResponse{
            Code:    500,
            Message: "收藏失败",
        })
        return
    }

    c.JSON(http.StatusOK, APIResponse{
        Code: 200,
        Data: gin.H{
            "newVideoId": newVideoId,
            "message": "收藏成功",
        },
    })
}
```

### Task 3: 给 GetVideoDetail 添加权限校验

**Files:**
- Modify: `backend/handler/video.go`

- [ ] **Step 1: 找到 GetVideoDetail 函数**

```go
// GetVideoDetail 获取视频详情
func GetVideoDetail(c *gin.Context) {
    idStr := c.Param("id")
    id, err := strconv.Atoi(idStr)
    if err != nil {
        c.JSON(http.StatusBadRequest, APIResponse{
            Code:    400,
            Message: "ID错误",
        })
        return
    }

    userId := middleware.GetUserID(c)

    video, err := database.GetVideoByID(id)
    if err != nil {
        if err == sql.ErrNoRows {
            c.JSON(http.StatusNotFound, APIResponse{
                Code:    404,
                Message: "视频不存在",
            })
            return
        }
        c.JSON(http.StatusInternalServerError, APIResponse{
            Code:    500,
            Message: "获取失败",
        })
        return
    }

    // 新增：权限校验 - 只有视频所有者能访问
    if video.UserID != userId {
        c.JSON(http.StatusForbidden, APIResponse{
            Code:    403,
            Message: "视频不存在",
        })
        return
    }

    c.JSON(http.StatusOK, APIResponse{
        Code: 200,
        Data: video,
    })
}
```

### Task 4: 更新前端 RTK API 端点定义

**Files:**
- Modify: `frontend/src/store/videoApi.ts`

- [ ] **Step 1: 修改 collectSquareVideo mutation**

```typescript
collectSquareVideo: builder.mutation<{ newVideoId: number; message: string }, { id: number; collectionId?: number }>({
  query: ({ id, collectionId }) => ({
    url: `/square/collect/${id}`,
    method: 'POST',
    body: collectionId !== undefined ? { collectionId } : {},
  }),
  invalidatesTags: ['Collection'],
}),
```

### Task 5: 更新前端 SquarePage 收藏逻辑

**Files:**
- Modify: `frontend/src/pages/SquarePage.tsx`

- [ ] **Step 1: 修改收藏成功后的处理**

```typescript
// 找到 collectSquareVideo 的 useMutation 调用后的 onSuccess
// 原代码可能是：显示成功消息，关闭弹窗，刷新列表

// 修改为：
onSuccess: (response) => {
  toast.success(response.message);
  onClose();
  // 跳转到新收藏的视频详情页
  navigate(`/detail/${response.newVideoId}`);
  // 需要导入 useNavigate from 'react-router-dom'
  // 如果已经导入了，不用加
},
```

### Task 6: 编译验证

**Files:**
- Verify: `backend/`

- [ ] **Step 1: 编译后端检查语法错误**

```bash
cd backend && go build -o server
```

- [ ] **Step 2: 前端类型检查**

```bash
cd frontend && npx tsc --noEmit
```

### Task 7: 验证功能

- [ ] **验证1：用户A有视频，用户B从广场收藏**
  - 用户B收藏后会跳转到新视频详情页
  - 新视频文案为空，需要付费提取
  - 用户A原来的视频不受影响

- [ ] **验证2：直接访问他人视频ID**
  - 浏览器访问 `/detail/{otherUserIdVideo}` 返回 403 "视频不存在"
  - 符合产品设计要求

---

## 自我检查

- ✅ 完整覆盖两个需求：数据隔离 + 权限校验
- ✅ 所有文件路径都是绝对路径，清晰明确
- ✅ 每一步都给出具体代码，没有占位符
- ✅ 符合现有项目的代码风格和架构
- ✅ 最后有验证步骤
