## 技术栈

### 后端
- **Go 1.21+** + Gin 框架
- **SQLite** 数据库
- **FFmpeg** 音视频处理
- **Playwright** Python 脚本（抖音链接提取）

### ASR 服务
- **Python 3.13+** + FastAPI
- **Fun-ASR** 语音识别（Paraformer 模型 + ct-punc 标点恢复）
- 位于 `asr/` 目录，独立运行在 `localhost:8000`

### 前端
- **React 19** + Vite
- **TypeScript**
- **Tailwind CSS**
- **RTK Query**（Redux Toolkit Query）
- **React Router v6**
- **前端使用pnpm作为包管理器**