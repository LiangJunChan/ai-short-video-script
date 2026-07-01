"""
Fun-ASR Web Service
提供 HTTP 接口接受音频输入，返回识别文本
"""

import os
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import FastAPI, UploadFile, File, HTTPException
from funasr import AutoModel

# 模型 ID (SenseVoice Small 轻量模型，自带标点输出，CPU 推理更快)
MODEL_ID = "iic/SenseVoiceSmall"

# 全局模型实例
model = None


def init_model():
    """初始化 SenseVoice Small 模型"""
    global model
    if model is None:
        model = AutoModel(
            model=MODEL_ID,
            device="cpu",
            disable_update=True,
        )
        print(f"SenseVoice Small 模型加载成功")
    return model


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理 - 启动时加载模型"""
    init_model()
    print(f"模型 {MODEL_ID} 加载完成")
    yield
    print("服务关闭")


app = FastAPI(
    title="Fun-ASR 语音识别服务",
    description="基于 SenseVoice Small 轻量模型的本地语音识别服务，自带标点输出，CPU 推理更快",
    version="1.2.0",
    lifespan=lifespan,
)


@app.post("/asr")
async def recognize_speech(file: UploadFile = File(...)):
    """
    接受音频文件，返回识别文本

    支持格式: wav, mp3, m4a

    请求:
        - file: 音频文件 (multipart/form-data)

    返回:
        - text: 识别文本
        - success: 是否成功
    """
    # 检查文件格式
    filename = file.filename or ""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    allowed_formats = ["wav", "mp3", "m4a"]
    if ext not in allowed_formats:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的音频格式: {ext}。支持的格式: {', '.join(allowed_formats)}"
        )

    # 读取音频文件到临时文件
    audio_bytes = await file.read()

    # funasr 需要文件路径，使用临时文件
    with tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        # 执行识别（use_itn=True 启用标点输出）
        result = model.generate(input=tmp_path, use_itn=True)
        print(f"ASR原始结果: {result}")

        # 解析结果 - generate 返回 list，每项是 dict 或字符串
        if result and len(result) > 0:
            item = result[0]
            if isinstance(item, dict):
                text = item.get("text", "")
                if not text and "keys" in item:
                    text = item["keys"][0] if item["keys"] else ""
            elif isinstance(item, str):
                text = item
            else:
                text = str(item)
        else:
            text = ""

        return {
            "success": True,
            "text": text,
            "filename": filename,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"识别失败: {str(e)}")
    finally:
        # 清理临时文件
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


@app.get("/health")
async def health_check():
    """健康检查接口"""
    return {"status": "ok", "model": MODEL_ID}


if __name__ == "__main__":
    # host 默认 127.0.0.1(本机开发,不暴露到外网)
    # Docker 里 compose 会传 ASR_HOST=0.0.0.0 让容器外可访问
    import os
    uvicorn.run(
        "app:app",
        host=os.environ.get("ASR_HOST", "127.0.0.1"),
        port=int(os.environ.get("ASR_PORT", "8000")),
        reload=False,
    )
