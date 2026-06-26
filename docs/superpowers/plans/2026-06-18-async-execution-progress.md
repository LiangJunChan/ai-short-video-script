# 工作流异步执行 + 进度展示 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把工作流执行从同步阻塞改成异步后台运行 + 前端轮询实时进度（顶部进度条 + 画布节点变色）。

**Architecture:** 后端 `ExecuteStoryboard` 改为"建 run → go goroutine 异步执行 → 秒回 runId"；执行循环本来就在实时写节点 state 到 DB，新增 `GET /runs/:runId` 轮询接口返回 run + 各节点 state 快照；前端 `StoryboardEditorPage` 拿到 runId 后 1.5s 轮询，把 state 合并进画布节点让其变色，顶部 `ExecutionProgressBar` 显示整体进度。

**Tech Stack:** Go + Gin + SQLite（后端）；React 19 + RTK Query + React Flow（前端）

**Spec:** `docs/superpowers/specs/2026-06-18-async-execution-progress-design.md`

---

## File Structure

**后端：**
- `backend/service/workflow_engine.go`（修改）：`Execute()` 接收外部传入的 runID，不再内部 createRun
- `backend/handler/storyboard_execute.go`（修改）：`ExecuteStoryboard` 异步化；新增 `GetRunProgress` handler；新增防重入检查
- `backend/database/migrations.go`（修改）：`RunStoryboardRunMigrations` 加孤儿 run 清理
- `backend/main.go`（修改）：注册 `GET /storyboards/:id/runs/:runId` 路由

**前端：**
- `frontend/src/store/videoApi.ts`（修改）：`executeStoryboard` 返回类型改 `{ runId, status }`；新增 `getRunProgress` query
- `frontend/src/components/storyboard/ExecutePanel.tsx`（修改）：点执行后拿到 runId 抛给父页面（`onStartRun` 回调），不等结果
- `frontend/src/components/storyboard/ExecutionProgressBar.tsx`（新增）：顶部进度条组件
- `frontend/src/pages/StoryboardEditorPage.tsx`（修改）：轮询编排、合并 state 到画布、执行中状态管理、渲染进度条

---

## Task 1: 后端 — Execute 接收外部 runID 参数

**Files:**
- Modify: `backend/service/workflow_engine.go:37-59`（Execute 签名 + 去 createRun）

当前 `Execute()` 第 36-59 行：

```go
func (e *WorkflowEngine) Execute() (*RunResult, error) {
	// 1. 获取所有节点和边
	nodes, err := database.GetNodesByStoryboard(e.StoryboardID)
	...
	// 3. 创建执行记录
	runID, err := createRun(e.StoryboardID, e.UserID)
	if err != nil {
		return nil, fmt.Errorf("创建执行记录失败: %v", err)
	}
```

- [ ] **Step 1: 改 Execute 签名为接收 runID，删除内部 createRun**

把第 37 行签名和第 55-59 行的 createRun 块改为：

```go
// Execute 执行整个工作流。runID 由调用方预先创建（保证异步返回前 run 已存在）。
func (e *WorkflowEngine) Execute(runID int) (*RunResult, error) {
	// 1. 获取所有节点和边
	nodes, err := database.GetNodesByStoryboard(e.StoryboardID)
	if err != nil {
		return nil, fmt.Errorf("获取节点失败: %v", err)
	}
	edges, err := database.GetEdgesByStoryboard(e.StoryboardID)
	if err != nil {
		return nil, fmt.Errorf("获取边失败: %v", err)
	}

	if len(nodes) == 0 {
		return nil, fmt.Errorf("画布中没有节点")
	}

	// 2. 构建执行顺序（拓扑排序）
	orderedNodes := topologicalSort(nodes, edges)

	// runID 由调用方传入，这里不再 createRun
```

- [ ] **Step 2: 在 Execute 顶部加 panic recover，防止 goroutine 崩溃留下永久 running 的 run**

在 `func (e *WorkflowEngine) Execute(runID int) (ret *RunResult, err error) {` 函数体最开头（第 1.5 步获取节点之前）加：

