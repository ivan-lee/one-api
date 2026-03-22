# One-API 访问问题排查与解决

## 📋 问题描述

用户报告无法通过 `http://localhost:3000/` 访问 one-api 项目页面。

---

## 🔍 排查过程

### 1. 检查服务状态 ✅

```bash
# 进程运行正常
ps aux | grep one-api
# 输出：one-api 进程存在

# 端口监听正常
lsof -i :3000
# 输出：one-api 正在监听端口 3000
```

**结论**: 服务进程运行正常，端口监听正常。

---

### 2. 检查 API 接口 ✅

```bash
curl http://localhost:3000/api/status
# 返回：{"success": true, "data": {...}}
```

**结论**: API 接口工作正常，后端服务无问题。

---

### 3. 检查前端页面 ❌

```bash
curl http://localhost:3000/
# 返回：空内容
```

查看日志发现前端构建目录为空：
```bash
ls -la web/build/
# 输出：只有 .gitkeep 文件，没有构建产物
```

**问题 1**: **前端未构建** - `web/build/` 目录为空

---

### 4. 构建前端 ⚠️

执行前端构建：
```bash
cd web/default
npm install --legacy-peer-deps
DISABLE_ESLINT_PLUGIN='true' npm run build
```

构建成功，生成了 `web/build/default/index.html`。

**但是**，重启服务后页面仍然返回空内容。

查看日志发现：
```
[FATAL] failed to initialize database: dial tcp: lookup mysql: no such host
```

**问题 2**: **数据库连接配置错误** - 使用了 Docker 网络主机名 `mysql`，但实际是直接运行，需要使用 `localhost`

---

### 5. 修复数据库配置 ✅

修改 `.env` 文件：
```bash
# 修改前
SQL_DSN="oneapi:OneAPI@2026@tcp(mysql:3306)/one-api"
REDIS_CONN_STRING="redis://redis:6379"

# 修改后
SQL_DSN="oneapi:OneAPI@2026@tcp(localhost:3306)/one-api"
REDIS_CONN_STRING="redis://localhost:6379"
```

服务成功启动，但页面仍然返回空内容（Content-Length: 0）。

---

### 6. 检查二进制文件嵌入 ❌

查看 HTTP 响应头：
```bash
curl -v http://localhost:3000/
# 输出：Content-Length: 0
```

**问题 3**: **二进制文件未嵌入前端** - one-api 使用 `//go:embed web/build/*` 嵌入前端文件，但之前的二进制文件是在前端构建**之前**编译的，因此没有包含前端文件。

---

## ✅ 最终解决方案

### 步骤 1：构建前端

```bash
cd web/default
npm install --legacy-peer-deps
DISABLE_ESLINT_PLUGIN='true' npm run build
```

**输出**：
```
Creating an optimized production build...
Compiled successfully.

File sizes after gzip:
  294.21 kB  build/static/js/main.41df0ac1.js
  99.1 kB    build/static/css/main.722059cf.css
```

---

### 步骤 2：重新编译后端

```bash
cd /Users/shichenhao/Documents/code/one-api
go build -ldflags "-s -w -X 'github.com/songquanpeng/one-api/common.Version=$(git describe --tags)'" -o one-api
```

**重要**：必须在前端构建**之后**重新编译，这样 `//go:embed web/build/*` 才能正确嵌入前端文件。

---

### 步骤 3：修复数据库配置

```bash
# 编辑 .env 文件
vi .env

# 修改为 localhost
SQL_DSN="oneapi:OneAPI@2026@tcp(localhost:3306)/one-api"
REDIS_CONN_STRING="redis://localhost:6379"
```

---

### 步骤 4：启动服务

```bash
# 停止旧进程
pkill -9 one-api

# 设置环境变量并启动
export SQL_DSN="oneapi:OneAPI@2026@tcp(localhost:3306)/one-api"
export REDIS_CONN_STRING="redis://localhost:6379"
export SYNC_FREQUENCY=60
export SESSION_SECRET="n+FAhn6VFXrgcR3CjS57ehPzMjMy3z70dyFJJXurj3Y="
export MEMORY_CACHE_ENABLED=true
export BATCH_UPDATE_ENABLED=true

nohup ./one-api --port 3000 --log-dir ./logs > /dev/null 2>&1 &
```

