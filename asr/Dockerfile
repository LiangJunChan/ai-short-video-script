FROM python:3.11-slim

# PyPI 走清华镜像(国内直连 pypi.org 会超时,尤其 asr 要下 torch)
# 境外部署时可覆盖: docker build --build-arg PIP_INDEX_URL=https://pypi.org/simple ...
ARG PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple
ARG PIP_TRUSTED_HOST=pypi.tuna.tsinghua.edu.cn
ENV PIP_INDEX_URL=${PIP_INDEX_URL}
ENV PIP_TRUSTED_HOST=${PIP_TRUSTED_HOST}

# 装 g++ 和 build-essential:funasr 的 editdistance 依赖没预编译 wheel,需要现场编 C++
# 完事后清 apt 缓存,不占镜像空间
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .

# 先装 CPU 版 torch(强制 index-url 覆盖,不拉 3GB CUDA 依赖)
# 本机 asr/.venv 验证过的版本: torch 2.11.0
RUN pip install --no-cache-dir \
    --index-url https://download.pytorch.org/whl/cpu \
    --extra-index-url ${PIP_INDEX_URL} \
    torch==2.11.0 torchaudio==2.11.0

# 再装其它依赖(torch 已装,pip 会跳过)
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

EXPOSE 8000

CMD ["python", "app.py"]
