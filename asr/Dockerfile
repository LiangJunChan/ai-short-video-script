FROM python:3.11-slim

# PyPI 走清华镜像(国内直连 pypi.org 会超时)
# 境外部署时可覆盖: docker build --build-arg PIP_INDEX_URL=https://pypi.org/simple ...
ARG PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple
ARG PIP_TRUSTED_HOST=pypi.tuna.tsinghua.edu.cn
ENV PIP_INDEX_URL=${PIP_INDEX_URL}
ENV PIP_TRUSTED_HOST=${PIP_TRUSTED_HOST}

# ffmpeg 用于把上传的 mp3/m4a/wav 解码成 16k 单声道 PCM 喂给 sherpa-onnx
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .
# 本地 int8 ONNX 模型(约 229MB)随镜像打包，无需运行时联网下载
COPY models/ ./models/

ENV MODEL_DIR=/app/models

EXPOSE 8000

CMD ["python", "app.py"]
