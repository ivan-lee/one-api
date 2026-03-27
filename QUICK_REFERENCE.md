# One-API 快速参考

## 🚀 快速命令

```bash
# 构建项目
./build-all.sh

# 启动服务
./start.sh

# 停止服务
./stop.sh

# 重启服务
./restart.sh

# 前台启动（查看日志）
./start.sh -f

# 查看日志
tail -f logs/oneapi-*.log
```

---

## 📁 重要文件

| 文件 | 说明 |
|------|------|
| `one-api` | 可执行文件 |
| `.env` | 环境配置 |
| `logs/oneapi-*.log` | 运行日志 |
| `web/build/default/` | 前端资源 |

---

## ⚙️ 核心配置

```bash
# 数据库
SQL_DSN="oneapi:password@tcp(localhost:3306)/one-api"

# Redis
REDIS_CONN_STRING="redis://localhost:6379"

# 会话密钥（必须修改）
SESSION_SECRET="your_random_secret"

# 端口
PORT=3000
```

---

## 🔐 默认账号

- **地址**: http://localhost:3000
- **用户名**: root
- **密码**: 123456

⚠️ 首次登录后立即修改密码！

---

## 🔧 故障排查

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

---

## 📊 构建检查

- [ ] Node.js 已安装
- [ ] Go 已安装
- [ ] 前端构建成功
- [ ] 后端编译成功
- [ ] 文件大小>30MB（包含前端）

---

## 🎯 部署检查

- [ ] MySQL 运行中
- [ ] Redis 运行中
- [ ] .env 已配置
- [ ] SESSION_SECRET 已修改
- [ ] 服务启动成功
- [ ] API 可访问
- [ ] 前端可访问
