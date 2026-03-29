# Rerank 功能支持开发计划

## TL;DR

> **Quick Summary**: 为 one-api 添加 Rerank（重排序）模型支持，当前仅支持 Embedding，需要扩展架构支持 Rerank API。
> 
> **Deliverables**:
> - Rerank API 端点 (`/v1/rerank`)
> - 多厂商 Adaptor 实现 (Cohere, Jina AI, OpenAI Compatible)
> - 完整的数据模型和计费支持
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 6 waves
> **Critical Path**: Core Architecture → Data Models → Adaptor Interface → Vendor Implementation

---

## Context

### Original Request
用户需要为大模型 API 网关添加 Rerank（重排序）模型支持。当前项目已完整支持 Embedding（文本向量），但完全不支持 Rerank。

### Interview Summary
**Key Discussions**:
- Embedding 支持现状：已完整实现，支持 8 个厂商
- Rerank 支持现状：完全缺失，无任何核心组件
- API 协议选择：采用 Jina AI 风格（包含文档内容 + OpenAI 风格 usage）
- 厂商优先级：Cohere（主流）、Jina AI（增强）、OpenAI Compatible（通用）

**Research Findings**:
- relaymode 已定义 Embeddings 常量，但无 Rerank
- 路由层已有 `/v1/embeddings`，但无 `/v1/rerank`
- adaptor 接口无 Rerank 相关方法
- Cohere 和 Jina AI 的 Rerank API 协议有细微差异

### Current Architecture Analysis

**Embedding 已实现**:
```
路由层: router/relay.go:30
    ↓
RelayMode: relay/relaymode/define.go:7
    ↓
路径识别: relay/relaymode/helper.go:11
    ↓
Handler: relay/adaptor/*/main.go (8个厂商)
```

**Rerank 缺失**:
```
❌ 无路由
❌ 无 RelayMode 常量
❌ 无路径识别
❌ 无数据模型
❌ 无 Handler
```

---

## Work Objectives

### Core Objective
为 one-api 添加完整的 Rerank 功能支持，包括 API 端点、数据模型、多厂商 Adaptor 实现和计费配置。

### Concrete Deliverables
- 3 个核心架构文件修改
- 1 个新数据模型文件
- 3 个厂商 Adaptor 实现
- 计费配置更新
- API 测试验证

### Definition of Done
- [ ] POST /v1/rerank 端点可用
- [ ] Cohere Rerank API 可调用
- [ ] Jina AI Rerank API 可调用
- [ ] Token 计费正确统计
- [ ] 响应格式符合标准

### Must Have
- Rerank RelayMode 定义
- `/v1/rerank` 路由
- RerankRequest/RerankResponse 数据模型
- Cohere Adaptor 实现
- Jina AI Adaptor 实现
- Token 计费支持

### Must NOT Have (Guardrails)
- 不修改现有 Embedding 功能
- 不影响其他 adaptor 的正常工作
- 不破坏现有 API 兼容性

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: None
- **Framework**: N/A
- **Agent-Executed QA**: Mandatory for all tasks

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **API/Backend**: Use Bash (curl) — Send requests, assert status + response fields

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — Core Architecture):
├── Task 1: Add Rerank constant to relaymode/define.go [quick]
├── Task 2: Add path recognition for /v1/rerank [quick]
└── Task 3: Add route for /v1/rerank [quick]

Wave 2 (After Wave 1 — Data Models):
└── Task 4: Create RerankRequest/RerankResponse models [quick]

Wave 3 (After Wave 2 — Adaptor Interface):
└── Task 5: Extend Adaptor interface with Rerank methods [quick]

Wave 4 (After Wave 3 — Vendor Implementation):
├── Task 6: Implement Cohere Rerank Adaptor [quick]
├── Task 7: Implement Jina AI Rerank Adaptor [quick]
└── Task 8: Implement OpenAI Compatible Rerank [quick]

Wave 5 (After Wave 4 — Billing):
└── Task 9: Add Rerank model pricing [quick]

