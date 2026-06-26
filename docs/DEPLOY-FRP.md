# ai-short-video-script 远程访问部署文档

> 通过 frp 内网穿透，让阿里云主机可以访问本机运行的 AI 短视频脚本项目。

---

## 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│  你的 Mac (本机)                                              │
│                                                              │
│  ┌──────────────┐   ┌────────────┐   ┌──────────────┐       │
│  │ frontend     │   │ backend    │   │ asr          │       │
│  │ :5173        │   │ :3000      │   │ :8000        │       │
│  └──────┬───────┘   └─────┬──────┘   └──────┬───────┘       │
│         │                 │                 │               │
│  ┌──────▼─────────────────▼─────────────────▼───────┐        │
│  │              frpc (客户端)                        │        │
│  │              localhost:9001  →  阿里云:9001        │        │
│  │              localhost:9002  →  阿里云:9002        │        │
│  │              localhost:9003  →  阿里云:9003        │        │
│  └────────────────────────┬─────────────────────────┘        │
└────────────────────────────┼ TCP 隧道 ─────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  阿里云主机      │
                    │  8.138.243.181  │
                    │                 │
                    │  ┌────────────┐  │
                    │  │ frps       │  │
                    │  │ :7000      │  │
                    │  └────────────┘  │
                    │                 │
                    │  ┌────────────┐  │
                    │  │ nginx      │  │
                    │  │ :80        │  │
                    │  │ (反向代理)   │  │
                    │  └────────────┘  │
                    └─────────────────┘
                             │
                             ▼
                     浏览器访问
                     http://8.138.243.181
```

---

## 一、阿里云侧部署

### 1.1 前置条件

- 阿里云 ECS 或轻量应用服务器
- 已安装 wget/curl
- 已在阿里云控制台开放安全组：`TCP 7000`、`TCP 80`、`TCP 9000-9003`

### 1.2 安装 frps（服务端）

```bash
# SSH 登录阿里云
ssh root@8.138.243.181

# 进入工作目录
mkdir -p /opt/frp && cd /opt/frp

# 下载 frp（v0.61.1，amd64 架构）
wget https://github.com/fatedier/frp/releases/download/v0.61.1/frp_0.61.1_linux_amd64.tar.gz
tar -xzf frp_0.61.1_linux_amd64.tar.gz
cd frp_0.61.1_linux_amd64
```

### 1.3 编写 frps 配置

```bash
cat > frps.toml << 'EOF'
bindPort = 7000

auth.method = "token"
auth.token = "Chrdw060922"