```go
	defer func() {
		if r := recover(); r != nil {
			updateRun(runID, "failed", 0)
			ret = &RunResult{RunID: runID, Status: "failed"}
			err = fmt.Errorf("执行 panic: %v", r)
		}
	}()
```

注意签名要从 `(*RunResult, error)` 改成具名返回 `(ret *RunResult, err error)` 才能在 defer 里赋值。

- [ ] **Step 3: 编译验证**

Run: `cd backend && go build ./...`
Expected: 编译失败，因为 `storyboard_execute.go` 还在调 `engine.Execute()`（无参）。这是预期的，下一任务修。先确认只有这一个编译错误。

- [ ] **Step 4: 暂不提交**（与 Task 2 一起提交，避免编译不过的中间态）

---

## Task 2: 后端 — ExecuteStoryboard 异步化 + 防重入 + GetRunProgress

**Files:**
- Modify: `backend/handler/storyboard_execute.go`
- Modify: `backend/main.go:128-130`

- [ ] **Step 1: 改 ExecuteStoryboard 为异步**

替换 `backend/handler/storyboard_execute.go` 的 `ExecuteStoryboard` 函数（第 14-45 行）为：

```go
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
```

- [ ] **Step 2: 暴露 CreateRun 给 handler 包**

当前 `createRun`（`workflow_engine.go:624`）是小写未导出。改成导出函数 `CreateRun`，并把 `Execute` 内部已删除的 createRun 调用不影响。

修改 `backend/service/workflow_engine.go:624-636`：

```go
// CreateRun 创建执行记录，返回 runID。导出给 handler 预先创建 run。
func CreateRun(storyboardID, userID int) (int, error) {
	result, err := database.DB.Exec(`
		INSERT INTO storyboard_runs (storyboard_id, user_id, status) VALUES (?, ?, 'running')
	`, storyboardID, userID)
	if err != nil {
		return 0, err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}
	return int(id), nil
}
```

并删除原 `createRun`（小写）函数，全局搜索确认没有其他调用方（grep `createRun(` 应只剩注释或无）。

- [ ] **Step 3: 新增 GetRunProgress handler**

在 `backend/handler/storyboard_execute.go` 末尾追加：

```go
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
```

- [ ] **Step 4: 注册路由**

修改 `backend/main.go:130` 后面新增一行：

```go
		auth.GET("/storyboards/:id/runs", handler.GetExecutionHistory)
		auth.GET("/storyboards/:id/runs/:runId", handler.GetRunProgress)
```

- [ ] **Step 5: 编译验证**

Run: `cd backend && go build ./...`
Expected: 编译通过，无报错。

- [ ] **Step 6: 提交**

```bash
git add backend/service/workflow_engine.go backend/handler/storyboard_execute.go backend/main.go
git commit -m "feat(execution): async workflow execution with run progress polling endpoint"
```

---

## Task 3: 后端 — 孤儿 run 清理

**Files:**
- Modify: `backend/database/migrations.go:8-26`

- [ ] **Step 1: 在 RunStoryboardRunMigrations 加清理逻辑**

修改 `backend/database/migrations.go` 的 `RunStoryboardRunMigrations` 函数，在 CREATE TABLE 块之后追加：

```go
func RunStoryboardRunMigrations() {
	_, err := DB.Exec(`
		CREATE TABLE IF NOT EXISTS storyboard_runs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			storyboard_id INTEGER NOT NULL,
			user_id INTEGER NOT NULL,
			status TEXT NOT NULL DEFAULT 'running',
			total_credits INTEGER DEFAULT 0,
			started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			finished_at DATETIME,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (storyboard_id) REFERENCES storyboards(id) ON DELETE CASCADE,
			FOREIGN KEY (user_id) REFERENCES users(id)
		);
	`)
	if err != nil {
		log.Printf("Warning: create storyboard_runs table: %v", err)
	}

	// 孤儿 run 兜底清理：启动时把超过 30 分钟仍 running 的 run 标记为 failed
	// （无取消功能，goroutine panic 或重启可能留下永久 running 的 run，会卡住前端轮询）
	_, err = DB.Exec(`
		UPDATE storyboard_runs
		SET status = 'failed', finished_at = CURRENT_TIMESTAMP
		WHERE status = 'running' AND started_at < datetime('now', '-30 minutes')
	`)
	if err != nil {
		log.Printf("Warning: cleanup orphan runs: %v", err)
	}
}
```