Wave FINAL (After ALL tasks — Verification):
├── Task F1: Plan compliance audit [oracle]
├── Task F2: Code quality review [unspecified-high]
├── Task F3: Real manual QA [unspecified-high]
└── Task F4: Scope fidelity check [deep]
-> Present results -> Get explicit user okay

Critical Path: Task 1-3 → Task 4 → Task 5 → Task 6-8 → Task 9 → F1-F4
Parallel Speedup: ~50% faster than sequential
Max Concurrent: 3 (Wave 1 & 4)
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1-3 | - | 4 |
| 4 | 1-3 | 5 |
| 5 | 4 | 6-8 |
| 6-8 | 5 | 9 |
| 9 | 6-8 | F1-F4 |
| F1-F4 | 9 | user okay |

---

## TODOs

### Wave 1: Core Architecture

- [ ] 1. **Add Rerank constant to relaymode**

  **What to do**:
  - Open `relay/relaymode/define.go`
  - Add `Rerank` constant after existing constants

  **File**: `relay/relaymode/define.go`

  **Code change**:
  ```go
  const (
      Unknown = iota
      ChatCompletions
      Completions
      Embeddings
      Moderations
      ImagesGenerations
      Edits
      AudioSpeech
      AudioTranscription
      AudioTranslation
      Proxy
      Rerank  // 新增
  )
  ```

  **Acceptance Criteria**:
  - [ ] Go build passes
  - [ ] Constant `Rerank` has value 11

  **QA Scenarios**:
  ```
  Scenario: Rerank constant defined
    Tool: Bash
    Steps:
      1. grep "Rerank" relay/relaymode/define.go
    Expected Result: Found "Rerank" constant definition
  ```

  **Commit**: YES
  - Message: `feat(relay): add Rerank relay mode constant`

- [ ] 2. **Add path recognition for /v1/rerank**

  **What to do**:
  - Open `relay/relaymode/helper.go`
  - Add path recognition logic for `/v1/rerank`

  **File**: `relay/relaymode/helper.go`

  **Code change**:
  ```go
  func GetByPath(path string) int {
      relayMode := Unknown
      if strings.HasPrefix(path, "/v1/chat/completions") {
          relayMode = ChatCompletions
      } else if strings.HasPrefix(path, "/v1/completions") {
          relayMode = Completions
      } else if strings.HasPrefix(path, "/v1/embeddings") {
          relayMode = Embeddings
      } else if strings.HasSuffix(path, "embeddings") {
          relayMode = Embeddings
      } else if strings.HasPrefix(path, "/v1/rerank") {  // 新增
          relayMode = Rerank
      } else if strings.HasPrefix(path, "/v1/moderations") {
          relayMode = Moderations
      }
      // ... rest of conditions
      return relayMode
  }
  ```

  **Acceptance Criteria**:
  - [ ] Path `/v1/rerank` returns `Rerank` mode
  - [ ] Path `/v1/rerank/` returns `Rerank` mode

  **QA Scenarios**:
  ```
  Scenario: Rerank path recognized
    Tool: Bash
    Steps:
      1. grep "v1/rerank" relay/relaymode/helper.go
    Expected Result: Found rerank path recognition
  ```

  **Commit**: YES
  - Message: `feat(relay): add path recognition for rerank endpoint`

- [ ] 3. **Add route for /v1/rerank**

  **What to do**:
  - Open `router/relay.go`
  - Add POST route for `/v1/rerank`

  **File**: `router/relay.go`

  **Code change**:
  ```go
  relayV1Router.POST("/embeddings", controller.Relay)
  relayV1Router.POST("/engines/:model/embeddings", controller.Relay)
  relayV1Router.POST("/rerank", controller.Relay)  // 新增
  ```

  **Acceptance Criteria**:
  - [ ] Route `/v1/rerank` registered
  - [ ] Server starts without error

  **QA Scenarios**:
  ```
  Scenario: Rerank route registered
    Tool: Bash (curl)
    Steps:
      1. Start server
      2. curl -X POST http://localhost:3000/v1/rerank -H "Authorization: Bearer test"
    Expected Result: Returns error about invalid request (not 404)
  ```

  **Commit**: YES
  - Message: `feat(router): add /v1/rerank route`

