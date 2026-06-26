# 工作流异步执行 + 进度展示

## Context

**问题**：当前工作流执行是同步阻塞模式——前端点击"开始执行"后，后端 `ExecuteStoryboard` 在一个 HTTP 请求里 for 循环跑完所有节点，每个 AI 节点（尤其视频生成）可能耗时几分钟。整个请求挂几分钟才返回，前端 `await` 一直 pending，页面只显示"执行中..."没有任何进度反馈，用户无法知道跑到哪了。

**目标**：把执行改成异步后台运行，前端通过轮询实时展示进度——顶部进度条 + 画布节点实时变色（running/done/error）。

**关键现状**：后端 `engine.Execute()` 的执行循环里**本来就在实时把每个节点的 state（running→done/error）和 result_json 写进数据库**。所以数据源已就绪，核心改动是"异步化执行 + 前端轮询读 DB 状态"。

## 已确认的方案选型

- **进度 UI**：画布实时反馈 + 顶部进度条（关闭执行弹窗回到画布，节点实时变色，顶部一条整体进度条）
- **实时性**：轮询（后端 goroutine 异步执行秒回 runID，前端 1.5s 轮询）
- **取消功能**：第一版不做

## 架构

### 后端：异步执行

```
POST /storyboards/:id/execute?force=true
  ├─ 防重入：查该 storyboard 是否有 status='running' 的 run → 有则 409 + 已有 runID
  ├─ createRun(...) → runID（status=running）
  ├─ go engine.Execute(runID, force)   // 后台异步，不阻塞
  └─ 立即返回 { runId, status: 'running' }   // 几十毫秒返回
```

`engine.Execute()` 改动最小：原本内部 `createRun`，改为**接收外部传入的 runID 参数**（让 handler 先建 run 再启 goroutine，保证返回 runID 时 run 已存在）。执行循环本身不变——仍在每个节点执行前后实时写 state 和 result_json，最后 updateRun 设终态。

### 后端：新增轮询接口

`GET /storyboards/:id/runs/:runId` —— 轮询专用，返回一个 run 的完整进度快照：

```json
{
  "run": { "id": 12, "status": "running", "startedAt": "...", "totalCredits": 0 },
  "nodes": [
    { "id": 3, "nodeType": "ai_text", "state": "done" },
    { "id": 5, "nodeType": "ai_video", "state": "running" },
    { "id": 7, "nodeType": "ai_image", "state": "idle" }
  ]
}
```

前端轮询这一个接口即可：算进度条（done+error / 总数）、把 state 同步回画布让节点变色、判断 run 是否结束。

### 后端：孤儿 run 兜底清理

没有取消功能，正常 run 都会走到终态。但 goroutine panic 或服务器重启可能留下 `status='running'` 的孤儿 run，会永久卡住前端轮询。在 `RunStoryboardRunMigrations` 里顺带做一个轻量兜底：

```sql
UPDATE storyboard_runs SET status='failed', finished_at=CURRENT_TIMESTAMP
WHERE status='running' AND started_at < datetime('now', '-30 minutes');
```

每次启动时执行一次。

### 前端：轮询编排（StoryboardEditorPage）

1. 用户在 ExecutePanel 点"开始执行" → 调 `execute` mutation → 后端秒回 `{ runId, status: 'running' }`
2. ExecutePanel 把 runId 通过回调抛给父页面，关闭弹窗
3. `StoryboardEditorPage` 拿到 runId，进入"执行中"状态：启动 `setInterval(1500ms)` 轮询 `GET /runs/:runId`
4. 每次轮询返回：
   - 用返回的 nodes state **合并进画布 nodes**（按 id 匹配，只更新 `state` 和 `result`，保留 position/config 等本地态）→ 节点自动变色
   - 计算 `done+error / 总数` → 更新顶部进度条
