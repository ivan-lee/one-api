# 部署方案建议

## 方案对比

| 特性 | 单文件部署 (推荐) | 前后端分离部署 |
|------|------------------|---------------|
| **复杂度** | ⭐ 简单 | ⭐⭐⭐ 复杂 |
| **Docker 命令** | 1 行 | 10+ 行 |
| **维护成本** | 低 | 高 |
| **适合场景** | 个人/小团队 | 大型团队 |
| **前端更新** | 需重新编译 | 可单独更新 |
| **扩展性** | 有限 | 灵活 |

---

## 推荐：单文件 Docker 部署 ⭐

这正是 One-API 项目**设计初衷** - 一个命令启动全部：

```bash
# 只需要这一行！
docker run --name one-api -d --restart always -p 3000:3000 \
  -e TZ=Asia/Shanghai \
  -e SQL_DSN="root:password@tcp(mysql:3306)/oneapi" \
  -v one-api-data:/data justsong/one-api
```

或者使用 MySQL：
```bash
docker run --name one-api -d --restart always -p 3000:3000 \
  -e TZ=Asia/Shanghai \
  -e SQL_DSN="root:password@tcp(mysql:3306)/oneapi" \
  justsong/one-api
```

**优势**：
- ✅ 1 个 Docker 镜像包含所有（前端+后端）
- ✅ 不需要了解 Go 语言
- ✅ 官方维护，零维护成本
- ✅ 自动嵌入最新前端

---

## 什么时候需要前后端分离？

| 场景 | 建议 |
|------|------|
| 团队有专职前端，想单独部署/更新前端 | 分离部署 |
| 需要 Nginx 做复杂的负载均衡/缓存 | 分离部署 |
| 前端需要对接多个后端服务 | 分离部署 |
| 只是正常使用，不需要定制 | **单文件部署** ⭐ |

---

## 我的建议

**对于你们的团队**：使用**单文件 Docker 部署**是最合适的。

理由：
1. 不需要理解 Go 语言
2. 官方镜像已经处理好一切
3. 前后端自动嵌入，零配置
4. 升级简单：`docker run justsong/one-api:latest`

如果你觉得单文件部署有任何不合理的地方，请告诉我你的具体需求，我可以针对性地调整。

---

## 单文件部署快速开始

```bash
# 1. 启动 MySQL (如果还没有)
docker run -d --name mysql \
  -e MYSQL_ROOT_PASSWORD=password \
  -e MYSQL_DATABASE=oneapi \
  -p 3306:3306 \
  mysql:8.0

# 2. 启动 One-API (单文件，包含前端+后端)
docker run --name one-api -d --restart always -p 3000:3000 \
  -e TZ=Asia/Shanghai \
  -e SQL_DSN="root:password@tcp(localhost:3306)/oneapi" \
  justsong/one-api

# 访问 http://localhost:3000
# 用户名: root
# 密码: 123456
```

**就这么简单，一个命令搞定前后端。**