"""
ASR Web Service (sherpa-onnx 版)
提供 HTTP 接口接受音频输入，返回识别文本。

用 sherpa-onnx + SenseVoice int8 ONNX 本地推理，替代 funasr+torch，
以适配 1.8G 内存的小机器（funasr+torch 加载即 OOM）。
模型文件在 ./models/ 下（随镜像 COPY 进容器）：
  - model.int8.onnx
  - tokens.txt
"""

import os
import gc
import tempfile
import subprocess
from contextlib import asynccontextmanager
from pathlib import Path

import numpy as np
import uvicorn
from fastapi import FastAPI, UploadFile, File, HTTPException

import sherpa_onnx

MODEL_DIR = Path(os.environ.get("MODEL_DIR", "/app/models"))
MODEL_PATH = MODEL_DIR / "model.int8.onnx"
TOKENS_PATH = MODEL_DIR / "tokens.txt"

# 音频分段秒数：长音频分段推理，避免峰值内存过高
SEG_SECONDS = int(os.environ.get("ASR_SEG_SECONDS", "25"))
SAMPLE_RATE = 16000

# 全局识别器
recognizer = None


def init_model():
    global recognizer
    if recognizer is None:
        recognizer = sherpa_onnx.OfflineRecognizer.from_sense_voice(
            model=str(MODEL_PATH),
            tokens=str(TOKENS_PATH),
            num_threads=2,
            use_itn=True,
            debug=False,
        )
        print(f"sherpa-onnx SenseVoice 模型加载成功: {MODEL_PATH}")
    return recognizer


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_model()
    print("ASR 服务就绪 (sherpa-onnx)")
    yield
    print("服务关闭")


app = FastAPI(
    title="ASR 语音识别服务 (sherpa-onnx)",
    description="基于 sherpa-onnx + SenseVoice int8 的本地语音识别服务，低内存 CPU 推理",
    version="2.1.0",
    lifespan=lifespan,
)


def decode_audio_to_pcm(src_path: str) -> np.ndarray:
    """用 ffmpeg 把任意音频解码成 16k 单声道 float32 PCM。"""
    cmd = [
        "ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error",
        "-i", src_path,
        "-f", "f32le", "-ac", "1", "-ar", str(SAMPLE_RATE),
        "pipe:1",
    ]
    proc = subprocess.run(cmd, capture_output=True)
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg 解码失败: {proc.stderr.decode(errors='ignore')[:500]}")
    return np.frombuffer(proc.stdout, dtype=np.float32)


def recognize_pcm(samples: np.ndarray) -> str:
    """对整段 PCM 分段识别，拼接文本。"""
    rec = init_model()
    seg_len = SEG_SECONDS * SAMPLE_RATE
    texts = []
    total = len(samples)
    for start in range(0, total, seg_len):
        chunk = samples[start:start + seg_len]
        if len(chunk) == 0:
            continue
        stream = rec.create_stream()
        stream.accept_waveform(SAMPLE_RATE, chunk)
        rec.decode_stream(stream)
        t = stream.result.text
        if t:
            texts.append(t)
        del stream
        gc.collect()
    return "".join(texts).strip()


@app.post("/asr")
async def recognize_speech(file: UploadFile = File(...)):
    filename = file.filename or ""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    allowed_formats = ["wav", "mp3", "m4a"]
    if ext not in allowed_formats:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的音频格式: {ext}。支持的格式: {', '.join(allowed_formats)}"
        )

    audio_bytes = await file.read()
    with tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        samples = decode_audio_to_pcm(tmp_path)
        text = recognize_pcm(samples)
        del samples
        gc.collect()
        return {
            "success": True,
            "text": text,
            "filename": filename,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"识别失败: {str(e)}")
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


@app.get("/health")
async def health_check():
    return {"status": "ok", "engine": "sherpa-onnx", "model": str(MODEL_PATH)}


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