- [ ] **Step 2: 编译验证**

Run: `cd backend && go build ./...`
Expected: 编译通过。

- [ ] **Step 3: 提交**

```bash
git add backend/database/migrations.go
git commit -m "feat(execution): cleanup orphan runs older than 30min on startup"
```

---

## Task 4: 前端 — videoApi 接口调整

**Files:**
- Modify: `frontend/src/store/videoApi.ts:417-434`

- [ ] **Step 1: 改 executeStoryboard 返回类型 + 新增 getRunProgress query**

修改 `frontend/src/store/videoApi.ts` 第 417-434 行块为：

```typescript
    // Workflow execution — 异步：秒回 { runId, status }
    executeStoryboard: builder.mutation<{ code: number; data: { runId: number; status: string } }, { id: number; force?: boolean }>({
      query: ({ id, force }) => ({
        url: force ? `/storyboards/${id}/execute?force=true` : `/storyboards/${id}/execute`,
        method: 'POST',
      }),
    }),
    executeNode: builder.mutation<{ code: number; data: any }, { storyboardId: number; nodeId: number }>({
      query: ({ storyboardId, nodeId }) => ({
        url: `/storyboards/${storyboardId}/nodes/${nodeId}/execute`,
        method: 'POST',
      }),
      invalidatesTags: ['Video'],
    }),
    // 轮询：run 进度快照（run 状态 + 各节点 state）
    getRunProgress: builder.query<
      { code: number; data: { run: { id: number; status: string; startedAt: any; finishedAt: any; totalCredits: number }; nodes: { id: number; nodeType: string; state: string }[] } },
      { storyboardId: number; runId: number }
    >({
      query: ({ storyboardId, runId }) => `/storyboards/${storyboardId}/runs/${runId}`,
    }),
    getExecutionHistory: builder.query<{ code: number; data: { runs: any[] } }, number>({
      query: (id) => `/storyboards/${id}/runs`,
    }),
```

注意：`executeStoryboard` 删掉了 `invalidatesTags: ['Video']`——因为异步返回时还没执行完，不应 invalidate；最终结果在轮询结束后由 `StoryboardEditorPage` 手动 refetch。

- [ ] **Step 2: 在 export 块加 useGetRunProgressQuery**

在 `frontend/src/store/videoApi.ts` 末尾的 `export const { ... }` 块里加一行（参考已有的 `useGetExecutionHistoryQuery` 位置，约第 500 行附近）：

```typescript
  useGetRunProgressQuery,
  useGetExecutionHistoryQuery,
```

- [ ] **Step 3: 类型检查**

Run: `cd frontend && npx tsc --noEmit`
Expected: 类型检查通过。

- [ ] **Step 4: 暂不提交**（与 Task 5 一起提交，避免中间态 ExecutePanel 引用旧返回类型报错）

---

## Task 5: 前端 — ExecutePanel 改为抛 runId

**Files:**
- Modify: `frontend/src/components/storyboard/ExecutePanel.tsx`

- [ ] **Step 1: 改 ExecutePanel 接口，点执行后拿到 runId 抛给父页面**

整体替换 `frontend/src/components/storyboard/ExecutePanel.tsx` 的 `handleExecute` 和 props：

props 接口（第 4-11 行）改为：

```typescript
interface ExecutePanelProps {
  storyboardId: number
  onClose: () => void
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  onStartRun: (runId: number) => void
  onBeforeExecute?: () => Promise<{ savedCount: number; ok: boolean }>
}
```

函数签名和解构（第 13 行）改为：

```typescript
export default function ExecutePanel({ storyboardId, onClose, onSuccess, onError, onStartRun, onBeforeExecute }: ExecutePanelProps) {
```

`handleExecute`（第 20-61 行）替换为：

