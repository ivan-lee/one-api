# One API 开发指南

> 面向 Java/React 开发者的项目理解文档

## 一、项目概述

**One API** 是一个 AI API 网关项目，提供 OpenAI 兼容接口，支持 40+ 种大模型（如 OpenAI、Anthropic、Claude、 Gemini 等）。简单来说，它是一个**统一的中转站**，让用户通过一套 API 就能访问各种不同的 AI 服务商。

```
用户 → One API → OpenAI / Claude / Gemini / 百度文心 / 阿里通义 ...
```

---

## 二、技术栈对照（Java/React 开发者视角）

| 层面 | 本项目技术 | Java 对应 | React 对应 |
|------|-----------|----------|-----------|
| **后端框架** | Gin (Go) | Spring Boot | - |
| **ORM** | GORM | MyBatis / JPA | - |
| **数据库** | MySQL / PostgreSQL / SQLite | MySQL / PostgreSQL | - |
| **前端框架** | React + Ant Design | - | React + Ant Design |
| **路由** | Gin Router | Spring MVC | React Router |
| **认证** | JWT + Session | JWT / Session | - |
| **构建** | Go build | Maven/Gradle | npm build |
| **部署** | 单一二进制 + Docker | JAR + Docker | npm build + Docker |

---

## 三、目录结构（Java/React 开发者容易理解的方式）

```
one-api/
├── main.go                    # 启动入口 ≈ SpringBootApplication
├── controller/                # Controller 层 - 处理 HTTP 请求
│   ├── token.go              # 令牌管理 API (类似 Controller)
│   ├── user.go               # 用户管理 API
│   └── ...
├── model/                     # Model 层 - 数据模型 + 数据库操作 (类似 Entity + Mapper)
│   ├── token.go              # Token 实体类 + CRUD
│   ├── user.go               # User 实体类 + CRUD
│   └── main.go               # 数据库连接初始化
├── router/                    # 路由配置 (类似 @RequestMapping)
│   ├── main.go               # 路由组装
│   ├── api.go                # 管理 API 路由 (/api/*)
│   └── relay.go              # OpenAI 兼容路由 (/v1/*)
├── middleware/               # 中间件 (类似 Filter / Interceptor)
│   ├── auth.go               # 认证中间件
│   ├── cors.go               # CORS 中间件
│   └── distributor.go        # 负载均衡中间件
├── relay/                    # 核心业务 - 中转逻辑
│   ├── relay.go              # 请求转发
│   └── adaptor/              # 各种 AI 服务商的适配器
├── common/                   # 公共工具
│   ├── config/               # 配置管理 (类似 @ConfigurationProperties)
│   ├── helper/               # 工具函数
│   └── logger/               # 日志
└── web/                      # 前端 React 项目
    ├── default/              # 默认主题
    │   ├── src/
    │   │   ├── pages/        # 页面组件 (类似 React Router pages)
    │   │   ├── components/   # 公共组件
    │   │   └── helpers/      # API 调用工具 (类似 axios wrapper)
    │   └── build/            # 构建产物 (嵌入到 Go 二进制)
    ├── berry/                # 另一个主题
    └── air/                  # 第三个主题
```

### 与 Java/Spring 对照

```
Java/Spring                    Go/Gin (本项目)
─────────────────────────────────────────────────────
@SpringBootApplication          main.go
@Controller                     controller/*.go
@Service                         (与 controller 合并)
@Repository                      model/*.go
@Entity                          model/*.go (struct)
MyBatis Mapper                  model/*.go (GORM)
@RequestMapping                 router/*.go
@Interceptor / Filter            middleware/*.go
application.yml                  common/config/ + .env
```

### 与 React 对照

```
React 项目                    本项目前端 (web/)
─────────────────────────────────────────────────────
src/pages/                   web/*/src/pages/
src/components/             web/*/src/components/
src/api/                    web/*/src/helpers/api.js
src/App.js                  web/*/src/App.js
package.json                 web/*/package.json
npm build                   web/*/npm run build
```

---

## 四、今日代码变更详解

### 4.1 问题描述

批量创建令牌功能，点击"创建"按钮后弹窗报错，但刷新页面后令牌实际已创建成功。

### 4.2 问题原因

**后端 API 响应格式与前端期望不一致**（类似前后端接口字段不匹配的问题）

**后端返回** (`controller/token.go`):
```json
{
  "success": true,
  "message": "",
  "success_count": 2,
  "fail_count": 0,
  "results": [...]
}
```

**前端期望**:
```json
{
  "success": true,
  "message": "",
  "data": {
    "success_count": 2,
    "fail_count": 0,
    "results": [...]
  }
}
```

