# One API 前后端分离部署方案

> 本方案将前端和后端分开部署，适合需要分别管理前端后端基础设施的团队

## 架构概览

```
                          ┌─────────────────┐
                          │   Nginx         │
                          │   (端口 80/443) │
                          └────────┬────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ▼                    ▼                    ▼
     ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
     │  前端容器      │  │  后端 API      │  │  数据库       │
     │  (React+Nginx) │  │  (Go)          │  │  (MySQL)       │
     │  端口: 8080    │  │  端口: 3000    │  │  端口: 3306   │
     └────────────────┘  └────────────────┘  └────────────────┘
```

## 1. 准备工作

### 1.1 创建目录结构

```bash
mkdir -p one-api-deploy/{backend,frontend,mysql,nginx}
```

### 1.2 准备配置文件

创建 `one-api-deploy/backend/.env`：

```bash
# 数据库配置 (使用下面 mysql 容器的服务名)
SQL_DSN=root:one_api_pass@tcp(mysql:3306)/oneapi

# 会话密钥 (生产环境请使用复杂的随机字符串)
SESSION_SECRET=your-secret-key-change-in-production

# Redis (可选，生产环境建议配置)
# REDIS_CONN_STRING=redis://redis:6379

# 允许跨域的前端地址
CORS_ALLOWED_ORIGINS=http://localhost:8080

# 其他配置
TZ=Asia/Shanghai
LOG_DIR=/app/logs
```

创建 `one-api-deploy/nginx/nginx.conf`：

```nginx
# 前端配置
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名

    # 前端静态文件
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api/ {
        proxy_pass http://backend:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # OpenAI 兼容 API 代理
    location /v1/ {
        proxy_pass http://backend:3000/v1/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 流式响应支持
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
    }

    # WebSocket 支持 (如需要)
    location /ws/ {
        proxy_pass http://backend:3000/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

## 2. 创建 Docker 镜像

### 2.1 后端镜像

创建 `one-api-deploy/backend/Dockerfile`：

```dockerfile
# 构建阶段
FROM golang:1.21-alpine AS builder

WORKDIR /build

# 安装构建依赖
RUN apk add --no-cache git

# 复制源码
COPY . .

# 构建前端 (如果需要嵌入前端，取消注释)
# RUN cd web/default && npm install && npm run build

# 构建后端
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags "-s -w" -o one-api .

# 运行阶段
FROM alpine:latest

WORKDIR /app

# 安装运行时依赖
RUN apk add --no-cache ca-certificates tzdata

# 复制构建产物
COPY --from=builder /build/one-api .

# 创建日志目录
RUN mkdir -p /app/logs

# 设置环境变量
ENV TZ=Asia/Shanghai
ENV PORT=3000

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["./one-api"]
```

### 2.2 前端镜像

创建 `one-api-deploy/frontend/Dockerfile`：

```dockerfile
# 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

# 复制 package.json 和依赖
COPY web/default/package.json web/default/package-lock.json* ./

# 安装依赖
RUN npm ci --legacy-peer-deps

# 复制源码
COPY web/default/src ./src
COPY web/default/public ./public
COPY web/default/package.json ./

# 构建
RUN REACT_APP_SERVER=http://localhost:3000 npm run build

# 运行阶段
FROM nginx:alpine

# 复制构建产物
COPY --from=builder /app/build /usr/share/nginx/html

# 复制 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

## 3. 使用 Docker Compose 部署

创建 `one-api-deploy/docker-compose.yml`：