---

### Wave 2: Data Models

- [ ] 4. **Create RerankRequest/RerankResponse models**

  **What to do**:
  - Create new file `relay/model/rerank.go`
  - Define request and response structures

  **File**: `relay/model/rerank.go` (新建)

  **Code**:
  ```go
  package model

  // RerankRequest represents a rerank API request
  type RerankRequest struct {
      Model           string   `json:"model"`
      Query           string   `json:"query" binding:"required"`
      Documents       []string `json:"documents" binding:"required"`
      TopN            int      `json:"top_n,omitempty"`
      ReturnDocuments bool     `json:"return_documents,omitempty"`
      MaxChunksPerDoc int      `json:"max_chunks_per_doc,omitempty"`
  }

  // RerankResponse represents a rerank API response
  type RerankResponse struct {
      Object  string         `json:"object"`
      Model   string         `json:"model"`
      Usage   *Usage         `json:"usage,omitempty"`
      Results []RerankResult `json:"results"`
      ID      string         `json:"id,omitempty"`
  }

  // RerankResult represents a single rerank result
  type RerankResult struct {
      Index          int     `json:"index"`
      RelevanceScore float64 `json:"relevance_score"`
      Document       *RerankDocument `json:"document,omitempty"`
  }

  // RerankDocument represents document content in rerank result
  type RerankDocument struct {
      Text string `json:"text"`
  }
  ```

  **Acceptance Criteria**:
  - [ ] Go build passes
  - [ ] JSON serialization works correctly

  **QA Scenarios**:
  ```
  Scenario: Rerank models defined
    Tool: Bash
    Steps:
      1. ls relay/model/rerank.go
    Expected Result: File exists
  ```

  **Commit**: YES
  - Message: `feat(model): add RerankRequest and RerankResponse models`

---

### Wave 3: Adaptor Interface

- [ ] 5. **Extend Adaptor interface with Rerank methods**

  **What to do**:
  - Open `relay/adaptor/interface.go`
  - Add Rerank-related methods

  **File**: `relay/adaptor/interface.go`

  **Code change**:
  ```go
  type Adaptor interface {
      Init(meta *meta.Meta)
      GetRequestURL(meta *meta.Meta) (string, error)
      SetupRequestHeader(c *gin.Context, req *http.Request, meta *meta.Meta) error
      ConvertRequest(c *gin.Context, relayMode int, request *model.GeneralOpenAIRequest) (any, error)
      ConvertImageRequest(request *model.ImageRequest) (any, error)
      ConvertRerankRequest(request *model.RerankRequest) (any, error)  // 新增
      DoRequest(c *gin.Context, meta *meta.Meta, requestBody io.Reader) (*http.Response, error)
      DoResponse(c *gin.Context, resp *http.Response, meta *meta.Meta) (usage *model.Usage, err *model.ErrorWithStatusCode)
      GetModelList() []string
      GetChannelName() string
  }
  ```

  **Acceptance Criteria**:
  - [ ] Go build passes (may require stub implementations in existing adaptors)
  - [ ] Interface compiles

  **QA Scenarios**:
  ```
  Scenario: Interface extended
    Tool: Bash
    Steps:
      1. grep "ConvertRerankRequest" relay/adaptor/interface.go
    Expected Result: Found method definition
  ```

  **Commit**: YES
  - Message: `feat(adaptor): add ConvertRerankRequest to Adaptor interface`

---

### Wave 4: Vendor Implementation

