FROM python:3.11-slim

# ============================================================
# 引擎选择(构建期决定)
#   ASR_ENGINE=sherpa (默认): sherpa-onnx + int8 ONNX,低内存,模型打包进镜像
#   ASR_ENGINE=funasr        : funasr + torch,高内存,模型运行时下载
# 用法:
#   docker build --build-arg ASR_ENGINE=sherpa ...   (小内存机器/阿里云)
#   docker build --build-arg ASR_ENGINE=funasr ...   (MacBook 等)
# docker-compose.yml 通过 build.args 传入;bootstrap-docker.sh 按内存自动选。
# ============================================================
ARG ASR_ENGINE=sherpa
ENV ASR_ENGINE=${ASR_ENGINE}

# PyPI 走清华镜像(国内直连 pypi.org 会超时,funasr 要下 torch 尤甚)
# 境外部署时可覆盖: docker build --build-arg PIP_INDEX_URL=https://pypi.org/simple ...
ARG PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple
ARG PIP_TRUSTED_HOST=pypi.tuna.tsinghua.edu.cn
ENV PIP_INDEX_URL=${PIP_INDEX_URL}
ENV PIP_TRUSTED_HOST=${PIP_TRUSTED_HOST}

# apt 走清华镜像(国内直连 deb.debian.org 慢/卡)
# 境外部署时可覆盖: docker build --build-arg APT_MIRROR=deb.debian.org ...
ARG APT_MIRROR=mirrors.tuna.tsinghua.edu.cn

# 系统依赖:
#   - ffmpeg: sherpa 引擎解码音频成 PCM(funasr 也能用它读音频)
#   - build-essential: funasr 的 editdistance 无预编译 wheel,需现场编 C++
# 兼容 bookworm(/etc/apt/sources.list) 和 trixie(/etc/apt/sources.list.d/debian.sources)
RUN find /etc/apt -type f \( -name 'sources.list' -o -name '*.sources' \) \
      -exec sed -i "s|deb.debian.org|${APT_MIRROR}|g;s|security.debian.org|${APT_MIRROR}|g" {} + \
    && apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg \
      $([ "$ASR_ENGINE" = "funasr" ] && echo build-essential) \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.sherpa.txt requirements.funasr.txt ./

# 按引擎装依赖
RUN if [ "$ASR_ENGINE" = "funasr" ]; then \
        echo ">>> 安装 funasr 引擎依赖(含 CPU 版 torch)"; \
        pip install --no-cache-dir \
            --index-url https://download.pytorch.org/whl/cpu \
            --extra-index-url ${PIP_INDEX_URL} \
            torch==2.11.0 torchaudio==2.11.0 && \
        pip install --no-cache-dir -r requirements.funasr.txt; \
    else \
        echo ">>> 安装 sherpa 引擎依赖(低内存)"; \
        pip install --no-cache-dir -r requirements.sherpa.txt; \
    fi

COPY app.py .

# sherpa 引擎:把本地 int8 ONNX 模型(约229MB)打包进镜像,无需运行时联网下载。
# funasr 引擎:模型运行时由 modelscope 自动下载,这里不需要 models/。
# (models/ 目录始终 COPY,funasr 模式下忽略即可;若 models/ 不存在会报错,故用条件)
COPY models/ ./models/

ENV MODEL_DIR=/app/models

EXPOSE 8000

CMD ["python", "app.py"]
