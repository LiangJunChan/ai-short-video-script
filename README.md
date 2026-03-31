# AI短视频脚本平台 V1.0

一款轻量化AI短视频脚本辅助平台，核心价值是实现用户上传短视频的集中展示，以及通过AI技术自动提取视频文案并呈现，降低用户查看、获取短视频文案的成本，适配个人创作者、内容运营者等用户群体。

## 技术栈

- **后端**：Go + Gin + SQLite
- **前端**：React + Vite
- **音视频处理**：FFmpeg
- **AI语音识别**：预留Fun-ASR接口，可接入本地模型或第三方API

## 功能特性

✅ **V1.0 核心功能**
- 短视频上传（支持MP4/FLV/MOV，大小≤4GB，时长15秒-10分钟）
- 短视频列表卡片展示（3列网格，分页，按时间倒序）
- 短视频详情页（自适应播放器 + AI文案展示）
- 自动截取视频缩略图
- 异步AI文案提取
- 一键复制文案功能
- 完善的异常处理

## 本地开发

### 环境要求
- Go 1.21+
- Node.js 18+
- FFmpeg

### 启动后端

```bash
cd backend
go mod tidy
go build -o server
./server
```

后端服务运行在 `http://localhost:3000`

### 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端服务运行在 `http://localhost:5173`

## API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/videos` | GET | 获取视频列表（分页） |
| `/api/videos/:id` | GET | 获取视频详情 |
| `/api/upload` | POST | 上传视频 |
| `/api/videos/:id/copy` | GET | 获取文案用于复制 |

## AI语音识别配置

在 `backend/service/processor.go` 的 `RecognizeSpeech` 函数中接入实际的语音识别服务：

```go
// 当前预留接口，需要替换为实际实现
func RecognizeSpeech(audioPath string) (string, error) {
    // TODO: 接入Fun-ASR本地模型或第三方API
    return "", fmt.Errorf("no speech recognition service configured")
}
```

可选项：
- [Fun-ASR](https://github.com/alibaba/FunASR) - 开源语音识别工具包
- 阿里云语音识别API
- 百度语音识别API

## 项目结构

```
ai-short-video-script/
├── backend/                # Go + Gin 后端
│   ├── main.go            # 入口文件
│   ├── database/
│   │   └── db.go         # SQLite数据库操作
│   ├── handler/
│   │   └── video.go      # API处理器
│   └── service/
│       └── processor.go  # 音视频处理和AI识别
├── frontend/              # React + Vite 前端
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js         # API调用
│   │   ├── components/   # 组件
│   │   └── pages/        # 页面
│   └── vite.config.js
├── uploads/               # 上传视频存储
├── thumbnails/            # 缩略图存储
└── audio/                 # 临时音频存储
```

## 后续迭代规划

- **V1.1**：用户注册登录，视频管理，优化AI提取精度
- **V1.2**：视频搜索分类，文案编辑
- **V1.3**：AI脚本生成，视频收藏分享
- **V2.0**：视频编辑，批量上传，移动端适配

## 许可证

MIT
