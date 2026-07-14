# backend/Dockerfile
# 多阶段构建：
#   1) golang builder —— 需要 CGO(go-sqlite3),用 debian 而非 alpine
#   2) runtime —— python 3.13 slim + playwright + chromium + ffmpeg + Go 二进制

# ============================================================
# Stage 1: build Go binary
# ============================================================
FROM golang:1.21-bookworm AS gobuilder

# GOPROXY 走国内镜像(七牛云 goproxy.cn / 阿里云 mirrors.aliyun.com)
# 默认 proxy.golang.org 在国内不可达,不设置会 i/o timeout
# 境外部署时可覆盖: docker build --build-arg GOPROXY=direct ...
ARG GOPROXY=https://goproxy.cn,https://mirrors.aliyun.com/goproxy/,direct
ARG GOSUMDB=sum.golang.google.cn
ENV GOPROXY=${GOPROXY}
ENV GOSUMDB=${GOSUMDB}

# apt 走清华镜像(国内直连 deb.debian.org 慢/卡)
# 境外部署时可覆盖: docker build --build-arg APT_MIRROR=deb.debian.org ...
ARG APT_MIRROR=mirrors.tuna.tsinghua.edu.cn

WORKDIR /src

# 只 CGO 需要的最小系统包(sqlite3 走 go-sqlite3,自带 amalgamation,只要 gcc)
# 兼容 bookworm(/etc/apt/sources.list) 和 trixie(/etc/apt/sources.list.d/debian.sources)
RUN find /etc/apt -type f \( -name 'sources.list' -o -name '*.sources' \) \
      -exec sed -i "s|deb.debian.org|${APT_MIRROR}|g;s|security.debian.org|${APT_MIRROR}|g" {} + \
    && apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libc6-dev \
    && rm -rf /var/lib/apt/lists/*

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# CGO_ENABLED=1 是 go-sqlite3 必须的
RUN CGO_ENABLED=1 GOOS=linux go build -o /out/backend .

# ============================================================
# Stage 2: runtime
# ============================================================
FROM python:3.13-slim AS runtime

# PyPI 走清华镜像(国内直连 pypi.org 特别慢或不通)
# 境外部署时可覆盖: docker build --build-arg PIP_INDEX_URL=https://pypi.org/simple ...
ARG PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple
ARG PIP_TRUSTED_HOST=pypi.tuna.tsinghua.edu.cn
ENV PIP_INDEX_URL=${PIP_INDEX_URL}
ENV PIP_TRUSTED_HOST=${PIP_TRUSTED_HOST}

# apt 走清华镜像(国内直连 deb.debian.org 慢/卡)
# 境外部署时可覆盖: docker build --build-arg APT_MIRROR=deb.debian.org ...
ARG APT_MIRROR=mirrors.tuna.tsinghua.edu.cn

WORKDIR /app

# 系统依赖:
#   - ffmpeg + ffprobe: 视频缩略图 / 时长
#   - ca-certificates: HTTPS 请求
#   - 其他: playwright install --with-deps 会自动装 chromium 的系统库
RUN find /etc/apt -type f \( -name 'sources.list' -o -name '*.sources' \) \
      -exec sed -i "s|deb.debian.org|${APT_MIRROR}|g;s|security.debian.org|${APT_MIRROR}|g" {} + \
    && apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 装 playwright + chromium + headless-shell
# 注意:playwright 1.49+ 用小型 chromium-headless-shell 二进制跑 headless=True
# 只装 chromium 不装 headless-shell 会在运行时报 "Executable doesn't exist"
# --with-deps 会自动 apt-get 需要的 libnss3 等系统库
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt \
    && python -m playwright install --with-deps chromium chromium-headless-shell \
    && rm -rf /root/.cache/pip

# 复制 Go 二进制 + 抖音提取脚本
COPY --from=gobuilder /out/backend /app/backend
COPY extract_douyin.py /app/extract_douyin.py

# 告诉 Go 用容器里的 python(而不是硬编码 python3),同时告诉 py 脚本自身在容器里
ENV PYTHON_BIN=/usr/local/bin/python
ENV DOCKER=1
# playwright 默认下载到 root user cache,容器 root 运行时保持这个路径
ENV PLAYWRIGHT_BROWSERS_PATH=/root/.cache/ms-playwright

# 上传/缩略图/音频目录挂 volume(通过 docker-compose)
RUN mkdir -p /uploads /thumbnails /audio /thumbnails/square

EXPOSE 3000

# Go 端 main.go 里 uploadDirs 用相对路径 "../uploads",
# 而容器里 backend 二进制在 /app,所以工作目录要相对结构一致
WORKDIR /app
CMD ["/app/backend"]