- [ ] 6. **Implement Cohere Rerank Adaptor**

  **What to do**:
  - Create `relay/adaptor/cohere/rerank.go`
  - Implement Cohere Rerank API protocol
  - Update `cohere/adaptor.go` to handle Rerank mode

  **Files**: 
  - `relay/adaptor/cohere/rerank.go` (新建)
  - `relay/adaptor/cohere/adaptor.go` (修改)

  **Key Code**:
  ```go
  // cohere/rerank.go
  package cohere

  import (
      "encoding/json"
      "io"
      "net/http"
      
      "github.com/gin-gonic/gin"
      "github.com/songquanpeng/one-api/relay/model"
  )

  // CohereRerankRequest is Cohere's rerank request format
  type CohereRerankRequest struct {
      Model          string   `json:"model"`
      Query          string   `json:"query"`
      Documents      []string `json:"documents"`
      TopN           int      `json:"top_n,omitempty"`
      MaxChunksPerDoc int     `json:"max_chunks_per_doc,omitempty"`
  }

  // CohereRerankResponse is Cohere's rerank response format
  type CohereRerankResponse struct {
      Results []CohereRerankResult `json:"results"`
      Meta    CohereRerankMeta     `json:"meta"`
  }

  type CohereRerankResult struct {
      Index          int     `json:"index"`
      RelevanceScore float64 `json:"relevance_score"`
  }

  type CohereRerankMeta struct {
      APIVersion  map[string]interface{} `json:"api_version"`
      BilledUnits map[string]int         `json:"billed_units"`
      Tokens      map[string]int         `json:"tokens"`
  }

  func RerankHandler(c *gin.Context, resp *http.Response) (*model.ErrorWithStatusCode, *model.Usage) {
      // Read response
      body, err := io.ReadAll(resp.Body)
      if err != nil {
          return ErrorWrapper(err, "read_response_failed", http.StatusInternalServerError), nil
      }
      
      // Parse Cohere response
      var cohereResp CohereRerankResponse
      if err := json.Unmarshal(body, &cohereResp); err != nil {
          return ErrorWrapper(err, "unmarshal_response_failed", http.StatusInternalServerError), nil
      }
      
      // Convert to standard format
      rerankResp := model.RerankResponse{
          Object: "list",
          Results: make([]model.RerankResult, len(cohereResp.Results)),
      }
      
      for i, r := range cohereResp.Results {
          rerankResp.Results[i] = model.RerankResult{
              Index:          r.Index,
              RelevanceScore: r.RelevanceScore,
          }
      }
      
      // Usage
      usage := &model.Usage{}
      if tokens, ok := cohereResp.Meta.Tokens["input_tokens"]; ok {
          usage.PromptTokens = tokens
          usage.TotalTokens = tokens
      }
      rerankResp.Usage = usage
      
      // Return response
      c.JSON(http.StatusOK, rerankResp)
      return nil, usage
  }
  ```

  **Update adaptor.go**:
  ```go
  func (a *Adaptor) GetRequestURL(meta *meta.Meta) (string, error) {
      switch meta.Mode {
      case relaymode.Rerank:
          return fmt.Sprintf("%s/v1/rerank", meta.BaseURL), nil
      default:
          return fmt.Sprintf("%s/v1/chat", meta.BaseURL), nil
      }
  }

  func (a *Adaptor) ConvertRerankRequest(request *model.RerankRequest) (any, error) {
      if request == nil {
          return nil, errors.New("request is nil")
      }
      return &CohereRerankRequest{
          Model:          request.Model,
          Query:          request.Query,
          Documents:      request.Documents,
          TopN:           request.TopN,
          MaxChunksPerDoc: request.MaxChunksPerDoc,
      }, nil
  }

  func (a *Adaptor) DoResponse(c *gin.Context, resp *http.Response, meta *meta.Meta) (usage *model.Usage, err *model.ErrorWithStatusCode) {
      switch meta.Mode {
      case relaymode.Rerank:
          return RerankHandler(c, resp)
      case relaymode.ChatCompletions:
          if meta.IsStream {
              err, usage = StreamHandler(c, resp)
          } else {
              err, usage = Handler(c, resp, meta.PromptTokens, meta.ActualModelName)
          }
      }
      return
  }
  ```

  **Acceptance Criteria**:
  - [ ] Cohere Rerank API 可调用
  - [ ] 响应格式正确转换

  **QA Scenarios**:
  ```
  Scenario: Cohere rerank works
    Tool: Bash (curl)
    Steps:
      1. Configure Cohere channel
      2. curl -X POST http://localhost:3000/v1/rerank \
         -H "Authorization: Bearer $KEY" \
         -H "Content-Type: application/json" \
         -d '{"query":"test","documents":["doc1","doc2"]}'
    Expected Result: Returns rerank results
  ```

  **Commit**: YES
  - Message: `feat(cohere): add Rerank API support`

