# FunASR 语音识别服务

基于阿里达摩院 FunASR 框架和 SenseVoice Small 模型的本地语音识别服务，提供 HTTP API 接口。

## 模型介绍

当前使用 **SenseVoice Small** 轻量级语音识别模型：

| 特性 | 说明 |
|------|------|
| 模型名称 | `iic/SenseVoiceSmall` |
| 模型来源 | ModelScope 阿里达摩院 |
| 参数量 | ~200M |
| 模型大小 | ~893MB |
| 推理方式 | CPU |
| 标点输出 | 自带（无需额外模型） |
| 支持语言 | 中文、英文、日文、韩文等 |

### 为什么选择 SenseVoice Small？

- **轻量高效**：相比 Paraformer-large，推理速度更快，内存占用更小
- **自带标点**：模型内置标点预测，无需加载额外的标点恢复模型
- **多语言支持**：原生支持中英日韩等多种语言
- **CPU 友好**：纯 CPU 推理，无需 GPU

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 启动服务

```bash
python app.py
```

首次启动会自动从 ModelScope 下载模型（约 893MB）。

### 3. API 调用

```bash
# 识别音频文件
curl -X POST "http://127.0.0.1:8000/asr" \
  -F "file=@your_audio.wav"

# 健康检查
curl "http://127.0.0.1:8000/health"
```

**请求参数：**

- `file`: 音频文件（multipart/form-data）
- 支持格式：`wav`, `mp3`, `m4a`

**响应示例：**

```json
{
  "success": true,
  "text": "这是一个测试文本。",
  "filename": "your_audio.wav"
}
```

## API 接口

### POST /asr

语音识别接口

**请求：**
```
POST /asr
Content-Type: multipart/form-data

file: <音频文件>
```

**响应：**
```json
{
  "success": true,
  "text": "识别出的文本内容",
  "filename": "原始文件名"
}
```

### GET /health

健康检查接口

**响应：**
```json
{
  "status": "ok",
  "model": "iic/SenseVoiceSmall"
}
```

## Docker 部署

### 构建镜像

```bash
docker build -t funasr-service .
```

### 运行容器

```bash
docker run -d \
  --name funasr \
  -p 8000:8000 \
  funasr-service
```

### 使用 Docker Compose（推荐）

在项目根目录的 `docker-compose.yml` 中已配置：

```yaml
services:
  asr:
    build: ./asr
    ports:
      - "8000:8000"
    restart: unless-stopped
```

```bash
# 启动
docker-compose up -d asr

# 查看日志
docker-compose logs -f asr
```

## 配置说明

### 修改模型

在 `app.py` 中修改 `MODEL_ID`：

```python
MODEL_ID = "iic/SenseVoiceSmall"  # 当前使用
# 或其他支持的模型：
# MODEL_ID = "paraformer"  # Paraformer-large（更大更慢）
```

### 修改服务地址

在 `app.py` 底部修改：

```python
uvicorn.run(
    "app:app",
    host="0.0.0.0",  # 改为 0.0.0.0 以支持外部访问
    port=8000,
    reload=False,
)
```

### GPU 加速（可选）

如需使用 GPU 推理，修改 `app.py` 中的设备配置：

```python
model = AutoModel(
    model=MODEL_ID,
    device="cuda",  # 改为 cuda
    disable_update=True,
)
```

## 目录结构

```
asr/
├── app.py              # FastAPI 服务主文件
├── requirements.txt    # Python 依赖
├── Dockerfile          # Docker 镜像构建文件
└── README.md           # 本文档
```

## 性能参考

| 场景 | 音频时长 | CPU 配置 | 推理时间 | RTF |
|------|---------|---------|---------|-----|
| 短视频 | 1 分钟 | 4 核 | ~20-30 秒 | 0.3-0.5x |
| 短视频 | 1 分钟 | 2 核 | ~40-60 秒 | 0.6-1.0x |

> RTF（实时率）= 推理时间 / 音频时长，RTF < 1 表示比实时快

## 常见问题

### Q: 首次启动很慢？
A: 首次启动需要下载模型文件（约 893MB），请耐心等待。模型会缓存到 `~/.cache/modelscope/`。

### Q: 识别结果没有标点？
A: 确保使用 `use_itn=True` 参数调用 `generate()`，当前代码已默认启用。

### Q: 如何处理长音频？
A: 当前为离线识别模式，适合 1-5 分钟的短视频音频。如需处理更长音频，可考虑添加 VAD 模型进行分段落处理。

### Q: 模型下载失败？
A: 检查网络连接，或手动下载模型后放到 `~/.cache/modelscope/hub/models/iic/SenseVoiceSmall/` 目录。

## 相关链接

- [FunASR GitHub](https://github.com/modelscope/FunASR)
- [ModelScope 模型页面](https://www.modelscope.cn/models/iic/SenseVoiceSmall)
- [SenseVoice 论文](https://arxiv.org/abs/2501.00623)
