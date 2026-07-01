# frontend/Dockerfile
# 多阶段:node 构建产物 → nginx serve + /api 反代到 backend
#
# Node 版本注意:pnpm 11+ 要 Node 22.13+;pnpm 版本由 package.json 的
# packageManager 字段声明(当前 pnpm@10.33.0),corepack 会自动读取并装对
FROM node:22-alpine AS builder

WORKDIR /app

# 让 corepack 从 package.json 读 packageManager 字段自动装对版本
# --activate 让 pnpm 命令立即可用
RUN corepack enable

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# ============================================================
# Serve stage
# ============================================================
FROM nginx:1.27-alpine AS runtime

# 静态资源
COPY --from=builder /app/dist /usr/share/nginx/html

# nginx 配置(反代 /api → backend 容器)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