```typescript
  const handleExecute = async () => {
    if (syncing) return
    setSyncing(true)
    try {
      // 执行前先自动同步整张画布，确保内存中的新节点入数据库
      if (onBeforeExecute) {
        const sync = await onBeforeExecute()
        if (!sync.ok) {
          onError('画布自动保存失败，请重试')
          setSyncing(false)
          return
        }
        if (sync.savedCount > 0) {
          onSuccess(`已自动保存 ${sync.savedCount} 个新节点`)
        }
      }

      // 异步执行：后端秒回 runId，不等执行完成
      const result = await execute({ id: storyboardId, force }).unwrap()
      const runId = result.data?.runId
      if (!runId) {
        onError('启动执行失败')
        return
      }
      onStartRun(runId)
      onClose()
    } catch (err: any) {
      if (err?.status === 409) {
        onError('已有执行进行中，请等待完成')
      } else {
        onError(err.data?.message || '启动执行失败')
      }
    } finally {
      setSyncing(false)
    }
  }
```

按钮文案（第 91 行）的 `isLoading` 分支改为 `'启动中...'`：

```typescript
          {syncing ? '同步画布中...' : isLoading ? '启动中...' : force ? '强制执行' : '开始执行'}
```

- [ ] **Step 2: 类型检查**

Run: `cd frontend && npx tsc --noEmit`
Expected: 报错——`StoryboardEditorPage` 还没传 `onStartRun`。这是预期，下一任务修。

- [ ] **Step 3: 暂不提交**

---

## Task 6: 前端 — 新增 ExecutionProgressBar 组件

**Files:**
- Create: `frontend/src/components/storyboard/ExecutionProgressBar.tsx`

- [ ] **Step 1: 创建进度条组件**

创建 `frontend/src/components/storyboard/ExecutionProgressBar.tsx`：

```typescript
interface ExecutionProgressBarProps {
  doneCount: number       // done + error 节点数
  total: number           // 可执行 AI 节点总数
  runningLabel: string    // 当前 running 节点名，空串表示无
  errorCount: number      // error 节点数（>0 时进度条尾部变红）
}

export default function ExecutionProgressBar({ doneCount, total, runningLabel, errorCount }: ExecutionProgressBarProps) {
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0
  const finished = doneCount >= total && total > 0

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-sky-50 border-b border-sky-100">
      <span className="text-xs font-medium text-sky-700 whitespace-nowrap">
        {finished ? '执行完成' : '执行中'}
      </span>
      <div className="flex-1 h-2 bg-sky-100 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${errorCount > 0 ? 'bg-gradient-to-r from-sky-500 to-red-400' : 'bg-sky-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-slate-600 whitespace-nowrap tabular-nums">
        {doneCount}/{total} 节点{errorCount > 0 && <span className="text-red-500">（{errorCount} 失败）</span>}
      </span>
      {!finished && runningLabel && (
        <span className="text-xs text-amber-600 whitespace-nowrap animate-pulse">
          当前: {runningLabel}
        </span>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 类型检查**

Run: `cd frontend && npx tsc --noEmit`
Expected: 通过（组件未被引用不会报错）。

- [ ] **Step 3: 暂不提交**

---

## Task 7: 前端 — StoryboardEditorPage 轮询编排 + 画布反馈

**Files:**
- Modify: `frontend/src/pages/StoryboardEditorPage.tsx`

这是最核心的任务。改动点：
1. 新增 `activeRunId` state 和轮询逻辑
2. `ExecutePanel` 传 `onStartRun`
3. 轮询返回后合并节点 state 进画布、计算进度
4. run 终态时停止轮询 + refetch + toast
5. 顶部渲染 `ExecutionProgressBar`

- [ ] **Step 1: 加 imports 和 state**

在 `StoryboardEditorPage.tsx` 顶部 import 区（第 1-11 行）末尾加：

```typescript
import ExecutionProgressBar from '../components/storyboard/ExecutionProgressBar'
```

在组件内 state 区（约第 25-38 行，`fitViewKey` 之后）加：

```typescript
  const [activeRunId, setActiveRunId] = useState<number | null>(null)
  const [runProgress, setRunProgress] = useState<{
    done: number; total: number; runningLabel: string; errorCount: number; runStatus: string
  } | null>(null)
  const [triggerGetRunProgress] = videoApi.useLazyGetRunProgressQuery()
