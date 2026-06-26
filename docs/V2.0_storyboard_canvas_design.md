# 脚本画布 - 产品设计与演进规划

> 终局目标：从分镜脚本工具 → 视频创作工作流引擎 → 全链路自动化视频生产平台

## 一、终局愿景

画布不仅是"分镜编辑器"，而是一个**视频创作工作流引擎**。用户可以在画布上编排整个视频生产流程，从选题到成片，AI Agent 全自动完成。

### 全链路自动化流程

```
[选题输入] ──→ [LLM生成文案] ──→ [AI拆分分镜] ──→ [AI生成关键帧图片]
                                                          │
                                                          ▼
[发布平台] ←── [视频合成] ←── [TTS配音] ←── [AI生成视频片段]
```

### 终局画布支持的节点类型

```
输入节点          处理节点            输出节点
─────────        ──────────        ─────────
文本输入          LLM文案生成        视频导出
图片上传          AI图片生成         音频导出
视频素材          AI视频生成         文案导出
URL链接           语音合成(TTS)      发布到平台
                  视频拼接/转场
                  音频混合
                  条件分支
                  AI Agent
```

### 与 LibTV 的定位差异

| 维度 | LibTV | 我们 |
|------|-------|------|
| 定位 | 全栈AI视频创作平台 | 短视频文案拆解 → 脚本 → 视频生成 |
| 优势 | 30+模型集成、GPU集群、专业影视级 | 文案分析强、编导工作流理解深、轻量部署 |
| 画布用途 | 视频生成工作流编排 | 分镜脚本编辑 + AI工作流编排 |
| 技术栈 | 微服务+GPU集群+边缘计算 | 单体Go服务+SQLite+LLM API |

---

## 二、三阶段演进规划

### 阶段一：分镜脚本画布（V2.0，4.5周）

**目标**：能用画布编辑分镜脚本，导出可用的脚本文档

**节点类型**：scene / start / end

**核心能力**：
- 画布创建、节点拖拽、连线
- 节点编辑（文案/画面描述/时长/关键帧/景别/运镜）
- 从视频一键创建画布
- AI 智能拆分分镜
- 模板系统（5种预设 + 自定义）
- 导出（Markdown/PDF/纯文案）

### 阶段二：工作流画布（V2.5，6周）

**目标**：画布支持节点间数据流，可以编排 AI 处理流程

**新增节点类型**：ai_text / ai_image / ai_split / tts

**新增能力**：
- 节点间数据流（output → input 端口连接）
- 节点执行状态（idle/running/done/error）
- 工作流一键执行（按拓扑序执行所有节点）
- 执行历史 + 积分消耗统计
- 版本快照（保存/回滚）

### 阶段三：视频生成工作台（V3.0，8周）

**目标**：全链路自动化，从选题到成片

**新增节点类型**：ai_video / video_merge / audio_mix / condition / agent

**新增能力**：
- AI视频生成节点（图片+描述 → 视频片段）
- 视频拼接/转场
- 音频混合（配音+BGM+音效）
- 资产库（管理所有生成素材）
- 角色一致性（跨镜头保持角色外观）
- 批量生产模式
- Agent 自动驾驶模式

**总预估**：4.5 + 6 + 8 = 约 18.5 周（4.5 个月）

---

## 三、数据库设计（全阶段）

> 一次建好表结构，分阶段填充数据，避免后续推倒重来。

### 3.1 画布主表

```sql
CREATE TABLE storyboards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    video_id INTEGER,               -- 关联视频（可为空，独立画布）
    name TEXT NOT NULL,              -- 画布名称
    status TEXT DEFAULT 'draft',     -- draft/running/completed（阶段二启用）
    viewport_json TEXT,              -- 视口位置 {"x":0,"y":0,"zoom":1}
    version INTEGER DEFAULT 1,       -- 版本号（阶段二启用）
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 3.2 节点表

```sql
CREATE TABLE storyboard_nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    storyboard_id INTEGER NOT NULL,
    node_type TEXT NOT NULL,         -- 节点类型（见下方枚举）
    position_x REAL NOT NULL,
    position_y REAL NOT NULL,
    width REAL DEFAULT 300,
    height REAL DEFAULT 200,
    config_json TEXT,                -- 节点配置（不同type结构不同）
    state TEXT DEFAULT 'idle',       -- idle/running/done/error（阶段二启用）
    result_json TEXT,                -- 执行结果（阶段二启用）
    order_index INTEGER,             -- 节点排序
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 3.3 连线表

```sql
CREATE TABLE storyboard_edges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    storyboard_id INTEGER NOT NULL,
    source_node_id INTEGER NOT NULL,
    target_node_id INTEGER NOT NULL,
    source_handle TEXT,              -- 输出端口名（阶段二："text"/"image"/"video"/"audio"）
    target_handle TEXT,              -- 输入端口名（阶段二）
    label TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 3.4 模板表

```sql
CREATE TABLE storyboard_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,                 -- NULL = 系统预设
    name TEXT NOT NULL,
    category TEXT,                   -- 口播/剧情/带货/Vlog/测评
    description TEXT,
    thumbnail TEXT,
    nodes_json TEXT NOT NULL,
    edges_json TEXT NOT NULL,
    is_system INTEGER DEFAULT 0,
    use_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 3.5 版本历史表（阶段二启用）

