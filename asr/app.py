"""
ASR Web Service — 双引擎版
提供 HTTP 接口接受音频输入，返回识别文本。

通过环境变量 ASR_ENGINE 选择推理引擎:
  - ASR_ENGINE=sherpa: sherpa-onnx + SenseVoice int8 ONNX
      低内存(峰值~450MB),适合 1.8G 等小内存机器。模型在 ./models/ 下随镜像打包。
  - ASR_ENGINE=funasr (默认): funasr + torch + SenseVoiceSmall
      内存需求高(加载即 700MB+,峰值 1.5G+),适合 MacBook 等内存充足的开发机。
      模型首次运行时由 modelscope 自动下载。
  - 未设置时自动检测: sherpa_onnx 可用则用 sherpa,否则 fallback 到 funasr。

两种引擎对外 HTTP 接口完全一致(POST /asr, GET /health)。
"""

import os
import gc
import importlib
import tempfile
import subprocess
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import FastAPI, UploadFile, File, HTTPException

# 引擎选择:环境变量显式指定 > 自动检测(优先 sherpa > fallback funasr)
_env_engine = os.environ.get("ASR_ENGINE", "").lower().strip()
if _env_engine:
    ASR_ENGINE = _env_engine
else:
    # 自动检测: sherpa_onnx 可用就用 sherpa,否则 fallback funasr
    if importlib.util.find_spec("sherpa_onnx") is not None:
        ASR_ENGINE = "sherpa"
    else:
        ASR_ENGINE = "funasr"
    print(f"[ASR] 未设置 ASR_ENGINE,自动检测选择: {ASR_ENGINE}")

SAMPLE_RATE = 16000
SEG_SECONDS = int(os.environ.get("ASR_SEG_SECONDS", "25"))  # sherpa 分段秒数

# ---- sherpa 专用 ----
MODEL_DIR = Path(os.environ.get("MODEL_DIR", "/app/models"))
MODEL_PATH = MODEL_DIR / "model.int8.onnx"
TOKENS_PATH = MODEL_DIR / "tokens.txt"

# ---- funasr 专用 ----
FUNASR_MODEL_ID = os.environ.get("FUNASR_MODEL_ID", "iic/SenseVoiceSmall")

# 全局引擎实例(两种引擎共用一个变量名,类型不同)
_engine = None


# ============================================================
# sherpa-onnx 引擎(低内存)
# ============================================================
def _init_sherpa():
    global _engine
    if _engine is None:
        import sherpa_onnx
        _engine = sherpa_onnx.OfflineRecognizer.from_sense_voice(
            model=str(MODEL_PATH),
            tokens=str(TOKENS_PATH),
            num_threads=2,
            use_itn=True,
            debug=False,
        )
        print(f"[sherpa] SenseVoice int8 模型加载成功: {MODEL_PATH}")
    return _engine


def _decode_audio_to_pcm(src_path: str):
    """用 ffmpeg 把任意音频解码成 16k 单声道 float32 PCM(sherpa 用)。"""
    import numpy as np
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


def _recognize_sherpa(tmp_path: str) -> str:
    rec = _init_sherpa()
    samples = _decode_audio_to_pcm(tmp_path)
    seg_len = SEG_SECONDS * SAMPLE_RATE
    texts = []
    for start in range(0, len(samples), seg_len):
        chunk = samples[start:start + seg_len]
        if len(chunk) == 0:
            continue
        stream = rec.create_stream()
        stream.accept_waveform(SAMPLE_RATE, chunk)
        rec.decode_stream(stream)
        if stream.result.text:
            texts.append(stream.result.text)
        del stream
        gc.collect()
    del samples
    gc.collect()
    return "".join(texts).strip()


# ============================================================
# funasr 引擎(高内存,原版逻辑)
# ============================================================
def _init_funasr():
    global _engine
    if _engine is None:
        from funasr import AutoModel
        _engine = AutoModel(
            model=FUNASR_MODEL_ID,
            device="cpu",
            disable_update=True,
        )
        print(f"[funasr] {FUNASR_MODEL_ID} 模型加载成功")
    return _engine


def _recognize_funasr(tmp_path: str) -> str:
    model = _init_funasr()
    result = model.generate(input=tmp_path, use_itn=True)
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
    return text


# ============================================================
# 统一调度
# ============================================================
def init_model():
    if ASR_ENGINE == "funasr":
        return _init_funasr()
    return _init_sherpa()


def recognize(tmp_path: str) -> str:
    if ASR_ENGINE == "funasr":
        return _recognize_funasr(tmp_path)
    return _recognize_sherpa(tmp_path)


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"ASR 引擎: {ASR_ENGINE}")
    init_model()
    print(f"ASR 服务就绪 (engine={ASR_ENGINE})")
    yield
    print("服务关闭")


app = FastAPI(
    title="ASR 语音识别服务(双引擎)",
    description="ASR_ENGINE=sherpa(低内存 ONNX)/ funasr(torch)。接口一致。",
    version="3.0.0",
    lifespan=lifespan,
)


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
        text = recognize(tmp_path)
        return {"success": True, "text": text, "filename": filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"识别失败: {str(e)}")
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


@app.get("/health")
async def health_check():
    info = {"status": "ok", "engine": ASR_ENGINE}
    if ASR_ENGINE == "funasr":
        info["model"] = FUNASR_MODEL_ID
    else:
        info["model"] = str(MODEL_PATH)
    return info


if __name__ == "__main__":
    # host 默认 127.0.0.1(本机开发,不暴露到外网)
    # Docker 里 compose 会传 ASR_HOST=0.0.0.0 让容器外可访问
    uvicorn.run(
        "app:app",
        host=os.environ.get("ASR_HOST", "127.0.0.1"),
        port=int(os.environ.get("ASR_PORT", "8000")),
        reload=False,
    )
