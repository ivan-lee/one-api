# One-API 构建与部署指南

## 📋 目录

- [快速开始](#快速开始)
- [构建脚本说明](#构建脚本说明)
- [完整构建流程](#完整构建流程)
- [部署方式](#部署方式)
- [故障排查](#故障排查)

---

## 🚀 快速开始

### 一键构建并启动

```bash
# 1. 构建项目
./build-all.sh

# 2. 启动服务
./start.sh

# 3. 访问系统
open http://localhost:3000
```

**默认账号**：
- 用户名：`root`
- 密码：`123456`

---

## 🛠️ 构建脚本说明

项目提供了 4 个自动化脚本，简化构建和部署流程：

| 脚本 | 用途 | 使用方法 |
|------|------|----------|
| `build-all.sh` | 完整构建（前端 + 后端） | `./build-all.sh` |
| `start.sh` | 启动服务 | `./start.sh [-f]` |
| `stop.sh` | 停止服务 | `./stop.sh` |
| `restart.sh` | 重启服务 | `./restart.sh` |

---

### build-all.sh - 完整构建脚本

**功能**：
1. ✅ 检查构建环境（Node.js、npm、Go）
2. ✅ 清理旧的构建文件
3. ✅ 安装前端依赖
4. ✅ 构建前端资源
5. ✅ 编译后端二进制
6. ✅ 验证构建结果

**使用方法**：
```bash
# 执行完整构建
./build-all.sh

# 构建输出示例
[INFO] ==========================================
[INFO] One-API 构建脚本
[INFO] ==========================================

[STEP] 清理旧文件...
[INFO] ✓ 清理 web/default/build

[STEP] 检查构建环境...
[INFO] ✓ Node.js: v25.2.1
[INFO] ✓ npm: 11.6.2
[INFO] ✓ Go: go version go1.26.1

[STEP] 构建前端...
[INFO] 安装前端依赖...
[INFO] 构建 default 主题...
[INFO] ✓ 前端构建成功

[STEP] 编译后端...
[INFO] 版本：v0.0.0
[INFO] 编译 one-api...
[INFO] ✓ 后端编译成功
[INFO] ✓ 前端资源已嵌入（文件大小：50M）

[INFO] ==========================================
[INFO] 构建完成！
[INFO] ==========================================
```

**构建产物**：
- `one-api` - 可执行文件（包含前端资源）
- `web/build/default/` - 前端构建文件

---

### start.sh - 启动脚本

**功能**：
1. ✅ 检查依赖服务（MySQL、Redis）
2. ✅ 加载环境变量（从 `.env` 文件）
3. ✅ 停止旧进程（避免端口冲突）
4. ✅ 启动 one-api 服务
5. ✅ 验证服务健康状态
6. ✅ 显示访问信息

**使用方法**：
```bash
# 后台启动（默认）
./start.sh

# 前台启动（查看实时日志）
./start.sh -f

# 重启模式（先停止再启动）
./start.sh -s

# 显示帮助
./start.sh --help
```

**启动输出示例**：
```
[INFO] ==========================================
[INFO] One-API 快速启动
[INFO] ==========================================

[INFO] 加载环境变量...
[INFO] ✓ 已加载 .env 文件
[INFO] 检查依赖服务...
[INFO] ✓ MySQL 容器运行中
[INFO] ✓ Redis 容器运行中

[INFO] 启动 one-api 服务...
[INFO] 端口：3000
[INFO] 日志目录：./logs

[INFO] 后台运行模式
[INFO] ✓ one-api 启动成功 (PID: 15525)

[INFO] 验证服务...
[INFO] ✓ API 接口正常
[INFO] ✓ 前端页面正常

[INFO] ==========================================
[INFO] one-api 服务状态
[INFO] ==========================================

[INFO] 访问地址：http://localhost:3000
[INFO] 登录账号：root / 123456

[INFO] 管理命令：
  查看日志：tail -f logs/oneapi-*.log
  停止服务：./stop.sh
  重启服务：./restart.sh

[INFO] ⚠️  首次登录后请立即修改默认密码！
```

---

### stop.sh - 停止脚本

**功能**：
1. ✅ 安全停止 one-api 进程
2. ✅ 验证进程已完全停止
3. ✅ 强制停止（如有必要）

**使用方法**：
```bash
./stop.sh
```

---

### restart.sh - 重启脚本

**功能**：
1. ✅ 调用 `stop.sh` 停止服务
2. ✅ 调用 `start.sh` 启动服务

**使用方法**：
```bash
./restart.sh
```

---

## 📦 完整构建流程

### 方式一：自动化脚本（推荐）

```bash
# 1. 执行构建
./build-all.sh

# 2. 启动服务
./start.sh
```

### 方式二：手动分步构建

#### 步骤 1：构建前端

```bash
cd web/default

# 安装依赖
npm install --legacy-peer-deps

# 构建主题
DISABLE_ESLINT_PLUGIN='true' npm run build

# 验证构建
ls -lh ../../web/build/default/index.html
```

#### 步骤 2：编译后端

```bash
cd ../..

# 获取版本号
version=$(git describe --tags 2>/dev/null || echo "v0.0.0")

# 编译（嵌入前端资源）
go build -ldflags "-s -w -X 'github.com/songquanpeng/one-api/common.Version=$version'" -o one-api

# 验证编译
ls -lh one-api
```

#### 步骤 3：启动服务

```bash
# 设置环境变量
export SQL_DSN="oneapi:OneAPI@2026@tcp(localhost:3306)/one-api"
export REDIS_CONN_STRING="redis://localhost:6379"
export SYNC_FREQUENCY=60
export SESSION_SECRET="your_random_secret"

# 启动
./one-api --port 3000 --log-dir ./logs
```

---

## 🔧 部署方式

### 方式一：直接运行（开发环境）

```bash
# 构建
./build-all.sh

# 启动
./start.sh
```

**优点**：
- 快速迭代
- 调试方便
- 无需 Docker

**缺点**：
- 需要手动管理依赖
- 不适合生产环境

---

### 方式二：Docker Compose（生产环境）

创建 `docker-compose.prod.yml`：

```yaml
version: '3.8'

services:
  one-api:
    image: justsong/one-api:latest
    container_name: one-api
    restart: always
    ports:
      - "3000:3000"
    environment:
      - SQL_DSN=oneapi:password@tcp(db:3306)/one-api
      - REDIS_CONN_STRING=redis://redis
      - SESSION_SECRET=your_secret_key
      - SYNC_FREQUENCY=60
    depends_on:
      - db
      - redis
    volumes:
      - ./logs:/app/logs

  db:
    image: mysql:8.2.0
    container_name: mysql
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: RootPassword123
      MYSQL_USER: oneapi
      MYSQL_PASSWORD: OneAPI@2026
      MYSQL_DATABASE: one-api
    volumes:
      - mysql_data:/var/lib/mysql

  redis:
    image: redis:latest
    container_name: redis
    restart: always
    volumes:
      - redis_data:/data

volumes:
  mysql_data:
  redis_data:
```

**启动**：
```bash
docker-compose -f docker-compose.prod.yml up -d
```

**优点**：
- 一键部署
- 服务隔离
- 数据持久化
- 易于扩展

---

### 方式三：Systemd 服务（生产环境）

创建服务文件 `/etc/systemd/system/one-api.service`：

```ini
[Unit]
Description=One API Service
After=network.target mysql.service redis.service

[Service]
Type=simple
User=oneapi
WorkingDirectory=/opt/one-api
EnvironmentFile=/opt/one-api/.env
ExecStart=/opt/one-api/one-api --port 3000 --log-dir /opt/one-api/logs
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**启用服务**：
```bash
# 复制文件
sudo cp one-api.service /etc/systemd/system/

# 重载 systemd
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start one-api

# 设置开机自启
sudo systemctl enable one-api

# 查看状态
sudo systemctl status one-api
```

**优点**：
- 系统级管理
- 自动重启
- 日志集成（journalctl）
- 开机自启

---

## ⚙️ 环境配置

### .env 文件配置

创建 `.env` 文件（参考 `.env.production`）：

```bash
# 数据库配置
SQL_DSN="oneapi:OneAPI@2026@tcp(localhost:3306)/one-api"

# Redis 配置
REDIS_CONN_STRING="redis://localhost:6379"
SYNC_FREQUENCY=60

# 会话密钥（必须修改为随机字符串）
SESSION_SECRET="your_random_secret_32_characters"

# 性能优化
MEMORY_CACHE_ENABLED=true
BATCH_UPDATE_ENABLED=true
BATCH_UPDATE_INTERVAL=5

# 基础配置
PORT=3000
TZ=Asia/Shanghai
THEME=default
DEBUG=false
```

### 生成随机 SESSION_SECRET

```bash
# 方法 1：使用 openssl
openssl rand -base64 32

# 方法 2：使用 head 和 md5
head -c 32 /dev/urandom | md5sum

# 方法 3：使用 Python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## 🎯 部署检查清单

### 构建阶段

- [ ] Node.js 已安装（v16+）
- [ ] npm 已安装
- [ ] Go 已安装（v1.20+）
- [ ] 前端构建成功（`web/build/default/index.html` 存在）
- [ ] 后端编译成功（`one-api` 文件大小>30MB）
- [ ] 前端资源已嵌入（检查文件大小）

### 部署前准备

- [ ] MySQL 已安装并创建数据库
- [ ] Redis 已安装并可连接
- [ ] `.env` 文件已配置
- [ ] `SESSION_SECRET` 已修改为随机值
- [ ] 日志目录有写入权限

### 启动验证

- [ ] 服务启动成功（无 FATAL 错误）
- [ ] 端口 3000 正常监听
- [ ] API 接口可访问（`/api/status`）
- [ ] 前端页面可访问（`/`）
- [ ] 数据库连接正常
- [ ] Redis 连接正常

### 安全配置

- [ ] 默认密码已修改
- [ ] SESSION_SECRET 已设置
- [ ] .env 文件权限已限制（chmod 600）
- [ ] 防火墙已配置
- [ ] HTTPS 已配置（生产环境）

---

## 🔍 故障排查

### 构建问题

#### 前端构建失败

**错误**：`npm install` 失败

**解决**：
```bash
# 使用 legacy-peer-deps
npm install --legacy-peer-deps

# 或强制安装
npm install --force
```

#### 后端编译失败

**错误**：`package not found`

**解决**：
```bash
# 下载依赖
go mod download

# 清理缓存
go clean -modcache

# 重新编译
go build -o one-api
```

---

### 启动问题

#### 数据库连接失败

**错误**：`dial tcp: lookup mysql: no such host`

**原因**：使用了 Docker 网络名但直接运行

**解决**：
```bash
# 修改 .env
SQL_DSN="oneapi:password@tcp(localhost:3306)/one-api"
# 而不是
# SQL_DSN="oneapi:password@tcp(mysql:3306)/one-api"
```

#### 端口被占用

**错误**：`bind: address already in use`

**解决**：
```bash
# 查看占用进程
lsof -i :3000

# 停止占用进程
kill -9 <PID>

# 或修改端口
export PORT=3001
./start.sh
```

#### 前端页面空白

**错误**：访问页面返回空内容

**原因**：二进制文件未嵌入前端资源

**解决**：
```bash
# 1. 确保前端已构建
ls -la web/build/default/index.html

# 2. 重新编译后端
./build-all.sh

# 3. 重启服务
./restart.sh
```

---

### 运行问题

#### 登录后被踢出

**原因**：SESSION_SECRET 未设置或重启后变化

**解决**：
```bash
# 在 .env 中设置固定的 SESSION_SECRET
SESSION_SECRET="your_fixed_secret_key"

# 重启服务
./restart.sh
```

#### Redis 连接失败

**错误**：`Redis connection failed`

**解决**：
```bash
# 检查 Redis 是否运行
docker ps | grep redis

# 测试连接
redis-cli ping

# 修改配置（如果不使用 Redis）
# 注释掉 REDIS_CONN_STRING
```

---

## 📊 性能优化

### 数据库优化

```bash
# 连接池配置
SQL_MAX_IDLE_CONNS=100
SQL_MAX_OPEN_CONNS=1000
SQL_CONN_MAX_LIFETIME=60
```

### 缓存优化

```bash
# 启用内存缓存
MEMORY_CACHE_ENABLED=true

# 启用批量更新
BATCH_UPDATE_ENABLED=true
BATCH_UPDATE_INTERVAL=5

# Redis 同步频率
SYNC_FREQUENCY=60
```

### 高并发配置

```bash
# 速率限制
GLOBAL_API_RATE_LIMIT=1000
GLOBAL_WEB_RATE_LIMIT=500

# 渠道监控
CHANNEL_TEST_FREQUENCY=60
ENABLE_METRIC=true
```

---

## 📞 获取帮助

- **GitHub**: https://github.com/songquanpeng/one-api
- **Issues**: https://github.com/songquanpeng/one-api/issues
- **部署教程**: https://iamazing.cn/page/how-to-deploy-a-website

---

## 📝 更新日志

- **2026-03-22**: 添加自动化构建脚本（build-all.sh, start.sh, stop.sh, restart.sh）