```sql
CREATE TABLE storyboard_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    storyboard_id INTEGER NOT NULL,
    version INTEGER NOT NULL,
    snapshot_json TEXT NOT NULL,     -- 完整画布快照（节点+连线）
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 3.6 执行记录表（阶段二启用）

```sql
CREATE TABLE storyboard_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    storyboard_id INTEGER NOT NULL,
    status TEXT DEFAULT 'running',   -- running/completed/failed
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    finished_at DATETIME,
    total_credits INTEGER DEFAULT 0,
    error_message TEXT
);
```

### 3.7 资产表（阶段三启用）

```sql
CREATE TABLE assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    asset_type TEXT NOT NULL,        -- image/video/audio
    file_path TEXT NOT NULL,
    source_node_id INTEGER,          -- 来源节点
    metadata_json TEXT,              -- {"width":1080,"height":1920,"duration":5,...}
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 四、节点类型系统

### 4.1 节点类型枚举

| 阶段 | node_type | 名称 | 输入 | 输出 | 说明 |
|------|-----------|------|------|------|------|
| 一 | `start` | 流程起点 | - | text | 画布起始节点 |
| 一 | `end` | 流程终点 | text | - | 画布结束节点 |
| 一 | `scene` | 分镜节点 | - | text | 核心：文案+画面+时长+关键帧 |
| 二 | `ai_text` | LLM文案生成 | text | text | 输入选题/提示词，输出文案 |
| 二 | `ai_image` | AI图片生成 | text | image | 输入描述，输出图片 |
| 二 | `ai_split` | AI分镜拆分 | text | text[] | 输入长文案，输出多个分镜 |
| 二 | `tts` | 语音合成 | text | audio | 输入文案，输出语音 |
| 三 | `ai_video` | AI视频生成 | image+text | video | 输入图片+描述，输出视频 |
| 三 | `video_merge` | 视频拼接 | video[] | video | 合并多个视频片段 |
| 三 | `audio_mix` | 音频混合 | audio[] | audio | 混合配音+BGM+音效 |
| 三 | `condition` | 条件分支 | text | text×2 | 根据条件走不同路径 |
| 三 | `agent` | AI Agent | text | any | 自动规划执行子任务 |

### 4.2 节点 config_json 结构

