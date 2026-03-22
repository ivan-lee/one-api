# One-API 数据库初始化与部署总结

## ✅ 初始化完成状态

**完成时间**: 2026-03-22

所有服务已成功启动并运行：

| 服务 | 状态 | 连接信息 |
|------|------|----------|
| **MySQL** | ✅ 运行中 | `localhost:3306` |
| **Redis** | ✅ 运行中 | `localhost:6379` |
| **one-api** | ✅ 运行中 | `http://localhost:3000` |

---

## 📊 连接信息

### MySQL 数据库

```
主机：localhost
端口：3306
数据库：one-api
用户名：oneapi
密码：OneAPI@2026
连接字符串：oneapi:OneAPI@2026@tcp(localhost:3306)/one-api
```

### Redis 缓存

```
主机：localhost
端口：6379
连接字符串：redis://localhost:6379
```

### one-api 服务

```
访问地址：http://localhost:3000
默认账号：root / 123456
⚠️ 首次登录后请立即修改密码！
```

---

## 📁 创建的文件

### 1. 数据库初始化脚本
**位置**: `scripts/init-db.sh`

**用途**: 自动创建数据库、用户并设置权限

**使用方法**:
```bash
chmod +x scripts/init-db.sh
./scripts/init-db.sh
```

### 2. 生产环境配置模板
**位置**: `.env.production`

**用途**: 生产环境配置参考模板

**使用方法**:
```bash
cp .env.production .env
# 修改 SESSION_SECRET 为随机字符串
```

### 3. 环境变量配置
**位置**: `.env`

**用途**: 当前运行环境的实际配置

**内容**:
```bash
SQL_DSN="oneapi:OneAPI@2026@tcp(mysql:3306)/one-api"
REDIS_CONN_STRING="redis://redis:6379"
SESSION_SECRET="n+FAhn6VFXrgcR3CjS57ehPzMjMy3z70dyFJJXurj3Y="
SYNC_FREQUENCY=60
MEMORY_CACHE_ENABLED=true
BATCH_UPDATE_ENABLED=true
```

### 4. 部署文档
**位置**: `docs/DEPLOYMENT.md`

**内容**: 完整的部署指南，包含：
- 环境要求
- 数据库初始化方法
- 配置文件说明
- 启动方式
- 多机部署
- 故障排查

### 5. 快速启动指南
**位置**: `QUICKSTART.md`

**内容**: 快速上手指南，包含：
- 一键启动命令
- 分步启动流程
- 故障排查
- 验证方法

---

## 🚀 服务验证

### 1. API 健康检查

```bash
curl http://localhost:3000/api/status
```

**期望输出**:
```json
{
  "success": true,
  "data": {
    "server_address": "http://localhost:3000",
    "system_name": "One API",
    "version": "v0.0.0"
  }
}
```

### 2. 数据库连接验证

查看日志确认数据库连接：
```bash
grep "database migrated" logs/oneapi-*.log
```

**期望输出**:
```
[INFO] database migration started
[INFO] database migrated
```

### 3. Redis 连接验证

查看日志确认 Redis 连接：
```bash
grep "Redis is enabled" logs/oneapi-*.log
```

**期望输出**:
```
[INFO] Redis is enabled
```

---

## 🔧 服务管理

### 查看服务状态

```bash
# Docker 容器状态
docker ps | grep -E "mysql|redis"

# one-api 进程
ps aux | grep one-api

# 查看日志
tail -f logs/oneapi-*.log
```

### 重启服务

```bash
# 停止 one-api
pkill -f one-api

# 重新启动
./one-api --port 3000 --log-dir ./logs
```

### 停止所有服务

```bash
# 停止 one-api
pkill -f one-api

# 停止 Docker 容器
docker stop mysql redis
```

---

## 📝 配置说明

### 已启用的优化

1. **Redis 缓存**
   - 启用内存缓存
   - 同步频率：60 秒
   - 减少数据库压力

2. **批量更新**
   - 启用数据库批量更新
   - 更新间隔：5 秒
   - 减少数据库连接数

3. **连接池优化**
   - 最大空闲连接：100
   - 最大打开连接：1000
   - 连接生命周期：60 分钟

### 安全配置

1. **会话密钥**: 已生成随机字符串（32 字符）
2. **数据库密码**: 使用强密码 `OneAPI@2026`
3. **默认密码**: root / 123456（⚠️ 请修改）

---

## 🎯 下一步操作

### 1. 登录系统

访问：http://localhost:3000
- 用户名：`root`
- 密码：`123456`

**⚠️ 首次登录后立即修改密码！**

### 2. 配置渠道

1. 进入"渠道"页面
2. 添加你的 API Key（OpenAI、Anthropic、Gemini 等）
3. 设置模型和费率

### 3. 创建令牌

1. 进入"令牌"页面
2. 创建访问令牌
3. 设置令牌额度和权限

### 4. 测试 API

```bash
# 使用令牌调用 API
curl http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

---

## 📞 技术支持

- **官方文档**: https://github.com/songquanpeng/one-api
- **Issues**: https://github.com/songquanpeng/one-api/issues
- **部署教程**: https://iamazing.cn/page/how-to-deploy-a-website

---

## 📋 检查清单

### 初始化完成 ✅

- [x] MySQL 容器运行正常
- [x] Redis 容器运行正常
- [x] 数据库 `one-api` 创建成功
- [x] 数据库用户 `oneapi` 创建成功
- [x] 数据库连接验证通过
- [x] Redis 连接验证通过
- [x] one-api 服务启动成功
- [x] 配置文件生成完成
- [x] 文档整理完成

### 后续配置 ⚠️

- [ ] 修改 root 用户密码
- [ ] 添加 LLM 渠道（OpenAI、Claude 等）
- [ ] 创建访问令牌
- [ ] 配置 HTTPS（生产环境）
- [ ] 设置数据库备份
- [ ] 配置监控告警

---

## 🎉 总结

数据库初始化全部完成！现在你可以：

1. ✅ 访问 http://localhost:3000 登录系统
2. ✅ 配置渠道和模型
3. ✅ 创建令牌并使用 API
4. ✅ 开始使用 one-api 管理你的 LLM 访问

**祝你使用愉快！** 🚀
