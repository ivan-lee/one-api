# One-API 快速启动指南

## 🚀 一键启动（推荐）

### 1. 启动所有服务

```bash
# 使用 Docker Compose 一键启动 MySQL、Redis 和 one-api
docker-compose up -d
```

### 2. 访问系统

打开浏览器访问：http://localhost:3000

**默认账号**：
- 用户名：`root`
- 密码：`123456`

> ⚠️ 首次登录后请立即修改密码！

---

## 📋 分步启动

### 步骤 1：启动依赖服务

```bash
# 启动 MySQL 和 Redis
docker-compose up -d mysql redis

# 等待服务就绪（约 10 秒）
sleep 10
```

### 步骤 2：初始化数据库

```bash
# 赋予执行权限
chmod +x scripts/init-db.sh

# 执行初始化脚本
./scripts/init-db.sh
```

**输出示例**：
```
[INFO] 开始初始化 One-API 数据库...
[INFO] MySQL 容器状态正常
[INFO] 创建数据库：one-api
[INFO] 数据库创建成功
[INFO] 创建数据库用户：oneapi
[INFO] 用户创建并授权成功
[INFO] ✓ 数据库连接验证成功

[INFO] ==========================================
[INFO] 数据库初始化完成！
[INFO] ==========================================
```

### 步骤 3：配置环境变量

```bash
# 复制生产环境配置模板
cp .env.production .env

# 或使用自动生成的配置（推荐）
# .env 文件已自动生成，包含：
# - 数据库连接字符串
# - 随机 SESSION_SECRET
# - Redis 配置
```

### 步骤 4：启动 one-api

**方式 A：使用 Docker Compose（推荐）**

```bash
docker-compose up -d one-api

# 查看日志
docker-compose logs -f one-api
```

**方式 B：直接运行二进制文件**

```bash
# 加载环境变量
export $(cat .env | xargs)

# 启动服务
./one-api --port 3000 --log-dir ./logs
```

---

## 🔧 故障排查

### 查看服务状态

```bash
# Docker Compose 方式
docker-compose ps

# 查看详细状态
docker-compose ps -a

# 查看日志
docker-compose logs -f
```

### 常见问题

#### 1. 数据库连接失败

```bash
# 检查 MySQL 是否运行
docker ps | grep mysql

# 测试数据库连接
docker exec mysql mysql -u oneapi -p'OneAPI@2026' -e "SELECT 1;"
```

#### 2. Redis 连接失败

```bash
# 检查 Redis 是否运行
docker ps | grep redis

# 测试 Redis 连接
docker exec redis redis-cli ping
```

#### 3. 端口被占用

```bash
# 查看端口占用
lsof -i :3000

# 修改端口
echo "PORT=3001" >> .env
```

---

## 📊 验证安装

### 1. 检查 API 健康状态

```bash
curl http://localhost:3000/api/status
```

**期望输出**：
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "database": "connected",
    "redis": "connected"
  }
}
```

### 2. 登录系统

1. 打开浏览器访问：http://localhost:3000
2. 使用默认账号登录：
   - 用户名：`root`
   - 密码：`123456`
3. 修改密码（必须）

### 3. 测试 API

```bash
# 获取登录后的 cookie，然后测试 API
curl http://localhost:3000/api/user/self
```

---

## 🛑 停止服务

```bash
# 停止所有服务
docker-compose down

# 停止服务但保留数据
docker-compose stop

# 删除所有容器和数据（谨慎使用）
docker-compose down -v
```

---

## 🔐 安全建议

1. **修改默认密码**：首次登录后立即修改 root 密码
2. **配置 HTTPS**：生产环境使用 Nginx + Let's Encrypt
3. **保护 .env 文件**：
   ```bash
   chmod 600 .env
   ```
4. **不要提交 .env 到 Git**：已在 .gitignore 中
5. **定期备份数据库**：
   ```bash
   docker exec mysql mysqldump -u root -p'Root123456' one-api > backup.sql
   ```

---

## 📖 下一步

- [查看完整部署文档](./DEPLOYMENT.md)
- [配置 OAuth 登录](https://github.com/songquanpeng/one-api)
- [添加渠道和模型](https://github.com/songquanpeng/one-api)
- [设置令牌和配额](https://github.com/songquanpeng/one-api)

---

## 📞 获取帮助

- **GitHub**: https://github.com/songquanpeng/one-api
- **Issues**: https://github.com/songquanpeng/one-api/issues
- **文档**: https://github.com/songquanpeng/one-api