**scene 节点（阶段一）**：
```json
{
  "script": "大家好，今天分享三个技巧",
  "description": "口播开场，面对镜头微笑",
  "duration": "0-5s",
  "imageUrl": "/thumbnails/xxx.jpg",
  "shot_type": "medium",
  "camera_move": "static",
  "notes": "语速放慢，要有亲切感",
  "tags": ["开场", "口播"]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| script | string | 该分镜的文案内容 |
| description | string | 画面描述（拍什么、怎么拍） |
| duration | string | 建议时长（如 "0-5s"） |
| imageUrl | string | 关键帧图片路径 |
| shot_type | string | 景别：close(近景) / medium(中景) / long(远景) / extreme_close(特写) |
| camera_move | string | 运镜：static(固定) / push(推) / pull(拉) / pan(摇) / track(跟) |
| notes | string | 备注 |
| tags | string[] | 标签 |

**ai_text 节点（阶段二）**：
```json
{
  "prompt": "写一个关于{topic}的短视频口播文案，风格亲切",
  "model": "minimax",
  "style": "亲切",
  "word_count": 200,
  "input_variables": ["topic"]
}
```

**ai_image 节点（阶段二）**：
```json
{
  "prompt": "一个女孩在咖啡厅微笑，暖色调",
  "model": "flux",
  "style": "写实",
  "aspect_ratio": "9:16",
  "reference_image_url": null
}
```

**ai_video 节点（阶段三）**：
```json
{
  "prompt": "镜头缓慢推进，女孩拿起咖啡杯",
  "model": "kling",
  "duration": 5,
  "reference_image": "{{input}}",
  "motion_strength": 0.7
}
```

**tts 节点（阶段二）**：
```json
{
  "voice": "female_warm",
  "speed": 1.0,
  "emotion": "neutral",
  "input_text": "{{input}}"
}
```

**start 节点（阶段一）**：
```json
{
  "label": "开始",
  "output_type": "text"
}
```

**end 节点（阶段一）**：
```json
{
  "label": "结束",
  "input_type": "text"
}
```

**ai_split 节点（阶段二）**：
```json
{
  "prompt": "将以下文案拆分为短视频分镜",
  "model": "minimax",
  "split_count": 6,
  "structure": "hook-content-ending",
  "input_text": "{{input}}"
}
```

**video_merge 节点（阶段三）**：
```json
{
  "transition": "fade",        // none/fade/dissolve/slide/wipe
  "transition_duration": 0.5,  // 转场时长（秒）
  "output_resolution": "1080x1920",
  "output_fps": 30,
  "bgm_url": null,             // 背景音乐URL（可选）
  "bgm_volume": 0.3            // BGM音量 0-1
}
```

**audio_mix 节点（阶段三）**：
```json
{
  "tracks": [
    {"type": "voiceover", "volume": 1.0},    // 配音轨
    {"type": "bgm", "volume": 0.3, "fade_in": 2, "fade_out": 3},  // BGM轨
    {"type": "sfx", "volume": 0.5}           // 音效轨
  ],
  "output_format": "mp3",
  "normalize": true
}
```

**condition 节点（阶段三）**：
```json
{
  "condition_type": "contains",   // contains/regex/length/custom
  "condition_value": "购买",
  "true_label": "含购买意向",
  "false_label": "不含购买意向"
}
```

**agent 节点（阶段三）**：
```json
{
  "agent_type": "auto",          // auto/custom
  "goal": "生成一个完整的带货短视频脚本",
  "constraints": {
    "max_scenes": 6,
    "style": "亲切",
    "duration": "30-60s"
  },
  "model": "doubao-1.5-pro",
  "max_steps": 10
}
```

### 4.3 节点端口定义（完整）

每种节点的输入/输出端口详细定义：

| 节点类型 | 输入端口 | 输出端口 | 执行方式 |
|---------|---------|---------|---------|
| `start` | 无 | `output: text` | 无（静态节点） |
| `end` | `input: text` | 无 | 无（静态节点） |
| `scene` | 无 | `output: text` | 无（手动编辑） |
| `ai_text` | `input: text` | `output: text` | LLM API 调用 |
| `ai_image` | `input: text` | `output: image` | 图片生成 API |
| `ai_split` | `input: text` | `output: text[]` | LLM API 调用 |
| `tts` | `input: text` | `output: audio` | TTS API 调用 |
| `ai_video` | `image: image`, `prompt: text` | `output: video` | 视频生成 API |
| `video_merge` | `clips: video[]` | `output: video` | FFmpeg 处理 |
| `audio_mix` | `tracks: audio[]` | `output: audio` | FFmpeg 处理 |
| `condition` | `input: text` | `true: text`, `false: text` | 条件判断 |
| `agent` | `input: text` | `output: any` | Agent 执行 |

### 4.4 节点 result_json 结构（完整）

每个节点执行后的输出格式：

**scene 节点**（阶段一，手动编辑，无自动执行）：
```json
{
  "script": "大家好，今天分享三个技巧",
  "word_count": 12
}
```

**ai_text 节点**（阶段二）：
```json
{
  "text": "大家好，今天给大家分享三个超实用的拍摄技巧...",
  "word_count": 200,
  "model_used": "MiniMax-M2",
  "credits_used": 5
}
```

**ai_image 节点**（阶段二）：
```json
{
  "image_url": "/generated/img_abc123.png",
  "width": 1080,
  "height": 1920,
  "model_used": "flux",
  "credits_used": 8
}
```

**ai_split 节点**（阶段二）：
```json
{
  "scenes": [
    {"script": "片段1文案", "description": "画面描述1", "duration": "0-5s"},
    {"script": "片段2文案", "description": "画面描述2", "duration": "5-12s"}
  ],
  "scene_count": 6,
  "credits_used": 5
}
```

**tts 节点**（阶段二）：
```json
{
  "audio_url": "/generated/audio_abc123.mp3",
  "duration": 15.5,
  "voice": "female_warm",
  "credits_used": 3
}
```

**ai_video 节点**（阶段三）：
```json
{
  "video_url": "/generated/video_abc123.mp4",
  "duration": 5.0,
  "width": 1080,
  "height": 1920,
  "model_used": "kling",
  "credits_used": 20
}
```

**video_merge 节点**（阶段三）：
```json
{
  "video_url": "/generated/merged_abc123.mp4",
  "duration": 45.0,
  "resolution": "1080x1920",
  "credits_used": 0
}
```

**audio_mix 节点**（阶段三）：
```json
{
  "audio_url": "/generated/mixed_abc123.mp3",
  "duration": 45.0,
  "credits_used": 0
}
```

**condition 节点**（阶段三）：
```json
{
  "matched": true,
  "branch": "true",
  "evaluation": "输入文本包含'购买'"
}
```

**agent 节点**（阶段三）：
```json
{
  "output": "最终生成的内容或文件路径",
  "steps_executed": 5,
  "total_credits": 35,
  "execution_log": [
    {"step": 1, "action": "生成文案", "result": "成功"},
    {"step": 2, "action": "拆分分镜", "result": "成功"},
    {"step": 3, "action": "生成图片", "result": "成功"}
  ]
}
```

---

## 五、数据流系统（阶段二启用）

### 5.1 端口类型定义

每种节点类型定义了输入/输出端口及其数据类型：

```
端口类型      数据格式           说明
─────────    ─────────        ─────────
text         string           文本数据
image        string (URL)     图片文件路径
video        string (URL)     视频文件路径
audio        string (URL)     音频文件路径
text[]       string[]         文本数组（多段文案）
```

### 5.2 连线校验规则

阶段二实现简单的端口类型匹配：

```
text   ──→ text    ✅
text   ──→ image   ✅  （AI图片生成接受文本输入）
image  ──→ video   ✅  （AI视频生成接受图片输入）
video  ──→ video   ✅  （视频拼接）
audio  ──→ audio   ✅  （音频混合）
image  ──→ text    ❌  （类型不兼容）
```

### 5.3 执行引擎（阶段二）

工作流执行采用**拓扑排序 + 顺序执行**：

```
1. 对所有节点进行拓扑排序（基于连线关系）
2. 按排序顺序依次执行每个节点
3. 每个节点执行时：
   a. 从输入端口读取数据（上游节点的 result_json）
   b. 调用对应的 AI 服务
   c. 将结果写入 result_json
   d. 更新 state 为 done/error