# 允许 frpc 映射的远程端口
allowPorts = [
  { start = 9000, end = 9003 }
]
EOF
```

### 1.4 编写 nginx 反向代理配置

```bash
cat > /etc/nginx/conf.d/ai-short-video.conf << 'EOF'
server {
    listen 80;
    server_name _;

    # 前端静态资源（Vite HMR WebSocket）
    location / {
        proxy_pass http://127.0.0.1:9001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # API 请求 → 后端 Go
    location /api/ {
        proxy_pass http://127.0.0.1:9002/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # 上传文件
    location /uploads/ {
        proxy_pass http://127.0.0.1:9002/uploads/;
        proxy_set_header Host $host;
    }

    # 缩略图
    location /thumbnails/ {
        proxy_pass http://127.0.0.1:9002/thumbnails/;
        proxy_set_header Host $host;
    }

    # ASR 服务（内部）
    location /asr/ {
        proxy_pass http://127.0.0.1:9003/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF
```

### 1.5 启动服务

```bash
# 启动 frps（后台运行）
nohup ./frps -c frps.toml > frps.log 2>&1 &

# 验证 frps 启动成功
ps aux | grep frps | grep -v grep
# 应看到类似输出：frps -c frps.toml

# 重载 nginx 配置
nginx -t && nginx -s reload
```

### 1.6 配置开机自启（systemd）

```bash
cat > /etc/systemd/system/frps.service << 'EOF'
[Unit]
Description=frp server
After=network.target

[Service]
Type=simple
ExecStart=/opt/frp/frp_0.61.1_linux_amd64/frps -c /opt/frp/frp_0.61.1_linux_amd64/frps.toml
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable frps
systemctl start frps
```

### 1.7 安全组开放（阿里云控制台操作）

登录阿里云控制台 → ECS → 安全组 → 添加入方向规则：

| 协议 | 端口范围 | 来源 |
|------|---------|------|
| TCP | 7000 | 0.0.0.0/0 |
| TCP | 80 | 0.0.0.0/0 |
| TCP | 9000-9003 | 0.0.0.0/0 |

---

## 二、本机侧部署

### 2.1 安装 frpc（客户端）

```bash
# 进入项目目录
cd /Users/chenliangjun/code/project/ai-short-video-script

# 下载 frpc（v0.61.1，arm64 Mac）
wget https://github.com/fatedier/frp/releases/download/v0.61.1/frp_0.61.1_darwin_arm64.tar.gz
tar -xzf frp_0.61.1_darwin_arm64.tar.gz
cd frp_0.61.1_darwin_arm64
```

### 2.2 编写 frpc 配置

```bash
cat > frpc.toml << 'EOF'
serverAddr = "8.138.243.181"
serverPort = 7000

auth.method = "token"
auth.token = "Chrdw060922"

[[proxies]]
name = "frontend"
type = "tcp"
localIP = "127.0.0.1"
localPort = 5173
remotePort = 9001

[[proxies]]
name = "backend"
type = "tcp"
localIP = "127.0.0.1"
localPort = 3000
remotePort = 9002

[[proxies]]
name = "asr"
type = "tcp"
localIP = "127.0.0.1"
localPort = 8000
remotePort = 9003
EOF
```

### 2.3 启动 frpc

```bash
cd frp_0.61.1_darwin_arm64
./frpc -c frpc.toml
```

看到类似日志说明连接成功：
```
login to server success, frpc udp port ... ...
```

### 2.4 启动项目服务

```bash
# 新开终端窗口，进入项目目录
cd /Users/chenliangjun/code/project/ai-short-video-script

# 方式一：Docker 部署（推荐，一键启动所有服务）
docker compose up --build

# 方式二：分别启动（开发调试用）
make dev-asr    # 终端1：ASR 服务
make dev-backend # 终端2：Go 后端
make dev-frontend # 终端3：前端
```

### 2.5 配置本机启动脚本（可选）

```bash
# 在项目 frpc 目录下创建启动脚本
cat > start-remote.sh << 'EOF'
#!/bin/bash
set -e

FRP_DIR="/Users/chenliangjun/code/project/ai-short-video-script/frp_0.61.1_darwin_arm64"
PROJECT_DIR="/Users/chenliangjun/code/project/ai-short-video-script"

echo "[1/3] 启动 frpc 隧道..."
cd "$FRP_DIR"
./frpc -c frpc.toml &
FRPC_PID=$!

sleep 2

echo "[2/3] 等待隧道就绪..."
curl -s http://127.0.0.1:9001 > /dev/null && echo "  frontend 隧道 OK" || echo "  frontend 隧道异常"
curl -s http://127.0.0.1:9002 > /dev/null && echo "  backend 隧道 OK" || echo "  backend 隧道异常"
curl -s http://127.0.0.1:9003 > /dev/null && echo "  asr 隧道 OK" || echo "  asr 隧道异常"

echo "[3/3] 启动 docker 服务..."
cd "$PROJECT_DIR"
docker compose up --build

# 清理
trap "kill $FRPC_PID 2>/dev/null" EXIT
EOF

chmod +x start-remote.sh
```

---

## 三、访问验证

| 服务 | 地址 |
|------|------|
| **前端** | `http://8.138.243.181` |
| **后端 API** | `http://8.138.243.181/api/...` |
| **上传文件** | `http://8.138.243.181/uploads/...` |

---

## 四、排查问题

### 4.1 frpc 连不上阿里云

```bash
# 本机测试连通性
telnet 8.138.243.181 7000

# 阿里云检查端口是否监听
ssh root@8.138.243.181 "ss -tlnp | grep frps"
```

### 4.2 nginx 502 Bad Gateway

```bash
# 确认 frpc 隧道正常
curl http://127.0.0.1:9001

# 确认 docker 服务都启动
docker compose ps
```

### 4.3 安全组未开放

登录阿里云控制台 → ECS → 安全组 → 添加入方向规则：

| 协议 | 端口范围 | 来源 |
|------|---------|------|
| TCP | 7000 | 0.0.0.0/0 |
| TCP | 80 | 0.0.0.0/0 |
| TCP | 9000-9003 | 0.0.0.0/0 |

---

## 五、停止服务

```bash
# 本机：停止 docker
docker compose down

# 本机：停止 frpc
pkill -f "frpc -c"

# 阿里云：停止 frps
ssh root@8.138.243.181 "systemctl stop frps"
```
