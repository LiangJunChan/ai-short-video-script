# V2.5 工作流画布实现计划

> 阶段二：节点数据流 + AI执行引擎

## 目标

在阶段一的画布基础上，新增 AI 处理节点（ai_text/ai_image/ai_split/tts），支持节点间数据流连接，一键执行工作流。

## Task 1: 后端 - 执行引擎服务

**Files:**
- Create: `backend/service/workflow_engine.go`

创建工作流执行引擎：
- 根据节点连线构建执行顺序（拓扑排序）
- 按顺序执行每个节点（调用对应的 AI 服务）
- 更新节点 state（idle→running→done/error）和 result_json
- 记录执行历史和积分消耗

## Task 2: 后端 - 执行 API

**Files:**
- Create: `backend/handler/storyboard_execute.go`
- Modify: `backend/main.go`

新增接口：
- `POST /api/storyboards/:id/execute` - 执行整个工作流
- `POST /api/storyboards/:id/nodes/:nodeId/execute` - 执行单个节点
- `GET /api/storyboards/:id/runs` - 获取执行历史

## Task 3: 前端 - 新节点类型组件

**Files:**
- Create: `frontend/src/components/storyboard/nodes/AITextNode.tsx`
- Create: `frontend/src/components/storyboard/nodes/AIImageNode.tsx`
- Create: `frontend/src/components/storyboard/nodes/AISplitNode.tsx`
- Create: `frontend/src/components/storyboard/nodes/TTSNode.tsx`

4种新节点的 React Flow 自定义节点组件，每种节点有不同的 UI 和配置面板。

## Task 4: 前端 - Canvas 注册新节点类型

**Files:**
- Modify: `frontend/src/components/storyboard/Canvas.tsx`

在 nodeTypes 中注册新的节点类型。

## Task 5: 前端 - 执行面板

**Files:**
- Create: `frontend/src/components/storyboard/ExecutePanel.tsx`
- Modify: `frontend/src/pages/StoryboardEditorPage.tsx`

执行面板组件 + 在工具栏添加"执行"按钮。

## Task 6: 前端 - 节点添加菜单

**Files:**
- Modify: `frontend/src/pages/StoryboardEditorPage.tsx`

双击画布时弹出节点类型选择菜单（scene/ai_text/ai_image/ai_split/tts）。