4. 所有节点执行完毕，画布状态变为 completed
```

### 5.4 节点执行器映射

每个节点类型对应一个执行器（Executor），负责调用具体的 AI 服务：

| 节点类型 | 执行器 | 调用的服务 | 阶段 |
|---------|--------|-----------|------|
| scene | 无（手动编辑） | - | 一 |
| ai_text | TextGenerator | MiniMax / 火山方舟 LLM API | 二 |
| ai_image | ImageGenerator | Flux / DALL-E / Midjourney API | 二 |
| ai_split | ScriptSplitter | MiniMax / 火山方舟 LLM API | 二 |
| tts | TextToSpeech | 火山引擎 TTS / Edge TTS | 二 |
| ai_video | VideoGenerator | 可灵 / Runway / Pika API | 三 |
| video_merge | VideoMerger | FFmpeg（本地处理） | 三 |
| audio_mix | AudioMixer | FFmpeg（本地处理） | 三 |
| condition | ConditionEvaluator | 本地逻辑判断 | 三 |
| agent | AgentRunner | LLM API + 工具调用 | 三 |

### 5.5 错误处理策略

| 错误类型 | 处理方式 |
|---------|---------|
| API 超时 | 自动重试 2 次，间隔 5s/15s |
| API 返回错误 | 记录错误信息，节点标记为 error，停止执行 |
| 积分不足 | 执行前预检查，不足时提示用户 |
| JSON 解析失败 | 重试 1 次，仍失败则标记 error |
| 网络中断 | 保存当前进度，用户可从断点恢复 |

### 5.6 工作流执行示例

**示例：一键生成口播视频（阶段三全链路）**

```
画布节点编排：
[start] → [ai_text: 生成文案] → [ai_split: 拆分分镜] → [ai_image: 生成关键帧]
                                                                    │
                                                                    ▼
[video_merge: 合成视频] ← [ai_video: 生成片段×4] ← [scene: 分镜×4]
        │
        ▼
[audio_mix: 混合音频] ← [tts: 生成配音] + [BGM上传]
        │
        ▼
[end: 输出最终视频]

执行流程：
1. start → 输出初始选题文本
2. ai_text → 调用 LLM 生成 200 字文案 → 输出文案
3. ai_split → 调用 LLM 拆分为 4 个分镜 → 输出 text[4]
4. ai_image×4 → 调用图片生成 API，为每个分镜生成关键帧 → 输出 image×4
5. ai_video×4 → 调用视频生成 API，每个关键帧生成 5 秒视频 → 输出 video×4
6. tts → 调用 TTS 将文案转为配音 → 输出 audio
7. video_merge → FFmpeg 合并 4 个视频片段 → 输出 video
8. audio_mix → FFmpeg 混合配音+BGM → 输出 audio
9. end → 输出最终视频文件路径

总积分消耗：5(文案) + 5(分镜) + 8×4(图片) + 20×4(视频) + 3(配音) = 120 积分
```

---

## 六、阶段一详细设计（V2.0）

### 6.1 模块总览

| 模块 | 名称 | 范围 | 预估 |
|------|------|------|------|
| M1 | 画布基础设施 | 画布创建、节点拖拽、连线 | 6天 |
| M2 | 节点编辑器 | 节点内容编辑（文案/时长/备注/景别/运镜） | 5天 |
| M3 | 视频→画布 | 从已有视频创建画布 | 2天 |
| M4 | AI 智能分镜 | AI 拆分文案为分镜节点 | 4天 |
| M5 | 模板系统 | 预设模板 + 自定义模板 | 4天 |
| M6 | 导出 | Markdown/PDF/纯文案导出 | 4天 |

**实施顺序**：M1 → M2 → M3 → M5 → M4 → M6

### 6.2 M1：画布基础设施

**前端组件**：

```
pages/
  StoryboardListPage.tsx    -- "我的脚本"列表页
  StoryboardEditorPage.tsx  -- 画布编辑器页面