---

### 步骤 5：验证

```bash
# 检查进程
ps aux | grep one-api

# 检查端口
lsof -i :3000

# 测试 API
curl http://localhost:3000/api/status

# 测试页面
curl http://localhost:3000/
```

**期望输出**：
```html
<!doctype html>
<html lang="zh-CN">
<head>
    <title>One API</title>
    ...
</head>
<body>
    <div id="root"></div>
</body>
</html>
```

---

## 📊 问题总结

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| **前端空白** | `web/build/` 目录为空 | 执行 `npm run build` |
| **数据库连接失败** | 使用 Docker 网络名 `mysql` | 改为 `localhost` |
| **页面返回空内容** | 二进制文件未嵌入前端 | 重新编译后端 |

---

## 🎯 快速修复脚本

```bash
#!/bin/bash
# 一键修复脚本

set -e

echo "=== 构建前端 ==="
cd web/default
npm install --legacy-peer-deps
DISABLE_ESLINT_PLUGIN='true' npm run build
cd ../..

echo "=== 重新编译后端 ==="
go build -ldflags "-s -w" -o one-api

echo "=== 修复配置 ==="
sed -i '' 's/tcp(mysql:3306)/tcp(localhost:3306)/g' .env
sed -i '' 's/redis:\/\/redis:/redis:\/\/localhost:/g' .env

echo "=== 重启服务 ==="
pkill -9 one-api || true
sleep 2

export SQL_DSN="oneapi:OneAPI@2026@tcp(localhost:3306)/one-api"
export REDIS_CONN_STRING="redis://localhost:6379"
export SYNC_FREQUENCY=60
export SESSION_SECRET="n+FAhn6VFXrgcR3CjS57ehPzMjMy3z70dyFJJXurj3Y="

nohup ./one-api --port 3000 --log-dir ./logs > /dev/null 2>&1 &

echo "=== 等待启动 ==="
sleep 10

echo "=== 验证服务 ==="
curl -s http://localhost:3000/api/status | head -5
curl -s http://localhost:3000/ | grep -i "title"

echo "=== 修复完成 ==="
```

---

## 🔧 预防措施

### 1. 创建构建脚本

创建 `build.sh` 脚本，确保前端和后端按正确顺序构建：

```bash
#!/bin/bash
# 完整构建脚本

echo "构建前端..."
cd web/default && npm install --legacy-peer-deps && npm run build
cd ../..

echo "构建后端..."
go build -ldflags "-s -w" -o one-api

echo "构建完成！"
```

---

### 2. 使用 Docker Compose（推荐）

使用 Docker Compose 可以避免网络配置问题：

```yaml
services:
  one-api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - SQL_DSN=oneapi:OneAPI@2026@tcp(db:3306)/one-api
      - REDIS_CONN_STRING=redis://redis
    depends_on:
      - db
      - redis

  db:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=Root123456
      - MYSQL_DATABASE=one-api

  redis:
    image: redis:latest
```

这样可以使用 Docker 网络，配置中的 `mysql` 和 `redis` 主机名会自动解析。

---

## 📞 验证清单

- [ ] 前端构建成功（`web/build/default/index.html` 存在）
- [ ] 后端重新编译（二进制文件包含前端资源）
- [ ] 数据库配置正确（localhost 或 Docker 网络名）
- [ ] Redis 配置正确
- [ ] 服务启动成功（无 FATAL 错误）
- [ ] API 接口可访问（`/api/status` 返回成功）
- [ ] 前端页面可访问（`/` 返回 HTML）
- [ ] 静态资源可加载（JS/CSS 文件正常）

---

## ✅ 当前状态

**服务状态**: ✅ 运行正常

**访问地址**: http://localhost:3000/

**登录账号**:
- 用户名：`root`
- 密码：`123456`

**进程信息**:
```
one-api 15525 shichenhao    9u  IPv6 0x61cf3d453812982b      0t0  TCP *:hbci (LISTEN)
```

**日志状态**: 正常，无错误

---

## 🎉 问题已解决！

现在可以通过 http://localhost:3000/ 正常访问 one-api 系统了！