- [ ] 7. **Implement Jina AI Rerank Adaptor**

  **What to do**:
  - Create `relay/adaptor/jina/` directory if not exists
  - Implement Jina AI Rerank API protocol
  - Jina AI uses similar format to OpenAI

  **Files**: `relay/adaptor/jina/*.go`

  **Key differences from Cohere**:
  - Jina returns `document.text` in results
  - Jina uses `usage` field (OpenAI style)
  - Endpoint: `/v1/rerank`

  **Acceptance Criteria**:
  - [ ] Jina AI Rerank API 可调用

  **Commit**: YES
  - Message: `feat(jina): add Jina AI Rerank support`

- [ ] 8. **Implement OpenAI Compatible Rerank**

  **What to do**:
  - Update `relay/adaptor/openai/adaptor.go` to handle Rerank mode
  - Create `relay/adaptor/openai/rerank.go`
  - Support generic OpenAI-compatible rerank endpoints

  **Files**: 
  - `relay/adaptor/openai/rerank.go` (新建)
  - `relay/adaptor/openai/adaptor.go` (修改)

  **Acceptance Criteria**:
  - [ ] OpenAI-compatible Rerank works

  **Commit**: YES
  - Message: `feat(openai): add Rerank support for OpenAI-compatible APIs`

---

### Wave 5: Billing

- [ ] 9. **Add Rerank model pricing**

  **What to do**:
  - Open `relay/billing/ratio/model.go`
  - Add Rerank model pricing ratios

  **File**: `relay/billing/ratio/model.go`

  **Code change**:
  ```go
  // Rerank models
  "rerank-english-v3.0":         0.001,
  "rerank-multilingual-v3.0":    0.001,
  "rerank-english-v2.0":          0.001,
  "jina-reranker-v2-base-multilingual": 0.001,
  "jina-reranker-v1-turbo-en":    0.0005,
  ```

  **Acceptance Criteria**:
  - [ ] Billing ratio defined for rerank models

  **Commit**: YES
  - Message: `feat(billing): add Rerank model pricing ratios`

---

## Final Verification Wave (MANDATORY)

- [ ] F1. **Plan compliance audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists.
  Output: `Must Have [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code quality review** — `unspecified-high`
  Run `go build` + check code quality.
  Output: `Build [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real manual QA** — `unspecified-high`
  Test all Rerank endpoints with real API calls.
  Output: `Scenarios [N/N pass] | VERDICT`

- [ ] F4. **Scope fidelity check** — `deep`
  Verify all tasks implemented as specified, no scope creep.
  Output: `Tasks [N/N compliant] | VERDICT`

---

## Success Criteria

### Verification Commands
```bash
# Build
go build -o one-api

# Test Rerank endpoint
curl -X POST http://localhost:3000/v1/rerank \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "rerank-english-v3.0",
    "query": "What is the capital of US?",
    "documents": ["Washington D.C. is the capital.", "New York is a city."]
  }'
```

### Final Checklist
- [ ] All "Must Have" features present
- [ ] POST /v1/rerank endpoint works
- [ ] Cohere Rerank works
- [ ] Jina AI Rerank works
- [ ] Billing configured correctly