components/storyboard/
  Canvas.tsx                -- React Flow 画布容器
  SceneNode.tsx             -- 分镜节点组件（自定义 React Flow 节点）
  NodeToolbar.tsx           -- 节点工具栏（添加/删除/编辑）
  CanvasToolbar.tsx         -- 画布工具栏（缩放/适应/保存/导出）
```

**API 接口**：

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/storyboards` | GET | 获取用户画布列表（分页） |
| `/api/storyboards` | POST | 创建新画布 |
| `/api/storyboards/:id` | GET | 获取画布详情（含节点+连线） |
| `/api/storyboards/:id` | PUT | 更新画布（名称、视口） |
| `/api/storyboards/:id` | DELETE | 删除画布 |

**快捷键**：

| 快捷键 | 功能 |
|--------|------|
| Delete / Backspace | 删除选中节点 |
| Ctrl+Z / Cmd+Z | 撤销 |
| Ctrl+Y / Cmd+Y | 重做 |
| Ctrl+S / Cmd+S | 保存 |
| Space + 拖拽 | 平移画布 |
| 双击空白处 | 创建新节点 |

**用户流程**：
1. 导航栏新增「脚本」Tab → 点击进入列表页
2. 点击「新建画布」→ 输入名称 → 创建空画布 → 进入编辑器
3. 双击画布空白处 → 创建新节点
4. 拖拽节点调整位置，从节点边缘拖出连线
5. 滚轮缩放、Space+拖拽平移画布

### 6.3 M2：节点编辑器

**前端组件**：

```
components/storyboard/
  NodeEditorPanel.tsx       -- 右侧节点编辑面板
  ScriptInput.tsx           -- 文案输入区域
  DescriptionInput.tsx      -- 画面描述输入
  DurationPicker.tsx        -- 时长选择器
  ShotTypeSelector.tsx      -- 景别选择（近景/中景/远景/特写）
  CameraMoveSelector.tsx    -- 运镜选择（固定/推/拉/摇/跟）
  ImageUploader.tsx         -- 关键帧图片上传
  NotesInput.tsx            -- 备注输入
```

**API 接口**：

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/storyboards/:id/nodes` | POST | 添加节点 |
| `/api/storyboards/:id/nodes/:nodeId` | PUT | 更新节点内容 |
| `/api/storyboards/:id/nodes/:nodeId` | DELETE | 删除节点 |
| `/api/storyboards/:id/edges` | POST | 添加连线 |
| `/api/storyboards/:id/edges/:edgeId` | DELETE | 删除连线 |
| `/api/storyboards/:id/batch` | PUT | 批量更新（保存整个画布状态） |

**用户流程**：
1. 点击画布上的节点 → 右侧弹出编辑面板
2. 编辑文案、画面描述、时长、景别、运镜
3. 可选：上传关键帧图片
4. 自动保存或 Ctrl+S 手动保存

### 6.4 M3：视频 → 画布

**API 接口**：

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/videos/:id/to-storyboard` | POST | 从视频创建画布 |

**请求体**：
```json
{
  "split_method": "sentence"
}
```

**前端改动**：
- `DetailPage.tsx` 新增「创建分镜脚本」按钮
- 点击后调用 API → 跳转到 `/storyboard/:id`

**用户流程**：
1. 视频详情页 → 点击「创建分镜脚本」
2. 系统自动创建画布 → 文案按句拆分 → 每段一个节点 → 自动连线
3. 跳转到画布编辑器，用户可手动微调

### 6.5 M4：AI 智能分镜

**积分消耗**：5积分/次

**API 接口**：

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/storyboards/:id/auto-split` | POST | AI 智能拆分分镜 |

**LLM Prompt**：

```
你是一个短视频分镜脚本专家。请根据以下文案内容，将其拆分为合理的分镜节点。

要求：
1. 每个分镜节点包含：文案片段、画面描述、建议时长、景别、运镜
2. 遵循"钩子→内容→结尾"的短视频结构
3. 每个分镜时长建议 3-15 秒
4. 总分镜数控制在 4-8 个
5. 景别(close/medium/long/extreme_close)和运镜(static/push/pull/pan/track)要符合电影语言规范

文案内容：
{script_text}

请以 JSON 数组格式返回：
[
  {
    "script": "文案片段",
    "description": "画面描述",
    "duration": "建议时长",
    "shot_type": "景别",
    "camera_move": "运镜"
  }
]
```

**前端组件**：

```
components/storyboard/
  AIStoryBoardPanel.tsx     -- AI 分镜操作面板
  SplitPreview.tsx          -- 拆分预览
