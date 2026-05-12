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

# 模型 ID (paraformer large, NANO模型当前不可用)
MODEL_ID = "paraformer"
# 标点恢复模型
PUNC_MODEL = "ct-punc"

# 全局模型实例
model = None
punc_enabled = False


def init_model():
    """初始化 ASR 模型 + 标点恢复模型"""
    global model, punc_enabled
    if model is None:
        try:
            # 尝试加载 ASR + 标点恢复联合模型
            model = AutoModel(
                model=MODEL_ID,
                punc_model=PUNC_MODEL,
                device="cpu",
            )
            punc_enabled = True
            print(f"ASR + 标点恢复模型加载成功")
        except Exception as e:
            print(f"标点模型加载失败，使用纯ASR模式: {e}")
            # 回退到纯 ASR
            model = AutoModel(
                model=MODEL_ID,
                device="cpu",
            )
            punc_enabled = False
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
    description="基于 Paraformer 模型的本地语音识别服务 (NANO模型暂不可用)",
    version="1.0.0",
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
        # 执行识别
        result = model.generate(input=tmp_path)
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

        # 标点恢复（Fun-ASR的非VAD路径不会自动调用标点模型，需手动串联）
        if punc_enabled and text.strip():
            try:
                punc_res = model.inference(
                    text,
                    model=model.punc_model,
                    kwargs=model.punc_kwargs,
                )
                print(f"标点恢复结果: {punc_res}")
                if punc_res and len(punc_res) > 0:
                    text = punc_res[0].get("text", text)
            except Exception as punc_err:
                print(f"标点恢复失败: {punc_err}")

        return {
            "success": True,
            "text": text,
            "filename": filename,
            "punctuation": punc_enabled,
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
    return {"status": "ok", "model": MODEL_ID, "punctuation": punc_enabled}


if __name__ == "__main__":
    # 部署在本地 localhost
    uvicorn.run(
        "app:app",
        host="127.0.0.1",
        port=8000,
        reload=False,
    )