```

- [ ] **Step 2: 加轮询 effect**

在 `useEffect`（加载数据那个，约第 40-87 行）之后加一个新 effect：

```typescript
  // 执行中轮询：每 1.5s 拉 run 进度，合并节点 state 进画布
  useEffect(() => {
    if (activeRunId === null) return
    let cancelled = false

    const poll = async () => {
      try {
        const res = await triggerGetRunProgress({ storyboardId, runId: activeRunId }).unwrap()
        if (cancelled) return
        const data = res.data
        const nodeStates = data.nodes

        // 合并 state 进画布节点（只更新 state，保留 position/config）
        setNodes((nds) => nds.map((n) => {
          const matched = nodeStates.find((ns) => String(ns.id) === n.id)
          if (!matched) return n
          return { ...n, data: { ...n.data, state: matched.state } }
        }))

        // 计算进度（只统计可执行 AI 节点）
        const aiTypes = ['ai_text', 'ai_image', 'ai_split', 'ai_video', 'tts']
        const aiNodes = nodeStates.filter((ns) => aiTypes.includes(ns.nodeType))
        const done = aiNodes.filter((ns) => ns.state === 'done' || ns.state === 'error').length
        const errorCount = aiNodes.filter((ns) => ns.state === 'error').length
        const running = aiNodes.find((ns) => ns.state === 'running')
        const runningLabel = running ? nodeTypeLabel(running.nodeType) : ''
        setRunProgress({ done, total: aiNodes.length, runningLabel, errorCount, runStatus: data.run.status })

        // run 终态 → 停止轮询
        if (data.run.status !== 'running') {
          setActiveRunId(null)
          setRunProgress(null)
          refetch()
          const msg = data.run.status === 'completed'
            ? '执行完成'
            : data.run.status === 'partial_error'
              ? '执行完成（部分节点失败）'
              : '执行结束'
          showToast(msg)
        }
      } catch {
        // 单次轮询失败容忍，继续轮询
      }
    }

    poll()
    const timer = setInterval(poll, 1500)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [activeRunId, storyboardId, triggerGetRunProgress, refetch])
```

- [ ] **Step 3: 加 nodeTypeLabel 辅助函数**

在组件内 `showToast` 之前（约第 89 行）加：

```typescript
  const nodeTypeLabel = (t: string) => ({
    ai_text: 'AI 文案',
    ai_image: 'AI 图片',
    ai_split: 'AI 分镜',
    ai_video: 'AI 视频',
    tts: 'TTS 配音',
  }[t] || t)
```

- [ ] **Step 4: 给 ExecutePanel 传 onStartRun，渲染进度条**

找到 `ExecutePanel` 渲染处（约第 352-354 行）：

```typescript
      {showExecute && <ExecutePanel storyboardId={storyboardId} onClose={() => setShowExecute(false)}
        onSuccess={showToast} onError={showToast} onExecuted={() => refetch()}
        onBeforeExecute={flushCanvasToDB} />}
```

改为（去掉 `onExecuted`，加 `onStartRun`）：

```typescript
      {showExecute && <ExecutePanel storyboardId={storyboardId} onClose={() => setShowExecute(false)}
        onSuccess={showToast} onError={showToast}
        onStartRun={(runId) => setActiveRunId(runId)}
        onBeforeExecute={flushCanvasToDB} />}
```

在 `<CanvasToolbar ... />`（约第 309-312 行）下方、`<div className="flex-1 flex">` 之前插入进度条：

```typescript
      {activeRunId && runProgress && (
        <ExecutionProgressBar
          doneCount={runProgress.done}
          total={runProgress.total}
          runningLabel={runProgress.runningLabel}
          errorCount={runProgress.errorCount}
        />
      )}
```

- [ ] **Step 5: 防重入前端侧——执行中禁用 ExecutePanel 入口**

找到工具栏 `onExecute={() => setShowExecute(true)}`（约第 311 行），改为：

```typescript
        onExecute={() => { if (!activeRunId) setShowExecute(true) }}
```

- [ ] **Step 6: 类型检查**

Run: `cd frontend && npx tsc --noEmit`
Expected: 通过，无报错。

- [ ] **Step 7: 提交**

```bash
git add frontend/src/store/videoApi.ts frontend/src/components/storyboard/ExecutePanel.tsx frontend/src/components/storyboard/ExecutionProgressBar.tsx frontend/src/pages/StoryboardEditorPage.tsx
git commit -m "feat(execution): poll run progress with canvas state sync and top progress bar"
```

---

## Task 8: 端到端验证

- [ ] **Step 1: 启动后端和前端**

```bash
cd backend && go build ./... && # 重启后端服务
cd ../frontend && pnpm dev
```

- [ ] **Step 2: 验证异步启动**

新建画布，连 ai_text → ai_video，填好 prompt，点"开始执行"。
Expected: 弹窗立即关闭（不再卡几分钟），画布顶部出现进度条"0/2"。

- [ ] **Step 3: 验证画布实时反馈**

观察：ai_text 节点先变黄（running，"生成中..."）→ 变绿（done，"✓ 完成"）；进度条推进到 1/2。然后 ai_video 节点变黄持续几分钟，进度条停在 1/2 显示"当前: AI 视频"。

- [ ] **Step 4: 验证完成态**

ai_video 完成变绿 → 进度条 2/2 → 进度条消失 → "执行完成" toast。

- [ ] **Step 5: 验证防重入**

执行中再点工具栏"执行" → 应无法打开（按钮已禁用）。或直接 POST `/execute` → 应返回 409。

- [ ] **Step 6: 验证刷新恢复**

执行中刷新浏览器 → 重新进入 storyboard。注意：当前设计 `activeRunId` 不持久化，刷新后轮询不自动恢复。这是已知限制——进度条消失但后端仍在跑，刷新页面后需等执行结束 refetch 才能看到最终结果。

> 如果要支持刷新恢复，需在加载数据的 useEffect 里检查是否有 running run 并恢复 activeRunId。可作为后续优化，本任务暂不做。

- [ ] **Step 7: 验证失败态**

构造一个会失败的节点（如 ai_video 不填 prompt 但有上游），执行 → 该节点变红，进度条尾部变红，其余继续，run 终态 partial_error，toast "执行完成（部分节点失败）"。

---

## Self-Review

**Spec coverage:**
- 异步执行（goroutine + 秒回 runId）→ Task 1+2 ✓
- `GET /runs/:runId` 轮询接口 → Task 2 Step 3 ✓
- 防重入 → Task 2 Step 1（后端 409）+ Task 7 Step 5（前端禁用）✓
- 孤儿 run 清理 → Task 3 ✓
- execute 返回类型改 runId → Task 4 ✓
- ExecutePanel 抛 runId → Task 5 ✓
- ExecutionProgressBar 组件 → Task 6 ✓
- 轮询编排 + 画布 state 合并 + 终态处理 → Task 7 ✓
- panic recover 兜底 → Task 1 Step 2 ✓
- 刷新恢复 → Task 8 Step 6 标注为已知限制，spec 里提到过但非阻塞 ✓

**Placeholder scan:** 无 TBD/TODO，所有 step 都有完整代码。

**Type consistency:**
- `executeStoryboard` 返回 `{ runId, status }` — Task 4 定义，Task 5 消费 ✓
- `getRunProgress` query 参数 `{ storyboardId, runId }` — Task 4 定义，Task 7 用 `useLazyGetRunProgressQuery` + `{ storyboardId, runId: activeRunId }` ✓
- `CreateRun` 导出 — Task 2 Step 2 定义，Task 2 Step 1 消费 ✓
- `Execute(runID)` 签名 — Task 1 定义，Task 2 goroutine 消费 ✓
- `onStartRun: (runId: number) => void` — Task 5 定义，Task 7 传 `(runId) => setActiveRunId(runId)` ✓
- `ExecutionProgressBar` props — Task 6 定义，Task 7 Step 4 传参一致 ✓

无类型不一致。