```

**用户流程**：
1. 点击「AI 智能分镜」→ 确认扣费（5积分）
2. AI 分析 → 预览拆分结果
3. 确认 → 节点自动创建到画布
4. 可手动微调

### 6.6 M5：模板系统

**预设模板**：

| 模板名 | 节点数 | 结构 |
|--------|--------|------|
| 口播模板 | 5 | 开场钩子→问题→方案→案例→结尾引导 |
| 剧情模板 | 6 | 冲突→发展→转折→高潮→结局→悬念 |
| 带货模板 | 5 | 痛点→产品→对比→优惠→下单引导 |
| Vlog模板 | 4 | 开场→过程→亮点→结尾 |
| 测评模板 | 5 | 开箱→外观→体验→总结→推荐 |

**API 接口**：

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/templates` | GET | 获取模板列表 |
| `/api/templates` | POST | 保存当前画布为模板 |
| `/api/templates/:id` | GET | 获取模板详情 |
| `/api/templates/:id` | DELETE | 删除用户模板 |
| `/api/templates/:id/apply` | POST | 应用模板到当前画布 |

### 6.7 M6：导出

| 格式 | 说明 | 优先级 |
|------|------|--------|
| Markdown | 分镜号+景别+运镜+画面描述+文案+时长 | 🔴 P0 |
| 纯文案 | 所有节点文案拼接 | 🔴 P0 |
| PDF | 专业分镜脚本文档 | 🟡 P1 |
| 画布截图 | 导出画布为 PNG | 🟡 P1 |

**API 接口**：

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/storyboards/:id/export/md` | GET | 导出 Markdown |
| `/api/storyboards/:id/export/text` | GET | 导出纯文案 |
| `/api/storyboards/:id/export/pdf` | GET | 导出 PDF |

**Markdown 导出示例**：

```markdown
# 分镜脚本：如何拍出爆款视频

## 分镜1 - 开场钩子（0-3秒）
- **景别**：中景
- **运镜**：固定
- **画面描述**：面对镜头，表情夸张
- **文案**：你知道为什么你的视频没人看吗？
- **备注**：语速要快，制造悬念

## 分镜2 - 痛点描述（3-8秒）
- **景别**：近景
- **运镜**：推
- **画面描述**：展示手机刷视频画面
- **文案**：因为你没有掌握这三个关键技巧...

---

**总时长**：约45秒
**总字数**：约180字
```

---

## 七、阶段二详细设计（V2.5）

### 7.1 新增节点类型与执行器

#### ai_text 节点（LLM 文案生成）

**功能**：输入选题/提示词，调用 LLM 生成文案

**执行流程**：
```
1. 从输入端口读取文本（选题/提示词）
2. 将 config_json 中的 prompt 模板替换变量
3. 调用 LLM API（MiniMax 或 火山方舟）
4. 解析返回结果
5. 写入 result_json
```

**LLM Prompt 模板**：
```
你是一个短视频文案专家。请根据以下要求生成短视频文案。

要求：
- 风格：{style}
- 字数：约{word_count}字
- 选题/提示：{input_text}

请直接输出文案内容，不要添加额外说明。
```

#### ai_image 节点（AI 图片生成）

**功能**：输入文字描述，调用图片生成 API 生成图片

**执行流程**：
```
1. 从输入端口读取文本描述
2. 构造图片生成请求（prompt + 配置）
3. 调用图片生成 API（Flux / DALL-E / Midjourney）
4. 下载生成的图片，保存到本地
5. 写入 result_json（图片路径+元数据）
```

**集成 API 选择**：
| 服务 | 优势 | 适用场景 |
|------|------|---------|
| Flux（Black Forest Labs） | 开源、质量高、成本低 | 首选方案 |
| DALL-E 3 | OpenAI、稳定 | 备选方案 |
| Midjourney | 艺术风格强 | 特定风格需求 |

#### ai_split 节点（AI 分镜拆分）

**功能**：输入长文案，AI 拆分为多个分镜片段

**执行流程**：
```
1. 从输入端口读取长文案
2. 调用 LLM 进行语义分析和分镜拆分
3. 解析返回的 JSON 数组
4. 写入 result_json（包含多个分镜片段）
```

**输出格式**：`text[]`（数组，每个元素是一段分镜文案）

#### tts 节点（语音合成）

**功能**：输入文案，调用 TTS 服务生成语音

**执行流程**：
```
1. 从输入端口读取文案
2. 调用 TTS API
3. 下载生成的音频文件，保存到本地
4. 写入 result_json（音频路径+时长）
```

**集成 API 选择**：
| 服务 | 优势 | 适用场景 |
|------|------|---------|
| 火山引擎 TTS | 中文效果好、音色丰富 | 首选方案 |
| Edge TTS | 免费、微软语音 | 免费备选 |
| MiniMax TTS | 情感表达好 | 高质量需求 |

### 7.2 版本快照系统

**自动保存策略**：
- 每次用户手动保存时，自动生成版本快照
- 每次执行工作流前，自动保存当前状态
- 保留最近 20 个版本，超出自动清理最旧版本

**快照内容**：
```json
{
  "version": 5,
  "storyboard": {
    "name": "我的分镜脚本",
    "viewport_json": {"x": 0, "y": 0, "zoom": 1}
  },
  "nodes": [...],
  "edges": [...],
  "created_at": "2026-05-28T10:30:00Z"
}
```

**回滚机制**：
- 用户在画布编辑器点击「版本历史」
- 选择某个历史版本 → 预览差异
- 确认回滚 → 用快照数据覆盖当前画布

### 7.3 前端组件扩展

```
components/storyboard/
  node-types/
    AITextNode.tsx           -- AI文案生成节点UI
    AIImageNode.tsx          -- AI图片生成节点UI
    AISplitNode.tsx          -- AI分镜拆分节点UI
    TTSNode.tsx              -- 语音合成节点UI
  execution/
    ExecutionPanel.tsx       -- 执行面板（一键执行/暂停/取消）
    NodeProgress.tsx         -- 节点执行进度指示
    ExecutionHistory.tsx     -- 执行历史列表
  version/
    VersionPanel.tsx         -- 版本历史面板
    VersionDiff.tsx          -- 版本差异对比