前端代码 (`BatchCreate.js`):
```javascript
const { success, message, data } = res.data;
if (success) {
  showSuccess(`Successfully created ${data.success_count} tokens`);
  setResults(data);  // data 为 undefined！
}
```

当 `data` 为 `undefined` 时，访问 `data.success_count` 抛出 `TypeError`，被 catch 捕获，显示 "Network error"。

### 4.3 修复代码

#### 修复 1: 后端响应格式 (`controller/token.go`)

**修改前**:
```go
c.JSON(http.StatusOK, gin.H{
    "success":       true,
    "message":       "",
    "success_count": response.SuccessCount,
    "fail_count":    response.FailCount,
    "results":       response.Results,
})
```

**修改后** (将数据包装在 `data` 字段中):
```go
c.JSON(http.StatusOK, gin.H{
    "success": true,
    "message": "",
    "data": gin.H{
        "success_count": response.SuccessCount,
        "fail_count":    response.FailCount,
        "results":       response.Results,
    },
})
```

这类似于 Java 中将响应包装在统一的 Result 对象中：
```java
// Java 示例
@PostMapping("/api/token/batch")
public Result<BatchTokenResponse> batchCreate(@RequestBody BatchTokenRequest req) {
    return Result.success(response);  // 包装在 data 字段中
}
```

#### 修复 2: 前端条件渲染 (`BatchCreate.js`)

**问题**: i18next 翻译文件中的 Handlebars 语法 `{{#if fail_count}}` 没有被解析

**修改前** (翻译文件):
```json
"modal_complete_message": "成功创建：{{success_count}} 个令牌{{#if fail_count}}，失败：<strong style=\"color: red\">{{fail_count}}</strong>{{/if}}"
```

**修改后** (直接在 React 组件中处理):
```jsx
<p>
  成功创建：<strong>{results.success_count}</strong> 个令牌
  {results.fail_count > 0 && (
    <span>，失败：<strong style={{ color: 'red' }}>{results.fail_count}</strong></span>
  )}
</p>
```

这类似于 React 中常见的条件渲染：
```jsx
// React 常见模式
{showError && <div className="error">{error}</div>}
{count > 0 && <span>{count} items</span>}
```

---

## 五、开发调试指南

### 5.1 后端开发

```bash
# 1. 安装依赖
go mod download

# 2. 运行开发服务器 (监听 3000 端口)
go run . --port 3000

# 3. 构建生产版本
go build -ldflags "-s -w" -o one-api .

# 4. 运行生产版本
./one-api --port 3000 --log-dir ./logs
```

### 5.2 前端开发

```bash
# 进入前端目录
cd web/default

# 安装依赖
npm install

# 开发模式 (热更新，代理到 localhost:3000)
npm run dev

# 构建生产版本
npm run build

# ⚠️ 构建后需要重新编译 Go 程序来嵌入新前端
cd ../..
go build -o one-api .
```

### 5.3 关键配置文件

- `.env` - 环境变量（类似 application.properties）
- `common/config/config.go` - Go 配置代码
- `web/default/.env` - 前端环境变量

---

## 六、常见问题速查

| 问题 | 解决方案 |
|------|---------|
| 前端修改后没生效 | 1. `npm run build` 2. `go build -o one-api .` 3. 重启服务 |
| 数据库连接失败 | 检查 `.env` 中的 `SQL_DSN` 配置 |
| 前端构建报错 | 使用 `DISABLE_ESLINT_PLUGIN='true' npm run build` |
| 添加新页面 | 1. 创建 React 组件 2. 在 router 和 menu 中注册 |
| 添加新 API | 1. 在 controller 添加处理函数 2. 在 router 注册路由 |

---

## 七、核心概念

### 7.1 适配器模式 (Adaptor Pattern)

`relay/adaptor/` 目录下为每个 AI 服务商实现了适配器，将请求转换为各自的 API 格式。

```
请求 → One API → [OpenAI Adaptor] → OpenAI API
              → [Claude Adaptor]   → Claude API
              → [Gemini Adaptor]   → Gemini API
```

这类似于设计模式中的适配器模式，让统一接口调用不同服务商。

### 7.2 令牌 (Token) vs 渠道 (Channel)

- **Token**: 用户在 One API 中生成的 API Key，用于身份验证和额度控制
- **Channel**: 连接到上游 AI 服务商（如 OpenAI API Key）的配置

用户使用 Token 调用 One API，One API 使用 Channel 转发到上游。

### 7.3 嵌入式前端

Go 程序使用 `//go:embed web/build/*` 将前端构建产物嵌入到二进制文件中，部署时只需分发一个文件。

这与传统的分离部署不同，但也支持分离部署（见下一节）。