5. 当 `run.status` 变成 `completed / partial_error / failed`（非 running）→ 停止轮询，refetch 一次 storyboard 拿最终 result_json，弹完成 toast

### 前端：画布节点变色

现有节点组件已经按 `data.state` 显示状态（running→"生成中..."黄色动画、done→"✓ 完成"绿色、error→"✗ 失败"红色）。只要把轮询拿到的 state 写进 node.data.state，React Flow 自动重渲染。**节点组件本身不用改**。

### 前端：顶部进度条组件（新增 ExecutionProgressBar.tsx）

执行中在工具栏下方显示一条横条：

```
执行中 ████████░░░░  3/6 节点完成   当前: AI 视频生成中...
```

- 进度 = (done+error) / 可执行 AI 节点总数
- "当前"显示 state=running 的节点类型名
- 进度条用渐变色，error 节点数 > 0 时进度条尾部变红

### 防重入（前端侧）

执行中再次点"开始执行" → 按钮置灰；ExecutePanel 若检测到当前 storyboard 有 running run（通过轮询接口或 history），提示"已有执行进行中"。

### 与现有 onBeforeExecute 的关系

保留——执行前自动保存画布的逻辑不变，只是之后从"await 同步执行"变成"await 启动异步 run"。

## 接口清单

| 接口 | 改动 |
|---|---|
| `POST /storyboards/:id/execute` | 改异步：建 run → go Execute(runID, force) → 立即返回 `{ runId, status }` |
| `GET /storyboards/:id/runs/:runId` | **新增**：轮询，返回 run + 各节点 state 快照 |
| `GET /storyboards/:id/execute/history` | 不变 |

## 改动文件

**后端：**
- `backend/handler/storyboard_execute.go`：ExecuteStoryboard 异步化（建 run + go + 秒回）、新增 GetRunProgress handler
- `backend/service/workflow_engine.go`：Execute 接收 runID 参数（不再内部 createRun）
- `backend/database/migrations.go`：RunStoryboardRunMigrations 加孤儿 run 清理
- `backend/routes`（main.go 或 routes.go）：注册 `GET /runs/:runId`、`POST /execute` 路由调整

**前端：**
- `frontend/src/store/videoApi.ts`：execute mutation 返回类型改 `{ runId, status }`、新增 useGetRunProgressQuery（轮询用）
- `frontend/src/components/storyboard/ExecutePanel.tsx`：点执行后拿到 runId 抛给父页面（onStartRun 回调），不等结果
- `frontend/src/pages/StoryboardEditorPage.tsx`：轮询编排（setInterval/清理）、合并 state 到画布、执行中状态管理
- `frontend/src/components/storyboard/ExecutionProgressBar.tsx`：**新增**，顶部进度条组件

## 错误处理

- 后端防重入冲突（409）：前端 ExecutePanel 提示"已有执行进行中"，并可选项跳转到正在跑的 run
- goroutine 内 panic：recover 兜底，把 run 标记 failed，避免永久 running
- 轮询接口失败：前端容忍，继续轮询（不因单次网络抖动中断进度展示）
- 执行中浏览器刷新：重新进入 storyboard 时，若存在 running run，自动恢复轮询（接口可查当前 storyboard 的 running run）

## 验证

1. 新建画布，连 ai_text → ai_video，点执行 → 应秒回弹窗关闭，画布顶部出现进度条"0/2"
2. 观察：ai_text 节点先变黄（running）→ 变绿（done）；进度条推进到 1/2
3. ai_video 节点变黄（running，持续几分钟）→ 进度条停在 1/2，"当前: AI 视频生成中..."
4. ai_video 完成变绿 → 进度条 2/2 → 停止轮询 → 完成 toast
5. 执行中再次点"开始执行" → 提示"已有执行进行中"
6. 执行中刷新浏览器 → 重新进入应自动恢复进度轮询
7. 一个节点失败 → 该节点变红，进度条尾部变红，其余节点继续，run 终态 partial_error