```

---

## 八、阶段三详细设计（V3.0）

### 8.1 新增节点类型与执行器

#### ai_video 节点（AI 视频生成）

**功能**：输入关键帧图片+文字描述，调用视频生成 API 生成视频片段

**执行流程**：
```
1. 从输入端口读取 image（关键帧）和 text（描述）
2. 构造视频生成请求
3. 调用视频生成 API（异步任务，轮询等待）
4. 下载生成的视频，保存到本地
5. 写入 result_json
```

**集成 API 选择**：
| 服务 | 优势 | 适用场景 |
|------|------|---------|
| 可灵（Kling） | 快手自研、中文场景好 | 国内首选 |
| Runway Gen-3 | 效果最好、专业级 | 高质量需求 |
| Pika | 快速、便宜 | 快速预览 |
| Wan（阿里开源） | 开源、可私有部署 | 私有化方案 |

**关键配置参数**：
```json
{
  "model": "kling",
  "duration": 5,              // 视频时长（秒）
  "reference_image": "url",   // 参考图片
  "prompt": "镜头描述",       // 运动描述
  "motion_strength": 0.7,     // 运动强度 0-1
  "negative_prompt": "模糊,变形",  // 负面提示
  "aspect_ratio": "9:16"      // 画面比例
}
```

#### video_merge 节点（视频拼接）

**功能**：将多个视频片段拼接为完整视频，支持转场效果

**执行流程**：
```
1. 从输入端口读取视频片段列表（按顺序）
2. 根据 config_json 中的转场配置，使用 FFmpeg 处理
3. 可选：叠加背景音乐
4. 输出合并后的视频
5. 写入 result_json
```

**FFmpeg 命令示例**：
```bash
# 淡入淡出转场
ffmpeg -i clip1.mp4 -i clip2.mp4 \
  -filter_complex "[0:v][1:v]xfade=transition=fade:duration=0.5:offset=4.5" \
  -c:v libx264 -c:a aac output.mp4

# 叠加BGM
ffmpeg -i merged.mp4 -i bgm.mp3 \
  -filter_complex "[1:a]volume=0.3[bgm];[0:a][bgm]amix=inputs=2" \
  -c:v copy output_with_bgm.mp4
```

#### audio_mix 节点（音频混合）

**功能**：将配音、BGM、音效混合为一条音频

**执行流程**：
```
1. 从输入端口读取多个音频文件
2. 根据 config_json 中的音量/淡入淡出配置
3. 使用 FFmpeg 混合音频
4. 输出混合后的音频
5. 写入 result_json
```

#### condition 节点（条件分支）

**功能**：根据输入文本的条件判断，走不同的执行路径

**条件类型**：
| 类型 | 说明 | 示例 |
|------|------|------|
| contains | 包含关键词 | 包含"购买" |
| regex | 正则匹配 | 匹配价格模式 |
| length | 长度判断 | 文案>200字 |
| custom | 自定义表达式 | LLM 判断情感倾向 |

**执行流程**：
```
1. 从输入端口读取文本
2. 根据条件类型进行判断
3. 将结果写入 result_json（matched: true/false）
4. 后续执行时，只走匹配的分支
```

#### agent 节点（AI Agent）

**功能**：给定目标，AI Agent 自动规划并执行子任务

**执行流程**：
```
1. 从输入端口读取任务目标
2. Agent 规划执行步骤（调用 LLM）
3. 按步骤依次执行：
   - 每步调用一个子工具（文案生成/图片生成/视频生成等）
   - 将结果传递给下一步
