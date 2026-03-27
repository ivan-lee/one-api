# One-API 数据库初始化与部署文档

## 📋 目录

- [快速开始](#快速开始)
- [环境要求](#环境要求)
- [数据库初始化](#数据库初始化)
- [配置文件说明](#配置文件说明)
- [启动服务](#启动服务)
- [多机部署](#多机部署)
- [故障排查](#故障排查)

---

## 🚀 快速开始

### 1. 启动依赖服务

```bash
# 使用 Docker Compose 启动 MySQL 和 Redis
docker-compose up -d mysql redis
```

### 2. 初始化数据库

```bash
# 赋予执行权限
chmod +x scripts/init-db.sh

# 执行初始化脚本
./scripts/init-db.sh
```

### 3. 配置环境变量

```bash
# 复制生产环境配置文件
cp .env.production .env

# 生成随机 SESSION_SECRET
SESSION_SECRET=$(openssl rand -base64 32)
echo "SESSION_SECRET=\"$SESSION_SECRET\"" >> .env
```

### 4. 启动 one-api

```bash
# 使用构建好的二进制文件
./one-api --port 3000 --log-dir ./logs

# 或使用 Docker Compose 一键启动
docker-compose up -d
```

### 5. 访问系统

打开浏览器访问：http://localhost:3000

**默认账号**：
- 用户名：`root`
- 密码：`123456`

> ⚠️ **首次登录后请立即修改密码！**

---

## 📦 环境要求

### 必需服务

| 服务 | 版本 | 用途 | 是否必需 |
|------|------|------|----------|
| **MySQL** | 8.0+ | 数据存储 | ✅ 生产环境必需 |
| **Redis** | 6.0+ | 缓存加速 | ⚠️ 高并发推荐 |
| **Docker** | 20.10+ | 容器运行 | ✅ 推荐 |

### 可选服务

| 服务 | 用途 |
|------|------|
| PostgreSQL | 替代 MySQL 的数据库选项 |
| Nginx | 反向代理和 HTTPS |
| SMTP 服务器 | 邮件验证和密码重置 |

---

## 🗄️ 数据库初始化

### 方法一：自动脚本（推荐）

```bash
# 执行初始化脚本
./scripts/init-db.sh
```

脚本会自动完成：
1. ✅ 创建数据库 `one-api`
2. ✅ 创建用户 `oneapi`
3. ✅ 授予权限
4. ✅ 验证连接

### 方法二：手动初始化

```bash
# 1. 进入 MySQL 容器
docker exec -it mysql mysql -uroot -p'OneAPI@justsong'

# 2. 创建数据库
CREATE DATABASE IF NOT EXISTS `one-api` 
DEFAULT CHARACTER SET utf8mb4 
DEFAULT COLLATE utf8mb4_unicode_ci;

# 3. 创建用户
CREATE USER IF NOT EXISTS 'oneapi'@'%' IDENTIFIED BY '123456';

# 4. 授权
GRANT ALL PRIVILEGES ON `one-api`.* TO 'oneapi'@'%';
FLUSH PRIVILEGES;

# 5. 退出
EXIT;
```

### 方法三：使用 docker-compose 自动创建

`docker-compose.yml` 已配置自动创建数据库：

```yaml
services:
  db:
    environment:
      MYSQL_DATABASE: one-api      # 自动创建
      MYSQL_USER: oneapi           # 自动创建用户
      MYSQL_PASSWORD: '123456'     # 用户密码
      MYSQL_ROOT_PASSWORD: 'OneAPI@justsong'  # root 密码
```

---

## ⚙️ 配置文件说明

### 核心配置（必须修改）

```bash
# .env 文件

# 1. 数据库连接（生产环境必须）
SQL_DSN="oneapi:123456@tcp(mysql:3306)/one-api"

# 2. 会话密钥（必须修改为随机字符串）
SESSION_SECRET="your_random_secret_32_characters"

# 3. Redis 连接（高并发推荐）
REDIS_CONN_STRING="redis://redis:6379"
SYNC_FREQUENCY=60
```

### 性能优化配置（推荐）

```bash
# 启用缓存
MEMORY_CACHE_ENABLED=true

# 批量更新（减少数据库连接）
BATCH_UPDATE_ENABLED=true
BATCH_UPDATE_INTERVAL=5

# 数据库连接池
SQL_MAX_IDLE_CONNS=100
SQL_MAX_OPEN_CONNS=1000
```

### 完整配置项说明

| 变量名 | 说明 | 默认值 | 生产建议 |
|--------|------|--------|----------|
| `SQL_DSN` | 数据库连接字符串 | - | 必须设置 |
| `SESSION_SECRET` | 会话加密密钥 | 随机 UUID | 必须修改 |
| `REDIS_CONN_STRING` | Redis 连接 | - | 高并发必须 |
| `SYNC_FREQUENCY` | Redis 同步频率 (秒) | 600 | 建议 60 |
| `PORT` | 服务端口 | 3000 | 按需修改 |
| `THEME` | 前端主题 | default | default/berry/air |
| `DEBUG` | 调试模式 | false | 生产关闭 |
| `BATCH_UPDATE_ENABLED` | 批量更新 | false | 建议开启 |

---

## 🎯 启动服务

### 方式一：直接运行（开发环境）

```bash
# 1. 构建后端
go build -ldflags "-s -w" -o one-api

# 2. 加载环境变量并启动
source .env
./one-api --port 3000 --log-dir ./logs
```

### 方式二：Docker Compose（生产环境）

```bash
# 一键启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f one-api

# 停止服务
docker-compose down
```

### 方式三：Systemd 服务（生产环境）

使用提供的 `one-api.service` 文件：

```bash
# 复制服务文件
sudo cp one-api.service /etc/systemd/system/

# 修改服务文件中的路径
sudo vim /etc/systemd/system/one-api.service

# 重载 systemd
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start one-api

# 设置开机自启
sudo systemctl enable one-api

# 查看状态
sudo systemctl status one-api
```

---

## 🖥️ 多机部署

### 架构说明

```
                    ┌─────────────┐
                    │   Nginx     │
                    │ (负载均衡)   │
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────▼────┐      ┌────▼────┐      ┌────▼────┐
    │ Node 1  │      │ Node 2  │      │ Node 3  │
    │ (master)│      │ (slave) │      │ (slave) │
    └────┬────┘      └────┬────┘      └────┬────┘
         │                │                 │
         └────────────────┼─────────────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
        ┌─────▼─────┐          ┌──────▼──────┐
        │   MySQL   │          │ Redis(各节点)│
        │ (主从复制) │          │  或集群     │
        └───────────┘          └─────────────┘
```

### 主节点配置

```bash
# .env.master
NODE_TYPE=master
SQL_DSN="oneapi:123456@tcp(mysql-master:3306)/one-api"
SESSION_SECRET="shared_secret_all_nodes_same"
REDIS_CONN_STRING="redis://redis-master:6379"
SYNC_FREQUENCY=60
```

### 从节点配置

```bash
# .env.slave
NODE_TYPE=slave                        # 必须设置为 slave
SQL_DSN="oneapi:123456@tcp(mysql-master:3306)/one-api"  # 连接同一数据库
SESSION_SECRET="shared_secret_all_nodes_same"           # 必须与主节点相同！
REDIS_CONN_STRING="redis://redis-slave:6379"            # 本地 Redis
SYNC_FREQUENCY=60
FRONTEND_BASE_URL="https://master.example.com"          # 重定向到主站
```

### 多机部署检查清单

- [ ] 所有节点使用相同的 `SESSION_SECRET`
- [ ] 所有节点连接同一 MySQL 数据库
- [ ] 从节点设置 `NODE_TYPE=slave`
- [ ] 配置 Redis 缓存（推荐）
- [ ] 设置 `SYNC_FREQUENCY` 定期同步配置
- [ ] 配置 Nginx 负载均衡（可选）

---

## 🔧 故障排查

### 1. 数据库连接失败

**问题**: `Error 1045: Access denied for user`

**解决方案**:
```bash
# 检查数据库用户权限
docker exec -it mysql mysql -uroot -p'OneAPI@justsong' -e "SELECT user, host FROM mysql.user;"

# 重新授权
docker exec -i mysql mysql -uroot -p'OneAPI@justsong' <<-EOSQL
    GRANT ALL PRIVILEGES ON \`one-api\`.* TO 'oneapi'@'%';
    FLUSH PRIVILEGES;
EOSQL
```

### 2. 会话失效（登录后被踢出）

**问题**: 重启后需要重新登录

**解决方案**:
```bash
# 设置固定的 SESSION_SECRET
SESSION_SECRET="your_fixed_secret_key"
```

### 3. Redis 连接失败

**问题**: `Redis connection failed`

**解决方案**:
```bash
# 检查 Redis 是否运行
docker ps | grep redis

# 测试 Redis 连接
docker exec -it redis redis-cli ping

# 如果不需要 Redis，注释掉相关配置
# REDIS_CONN_STRING=""
```

### 4. 数据库表不存在

**问题**: `table 'xxx' doesn't exist`

**解决方案**:
```bash
# one-api 会在启动时自动创建表
# 检查启动日志确认迁移是否成功
docker-compose logs one-api | grep "database migrated"

# 如果失败，重启服务
docker-compose restart one-api
```

### 5. 端口被占用

**问题**: `bind: address already in use`

**解决方案**:
```bash
# 查看端口占用
lsof -i :3000

# 修改端口
PORT=3001

# 或停止占用服务
kill -9 <PID>
```

---

## 📊 监控和维护

### 查看日志

```bash
# Docker Compose 日志
docker-compose logs -f one-api

# 查看错误日志
tail -f logs/error.log

# 查看访问日志
tail -f logs/access.log
```

### 数据库备份

```bash
# 备份数据库
docker exec mysql mysqldump -u root -p'OneAPI@justsong' one-api > backup.sql

# 恢复数据库
docker exec -i mysql mysql -u root -p'OneAPI@justsong' one-api < backup.sql
```

### 服务健康检查

```bash
# 检查 API 健康
curl http://localhost:3000/api/status

# 检查数据库连接
curl http://localhost:3000/api/status | jq .data.database

# 检查 Redis 连接
curl http://localhost:3000/api/status | jq .data.redis
```

---

## 🔐 安全建议

1. **修改默认密码**: 首次登录后立即修改 root 密码
2. **使用 HTTPS**: 生产环境使用 Nginx + Let's Encrypt
3. **设置强密码**: SESSION_SECRET 至少 32 字符
4. **限制访问**: 配置防火墙，只开放必要端口
5. **定期备份**: 设置数据库自动备份
6. **监控日志**: 设置异常登录告警

---

## 📞 获取帮助

- **GitHub Issues**: https://github.com/songquanpeng/one-api/issues
- **官方文档**: https://github.com/songquanpeng/one-api
- **部署教程**: https://iamazing.cn/page/how-to-deploy-a-website

---

## 📝 更新日志

- **2026-03-22**: 初始版本，包含完整的数据库初始化和配置说明