```yaml
version: '3.8'

services:
  # MySQL 数据库
  mysql:
    image: mysql:8.0
    container_name: one-api-mysql
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: one_api_pass
      MYSQL_DATABASE: oneapi
      MYSQL_USER: oneapi
      MYSQL_PASSWORD: one_api_pass
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"
    networks:
      - one-api-network
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-pone_api_pass"]
      interval: 10s
      timeout: 5s
      retries: 5

  # 后端 API
  backend:
    build:
      context: ..
      dockerfile: backend/Dockerfile
    container_name: one-api-backend
    restart: always
    environment:
      - SQL_DSN=root:one_api_pass@tcp(mysql:3306)/oneapi
      - SESSION_SECRET=your-secret-key-change-in-production
      - TZ=Asia/Shanghai
    depends_on:
      mysql:
        condition: service_healthy
    volumes:
      - ./backend/logs:/app/logs
    ports:
      - "3000:3000"
    networks:
      - one-api-network

  # 前端
  frontend:
    build:
      context: ..
      dockerfile: frontend/Dockerfile
    container_name: one-api-frontend
    restart: always
    ports:
      - "8080:80"
    networks:
      - one-api-network
    depends_on:
      - backend

  # Nginx 反向代理 (可选，已包含在前端镜像)
  # nginx:
  #   image: nginx:alpine
  #   container_name: one-api-nginx
  #   restart: always
  #   ports:
  #     - "80:80"
  #     - "443:443"
  #   volumes:
  #     - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
  #   networks:
  #     - one-api-network
  #   depends_on:
  #     - frontend
  #     - backend

volumes:
  mysql_data:

networks:
  one-api-network:
    driver: bridge
```

## 4. 部署步骤

### 4.1 一键部署

```bash
cd one-api-deploy

# 构建并启动所有服务
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 查看服务状态
docker-compose ps
```

### 4.2 访问服务

- 前端界面: http://localhost:8080
- API 端点: http://localhost:3000
- API 文档: http://localhost:8080/docs (如启用)

### 4.3 初始登录

```
用户名: root
密码: 123456
```

⚠️ **首次登录后请立即修改密码！**

## 5. 运维命令

```bash
# 重新构建并启动
docker-compose up -d --build

# 查看后端日志
docker-compose logs -f backend

# 查看前端日志
docker-compose logs -f frontend

# 重启服务
docker-compose restart

# 停止服务
docker-compose down

# 停止并删除数据卷 (危险！)
docker-compose down -v
```

## 6. 生产环境配置建议

### 6.1 安全加固

```yaml
# docker-compose.yml 添加
services:
  backend:
    environment:
      - NODE_TYPE=master
      - REDIS_CONN_STRING=redis://redis:6379  # 建议添加 Redis
      - SYNC_FREQUENCY=60                       # 配置同步频率
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
```

### 6.2 添加 Redis (可选)

```yaml
  redis:
    image: redis:7-alpine
    container_name: one-api-redis
    restart: always
    networks:
      - one-api-network
```

### 6.3 HTTPS 配置

修改 `nginx.conf` 添加 SSL：

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    # ... 其余配置
}

# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

### 6.4 定时备份数据库

创建 `backup.sh`：

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec one-api-mysql mysqldump -u root -pone_api_pass oneapi > backup_$DATE.sql
# 保留最近 7 天的备份
find . -name "backup_*.sql" -mtime +7 -delete
```

添加 crontab：
```bash
crontab -e
0 2 * * * /path/to/backup.sh
```

## 7. 常见问题排查

| 问题 | 解决方法 |
|------|---------|
| 前端 502 错误 | 检查 backend 是否启动 `docker-compose ps` |
| 数据库连接失败 | 检查 SQL_DSN 配置和 mysql 服务状态 |
| 前端静态资源 404 | 检查 nginx 配置和构建产物是否存在 |
| API 跨域错误 | 检查 CORS_ALLOWED_ORIGINS 配置 |
| 上传文件失败 | 检查 nginx client_max_body_size 配置 |

## 8. 快速命令参考

```bash
# 启动所有服务
docker-compose up -d

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 重启后端
docker-compose restart backend

# 进入后端容器调试
docker-compose exec backend sh

# 进入数据库
docker-compose exec mysql mysql -u root -p

# 重新构建前端
docker-compose build frontend && docker-compose up -d frontend

# 完整重建
docker-compose down && docker-compose up -d --build
```