4. 所有步骤完成，输出最终结果
5. 写入 result_json（含执行日志）
```

**Agent 工具集**：
| 工具 | 功能 | 调用的服务 |
|------|------|-----------|
| generate_text | 生成文案 | LLM API |
| split_script | 拆分分镜 | LLM API |
| generate_image | 生成图片 | 图片生成 API |
| generate_video | 生成视频 | 视频生成 API |
| generate_audio | 生成配音 | TTS API |
| merge_video | 合并视频 | FFmpeg |
| search_asset | 搜索素材库 | 本地数据库 |

### 8.2 资产库系统

**资产类型**：
| 类型 | 来源 | 存储格式 |
|------|------|---------|
| 关键帧图片 | 用户上传 / AI生成 | PNG/JPG |
| 视频片段 | 用户上传 / AI生成 | MP4 |
| 音频文件 | TTS生成 / 用户上传 | MP3/WAV |
| BGM音乐 | 预设库 / 用户上传 | MP3 |

**资产库功能**：
- 标签分类管理
- 按类型/来源/日期筛选
- 搜索
- 在画布节点中直接引用资产库中的素材
- 批量导入/导出

### 8.3 角色一致性技术方案

**方案**：
1. 用户上传角色参考图（正面/侧面/背面）
2. 系统提取角色特征向量（CLIP + FaceNet）
3. 在每个 ai_image / ai_video 节点中注入角色特征
4. 确保同一画布中所有分镜的角色外观一致

**技术实现**：
- 使用 IP-Adapter 注入角色特征
- 使用 FaceLock 约束面部特征
- 跨节点传递角色 ID，确保一致性

### 8.4 批量生产模式

**功能**：基于一个画布模板，批量生成多个变体

**流程**：
```
1. 用户选择一个画布作为模板
2. 设置变量（选题列表、风格变体、口播人等）
3. 系统批量创建画布副本，替换变量
4. 批量执行所有画布
5. 输出多个成品视频
```

**应用场景**：
- 一个脚本模板 + 10个选题 → 10个视频
- 一个分镜结构 + 3种风格 → 3个视频
- 一个口播脚本 + 5种配音 → 5个视频

### 8.5 Agent 自动驾驶模式

**功能**：用户只输入一个选题，AI 自动完成全流程

**流程**：
```
用户输入："做一个关于咖啡拉花的短视频"

Agent 执行：
1. 分析选题 → 确定风格为"教程类"
2. 生成文案 → 200字口播文案
3. 拆分分镜 → 5个分镜节点
4. 为每个分镜生成关键帧图片
5. 为每个关键帧生成5秒视频
6. 生成配音
7. 合成最终视频
8. 输出到资产库
```

**人机协同**：
- Agent 在关键决策点暂停，征求用户意见
- 用户可随时干预、调整方向
- Agent 记录用户偏好，下次自动应用

---

## 九、页面路由规划

```
/                          -- 首页（现有）
/storyboards               -- 我的脚本列表页（新增）
/storyboard/:id            -- 画布编辑器（新增）
/storyboard/new            -- 新建画布（新增）
/detail/:id                -- 视频详情（现有，新增入口按钮）
/library                   -- 素材库（现有）
/square                    -- 广场（现有）
/login                     -- 登录（现有）
/register                  -- 注册（现有）
```

---

## 十、技术依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| reactflow | ^11.x | 无限画布组件 |
| @reactflow/minimap | ^11.x | 画布缩略图 |
| @reactflow/controls | ^11.x | 缩放/平移控件 |
| @reactflow/background | ^11.x | 画布背景网格 |
| jsPDF | ^2.x | PDF 导出 |
| html-to-image | ^1.x | 画布截图导出 |

---

## 十一、积分规则（全阶段）

### 阶段一

| 操作 | 积分消耗 |
|------|---------|
| 创建画布 | 免费 |
| 手动编辑节点 | 免费 |
| 从视频创建画布 | 免费 |
| AI 自动分镜 | -5 积分 |
| 应用模板 | 免费 |
| 保存为模板 | 免费 |
| 导出脚本 | 免费 |

### 阶段二

| 操作 | 积分消耗 |
|------|---------|
| ai_text 节点执行 | -5 积分 |
| ai_image 节点执行 | -8 积分 |
| ai_split 节点执行 | -5 积分 |
| tts 节点执行 | -3 积分 |
| 工作流一键执行 | 按节点累计 |
| 版本回滚 | 免费 |

### 阶段三

| 操作 | 积分消耗 |
|------|---------|
| ai_video 节点执行（5秒） | -20 积分 |
| ai_video 节点执行（10秒） | -35 积分 |
| video_merge 节点执行 | 免费 |
| audio_mix 节点执行 | 免费 |
| condition 节点执行 | 免费 |
| agent 节点执行 | 按子任务累计 |
| 资产库存储 | 免费 |
| 批量生产 | 按单个画布累计×数量 |

### 全链路成本估算

| 场景 | 节点组合 | 预估积分 |
|------|---------|---------|
| 口播脚本编辑 | scene×5 + AI分镜 | 5 积分 |
| 文案+分镜+关键帧 | ai_text + ai_split + ai_image×5 | 50 积分 |
| 完整视频生成 | 文案+分镜+图片×5+视频×5+配音 | 158 积分 |
| Agent自动驾驶 | agent（自动全流程） | 约 150-200 积分 |
