# One-API 生产环境功能增强计划

**创建时间**: 2026-03-22
**计划类型**: 生产环境优化
**预估工期**: 3-4 周（分阶段实施）

---

## TL;DR

> **核心目标**: 将 one-api 从基础API网关升级为企业级管理平台，提供精细化令牌管理、全面统计报表和优化的日志查询体验。

**关键交付**:
- 令牌时间窗口限额（每日/每小时/自定义窗口）
- 模型级别限额控制
- 全面的统计报表系统（令牌/模型/用户/趋势）
- 改进的日志查询（模糊搜索、分页优化、导出功能）

---

## 一、背景与现状分析

### 1.1 业务痛点

**令牌管理不足**:
- ❌ 只有总额度限制，无法设置每日/每小时限额
- ❌ 没有模型级别的使用控制
- ❌ 无法按时段限制使用

**统计功能薄弱**:
- ❌ 总览页面只能查看近7天数据
- ❌ 缺少令牌使用统计
- ❌ 缺少模型使用率分析
- ❌ 缺少用户使用排行

**日志查询体验差**:
- ❌ 分页不显示总数，用户无法知道总页数
- ❌ 搜索是精确匹配，不支持模糊搜索
- ❌ 缺少高级筛选和导出功能

### 1.2 当前系统架构

```
后端架构:
├── model/token.go       # 令牌模型（RemainQuota, UsedQuota, UnlimitedQuota）
├── model/log.go         # 日志模型和查询方法
├── controller/log.go    # 日志API端点
├── controller/user.go   # 用户统计端点
├── relay/billing/       # Token计费逻辑

关键问题:
1. Token模型缺少时间窗口字段（DailyQuota, HourlyQuota等）
2. Log查询不返回总数，搜索仅支持前缀匹配
3. 统计功能分散，缺少统一的报表API
```

---

## 二、需求详细说明

### 2.1 令牌精细化管理

#### 2.1.1 时间窗口限额

**每日限额**:
- 设置每个令牌每天可用的最大额度
- 每天 00:00 自动重置（可配置时区）
- 超出限额后自动拒绝请求，返回明确的错误提示

**小时限额**:
- 设置每小时最大使用额度
- 滑动窗口计数（当前小时往前推算）
- 适用于防止突发流量

**自定义时间窗口**:
- 支持自定义时间窗口（如每周、每两周）
- 配置重置时间和时区
- 支持多个时间窗口叠加（每日+总额度双重限制）

#### 2.1.2 模型级别限额

**模型配额分配**:
- 为不同模型设置不同的限额（如 GPT-4 限额更严格）
- 支持模型组配额（如所有 GPT-4 变体共享配额）
- 超出模型限额后的降级策略（回退到其他模型或拒绝）

**模型访问控制**:
- 扩展现有的 `Models` 字段，支持配额配置
- 模型白名单/黑名单机制
- 模型使用优先级设置

#### 2.1.3 令牌使用统计

**实时统计**:
- 今日已用额度
- 本周/本月使用趋势
- 当前时间窗口剩余额度

**历史统计**:
- 按日/周/月的用量报表
- 模型使用分布饼图
- 消耗趋势折线图

---

### 2.2 统计报表系统

#### 2.2.1 令牌使用统计

**核心指标**:
- 每个令牌的总使用量
- 每日使用趋势
- 常用模型 Top 5
- 使用时段分布热力图

**排名功能**:
- 令牌使用量排行
- 令牌活跃度排行
- 令牌成本排行

#### 2.2.2 模型使用统计

**使用率分析**:
- 各模型调用次数
- 各模型 Token 消耗量
- 各模型成本占比
- 模型响应时间分布

**效率分析**:
- 模型成功率统计
- 平均响应时间
- Token 效率（输出/输入比）

#### 2.2.3 用户使用统计

**用户画像**:
- 每个用户的总使用量
- 活跃时段分析
- 常用模型偏好
- 消费金额统计

**排行榜**:
- 用户使用量 Top 10
- 用户消费金额 Top 10
- 活跃用户排行

#### 2.2.4 时间趋势分析

**多维统计**:
- 按天/周/月查看整体趋势
- 成本趋势分析
- 模型使用趋势
- 用户增长趋势

**数据导出**:
- 支持导出为 CSV
- 支持导出为 Excel
- 自定义时间范围导出

---

### 2.3 日志查询优化

#### 2.3.1 分页改进

**返回总记录数**:
```json
{
  "success": true,
  "data": {
    "logs": [...],
    "total": 1234,
    "page": 1,
    "page_size": 10,
    "total_pages": 124
  }
}
```

**优化体验**:
- 显示 "第 X 页，共 Y 页"
- 总记录数提示 "共 N 条记录"
- 每页显示数量可配置（10/20/50/100）

#### 2.3.2 模糊搜索

**支持的模糊搜索字段**:
- 用户名（username）
- 令牌名（token_name）
- 模型名（model_name）
- 日志内容（content）

**搜索优化**:
- 使用数据库全文索引或 LIKE 查询
- 高亮显示匹配关键词
- 支持组合搜索（用户名 AND 模型名）

#### 2.3.3 高级筛选

**新增筛选条件**:
- 渠道筛选（支持多选）
- 响应时间范围（如 < 1s, 1-3s, > 3s）
- Token 数量范围
- 是否流式请求
- 状态码筛选

**组合筛选**:
- 支持多条件 AND 组合
- 筛选条件保存到 URL 参数
- 一键清除所有筛选

#### 2.3.4 导出功能

**导出格式**:
- CSV 格式（适合大数据量）
- Excel 格式（带格式化）
- JSON 格式（API调用）

**导出选项**:
- 导出当前页
- 导出所有页
- 导出选中记录
- 自定义列选择

---

### 2.4 批量创建令牌功能（新增 - 紧急需求）

#### 2.4.1 功能说明

**使用场景**：
- 管理员需要给大量用户开通 API Key
- 创建相同配置的多个令牌
- 快速分配令牌给不同用户/项目

**输入方式**：
```
令牌名称（支持批量）: user_001, user_002, user_003, user_004, user_005

或者换行分隔：
user_001
user_002
user_003
```

**统一配置**：
- 额度设置
- 过期时间
- 允许的模型
- 每日限额
- 其他限额配置

#### 2.4.2 API 设计

```go
// POST /api/token/batch
type BatchCreateTokenRequest struct {
    Names           string `json:"names" binding:"required"`     // 逗号或换行分隔的名称
    Quota           int64  `json:"quota"`                        // 额度
    ExpiredTime     int64  `json:"expired_time"`                 // 过期时间
    Models          string `json:"models"`                       // 允许的模型
    DailyQuotaLimit int64  `json:"daily_quota_limit"`            // 每日限额
    HourlyQuotaLimit int64 `json:"hourly_quota_limit"`           // 小时限额
    UnlimitedQuota  bool   `json:"unlimited_quota"`              // 无限额度
    Subnet          string `json:"subnet"`                       // 允许的子网
}

type BatchCreateTokenResponse struct {
    SuccessCount int                      `json:"success_count"`
    FailCount    int                      `json:"fail_count"`
    Results      []TokenCreateResult      `json:"results"`
}

type TokenCreateResult struct {
    Name    string `json:"name"`
    Success bool   `json:"success"`
    Key     string `json:"key,omitempty"`      // 创建成功返回key
    Error   string `json:"error,omitempty"`    // 创建失败返回错误
}
```

#### 2.4.3 后端实现

```go
// controller/token.go

func BatchCreateToken(c *gin.Context) {
    var req BatchCreateTokenRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{
            "success": false,
            "message": "参数错误: " + err.Error(),
        })
        return
    }
    
    // 解析名称列表（支持逗号和换行）
    names := parseTokenNames(req.Names)
    
    if len(names) == 0 {
        c.JSON(http.StatusBadRequest, gin.H{
            "success": false,
            "message": "请输入至少一个令牌名称",
        })
        return
    }
    
    if len(names) > 100 {
        c.JSON(http.StatusBadRequest, gin.H{
            "success": false,
            "message": "单次最多创建100个令牌",
        })
        return
    }
    
    // 获取当前用户ID
    userId := c.GetInt("id")
    
    // 批量创建
    results := make([]TokenCreateResult, len(names))
    successCount := 0
    
    for i, name := range names {
        token := &model.Token{
            UserId:           userId,
            Name:             strings.TrimSpace(name),
            Key:              generateKey(),
            Status:           model.TokenStatusEnabled,
            CreatedTime:      time.Now().Unix(),
            ExpiredTime:      req.ExpiredTime,
            RemainQuota:      req.Quota,
            UnlimitedQuota:   req.UnlimitedQuota,
            Models:           &req.Models,
            Subnet:           &req.Subnet,
            DailyQuotaLimit:  req.DailyQuotaLimit,
            HourlyQuotaLimit: req.HourlyQuotaLimit,
        }
        
        err := model.CreateToken(token)
        
        results[i] = TokenCreateResult{
            Name:    name,
            Success: err == nil,
        }
        
        if err != nil {
            results[i].Error = err.Error()
        } else {
            results[i].Key = token.Key
            successCount++
        }
    }
    
    c.JSON(http.StatusOK, gin.H{
        "success": true,
        "message": fmt.Sprintf("成功创建 %d/%d 个令牌", successCount, len(names)),
        "data": BatchCreateTokenResponse{
            SuccessCount: successCount,
            FailCount:    len(names) - successCount,
            Results:      results,
        },
    })
}

// 解析令牌名称（支持逗号、换行、分号分隔）
func parseTokenNames(input string) []string {
    // 统一替换分隔符为换行
    input = strings.ReplaceAll(input, ",", "\n")
    input = strings.ReplaceAll(input, ";", "\n")
    
    // 按行分割
    lines := strings.Split(input, "\n")
    
    // 过滤空行和去重
    nameMap := make(map[string]bool)
    var names []string
    
    for _, line := range lines {
        name := strings.TrimSpace(line)
        if name != "" && !nameMap[name] {
            nameMap[name] = true
            names = append(names, name)
        }
    }
    
    return names
}

// 生成令牌Key
func generateKey() string {
    return "sk-" + randomString(48)
}
```

#### 2.4.4 前端实现

```jsx
// web/default/src/pages/Token/BatchCreate.js

import React, { useState } from 'react';
import { Button, Form, TextArea, Message, Table, Modal } from 'semantic-ui-react';
import { API, showError, showSuccess } from '../../helpers';

const BatchCreateToken = ({ open, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [names, setNames] = useState('');
  const [results, setResults] = useState(null);
  
  const [config, setConfig] = useState({
    quota: 100000,
    expired_time: -1,
    models: '',
    daily_quota_limit: 0,
    unlimited_quota: false,
  });
  
  const handleSubmit = async () => {
    if (!names.trim()) {
      showError('请输入令牌名称');
      return;
    }
    
    setLoading(true);
    
    try {
      const res = await API.post('/api/token/batch', {
        names: names,
        ...config,
      });
      
      const { success, message, data } = res.data;
      
      if (success) {
        showSuccess(message);
        setResults(data);
        if (onSuccess) onSuccess();
      } else {
        showError(message);
      }
    } catch (error) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Modal open={open} onClose={onClose} size="large">
      <Modal.Header>批量创建令牌</Modal.Header>
      <Modal.Content>
        <Form>
          <Form.Field>
            <label>令牌名称（支持逗号、换行分隔）</label>
            <TextArea
              placeholder="user_001, user_002, user_003&#10;或换行输入：&#10;user_001&#10;user_002&#10;user_003"
              rows={6}
              value={names}
              onChange={(e) => setNames(e.target.value)}
            />
            <small style={{ color: '#999' }}>
              已输入 {names.split(/[,\n;]/).filter(n => n.trim()).length} 个名称
            </small>
          </Form.Field>
          
          <Form.Group widths="equal">
            <Form.Input
              label="额度"
              type="number"
              value={config.quota}
              onChange={(e) => setConfig({ ...config, quota: parseInt(e.target.value) })}
            />
            <Form.Input
              label="每日限额（0为不限）"
              type="number"
              value={config.daily_quota_limit}
              onChange={(e) => setConfig({ ...config, daily_quota_limit: parseInt(e.target.value) })}
            />
          </Form.Group>
          
          <Form.Field>
            <label>允许的模型（留空为不限制）</label>
            <input
              placeholder="gpt-3.5-turbo,gpt-4"
              value={config.models}
              onChange={(e) => setConfig({ ...config, models: e.target.value })}
            />
          </Form.Field>
        </Form>
        
        {results && (
          <div style={{ marginTop: '20px' }}>
            <Message success>
              成功创建 {results.success_count} 个令牌，失败 {results.fail_count} 个
            </Message>
            
            <Table celled>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>令牌名称</Table.HeaderCell>
                  <Table.HeaderCell>令牌Key</Table.HeaderCell>
                  <Table.HeaderCell>状态</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {results.results.map((result, index) => (
                  <Table.Row key={index}>
                    <Table.Cell>{result.name}</Table.Cell>
                    <Table.Cell>
                      {result.success ? (
                        <code>{result.key}</code>
                      ) : (
                        <span style={{ color: 'red' }}>{result.error}</span>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      {result.success ? '✓ 成功' : '✗ 失败'}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </div>
        )}
      </Modal.Content>
      <Modal.Actions>
        <Button onClick={onClose}>取消</Button>
        <Button primary loading={loading} onClick={handleSubmit}>
          批量创建
        </Button>
      </Modal.Actions>
    </Modal>
  );
};

export default BatchCreateToken;
```

#### 2.4.5 功能特点

| 特点 | 说明 |
|------|------|
| **多种分隔符支持** | 逗号、换行、分号 |
| **自动去重** | 避免重复创建 |
| **实时计数** | 显示已输入的名称数量 |
| **限制保护** | 单次最多100个 |
| **详细结果** | 显示每个令牌的创建状态 |
| **Key展示** | 创建成功后显示Key，方便复制 |
| **错误提示** | 创建失败显示具体原因 |

#### 2.4.6 使用示例

**场景1：给新员工开通API Key**
```
输入：
zhangsan, lisi, wangwu, zhaoliu

配置：
额度：1000000
每日限额：100000
允许模型：gpt-3.5-turbo

结果：一次性创建4个令牌，每个都相同配置
```

**场景2：按项目创建令牌**
```
输入：
project_alpha_v1
project_beta_v1
project_gamma_v1

配置：
额度：5000000
每日限额：500000

结果：为每个项目创建独立令牌
```

---

## 三、技术方案设计

### 3.1 数据库模型扩展

#### 3.1.1 Token 模型扩展

```go
// 新增字段
type Token struct {
    // ... 现有字段 ...
    
    // 时间窗口限额
    DailyQuotaLimit     int64   `json:"daily_quota_limit" gorm:"default:0"`
    HourlyQuotaLimit    int64   `json:"hourly_quota_limit" gorm:"default:0"`
    MonthlyQuotaLimit   int64   `json:"monthly_quota_limit" gorm:"default:0"`
    
    // 时间窗口已用额度（Redis缓存，不持久化）
    DailyUsedQuota      int64   `json:"daily_used_quota" gorm:"-"`
    HourlyUsedQuota     int64   `json:"hourly_used_quota" gorm:"-"`
    
    // 重置配置
    QuotaResetTime      string  `json:"quota_reset_time" gorm:"default:'00:00'"`
    QuotaTimezone       string  `json:"quota_timezone" gorm:"default:'Asia/Shanghai'"`
    
    // 模型配额（JSON格式）
    ModelQuotas         string  `json:"model_quotas" gorm:"type:text"`
    
    // 高级限制
    RequestsPerMinute   int     `json:"requests_per_minute" gorm:"default:0"`
    RequestsPerHour     int     `json:"requests_per_hour" gorm:"default:0"`
    AllowedHours        string  `json:"allowed_hours" gorm:"default:''"`  // "09:00-18:00"
    AllowedDays         string  `json:"allowed_days" gorm:"default:''"`   // "Mon-Fri"
}
```

#### 3.1.2 新增 TokenUsage 表

```go
// 令牌使用记录表（用于统计和历史查询）
type TokenUsage struct {
    Id                uint      `json:"id" gorm:"primaryKey"`
    TokenId           int       `json:"token_id" gorm:"index"`
    UserId            int       `json:"user_id" gorm:"index"`
    CreatedAt         int64     `json:"created_at" gorm:"index"`
    
    // 使用详情
    ModelName         string    `json:"model_name" gorm:"index"`
    Quota             int64     `json:"quota"`
    PromptTokens      int       `json:"prompt_tokens"`
    CompletionTokens  int       `json:"completion_tokens"`
    
    // 时间维度（用于快速统计）
    DateKey           string    `json:"date_key" gorm:"index"`     // YYYY-MM-DD
    HourKey           string    `json:"hour_key" gorm:"index"`     // YYYY-MM-DD-HH
    WeekKey           string    `json:"week_key" gorm:"index"`     // YYYY-WW
    MonthKey          string    `json:"month_key" gorm:"index"`    // YYYY-MM
    
    // 请求详情
    ChannelId         int       `json:"channel_id"`
    ElapsedTime       int64     `json:"elapsed_time"`
    IsSuccess         bool      `json:"is_success"`
}
```

#### 3.1.3 新增 Statistics 表

```go
// 预聚合统计表（提升查询性能）
type Statistics struct {
    Id                uint      `json:"id" gorm:"primaryKey"`
    CreatedAt         int64     `json:"created_at" gorm:"index"`
    
    // 统计维度
    StatType          string    `json:"stat_type" gorm:"index"`   // token/model/user/channel
    StatKey           string    `json:"stat_key" gorm:"index"`    // 具体ID或名称
    
    // 时间维度
    TimeKey           string    `json:"time_key" gorm:"index"`    // YYYY-MM-DD
    TimeGranularity   string    `json:"time_granularity"`         // day/week/month
    
    // 聚合数据
    RequestCount      int64     `json:"request_count"`
    QuotaSum          int64     `json:"quota_sum"`
    PromptTokenSum    int64     `json:"prompt_token_sum"`
    CompletionTokenSum int64    `json:"completion_token_sum"`
    AvgElapsedTime    float64   `json:"avg_elapsed_time"`
    SuccessRate       float64   `json:"success_rate"`
}
```

### 3.2 API 设计

#### 3.2.1 令牌管理 API

```
POST   /api/token/                          # 创建令牌（扩展字段）
POST   /api/token/batch                     # 批量创建令牌（逗号/换行分隔）
PUT    /api/token/:id                       # 更新令牌（支持限额配置）
GET    /api/token/:id/usage                 # 获取令牌使用统计
GET    /api/token/:id/usage/history         # 获取令牌历史使用记录
GET    /api/token/:id/stats/daily           # 每日统计
GET    /api/token/:id/stats/hourly          # 每小时统计
GET    /api/token/:id/stats/model           # 模型使用统计
```

#### 3.2.2 统计报表 API

```
GET    /api/stats/overview                  # 总览统计
GET    /api/stats/tokens                    # 令牌统计列表
GET    /api/stats/models                    # 模型统计列表
GET    /api/stats/users                     # 用户统计列表
GET    /api/stats/trends/daily              # 每日趋势
GET    /api/stats/trends/weekly             # 每周趋势
GET    /api/stats/trends/monthly            # 每月趋势
GET    /api/stats/ranking/tokens            # 令牌排行
GET    /api/stats/ranking/users             # 用户排行
GET    /api/stats/ranking/models            # 模型排行
```

#### 3.2.3 日志查询 API（优化）

```
GET    /api/log/                            # 查询日志（返回总数）
GET    /api/log/search                      # 搜索日志（模糊搜索）
GET    /api/log/export                      # 导出日志
GET    /api/log/advanced                    # 高级筛选查询
```

### 3.3 核心逻辑实现

#### 3.3.1 时间窗口限额检查

```go
// middleware/token_quota.go

func CheckTokenQuota(token *model.Token, requestedQuota int64) error {
    // 1. 检查总额度
    if !token.UnlimitedQuota && token.RemainQuota < requestedQuota {
        return errors.New("令牌总额度不足")
    }
    
    // 2. 检查每日限额
    if token.DailyQuotaLimit > 0 {
        dailyUsed := GetDailyUsedQuota(token.Id)  // 从 Redis 获取
        if dailyUsed + requestedQuota > token.DailyQuotaLimit {
            return errors.New("令牌今日额度已用尽")
        }
    }
    
    // 3. 检查小时限额
    if token.HourlyQuotaLimit > 0 {
        hourlyUsed := GetHourlyUsedQuota(token.Id)
        if hourlyUsed + requestedQuota > token.HourlyQuotaLimit {
            return errors.New("令牌当前小时额度已用尽")
        }
    }
    
    // 4. 检查模型限额
    if token.ModelQuotas != "" {
        // 解析并检查模型配额
    }
    
    return nil
}
```

#### 3.3.2 统计数据聚合

```go
// model/statistics.go

// 定时任务：每小时聚合一次统计数据
func AggregateStatistics() {
    // 1. 聚合令牌统计
    aggregateTokenStats()
    
    // 2. 聚合模型统计
    aggregateModelStats()
    
    // 3. 聚合用户统计
    aggregateUserStats()
    
    // 4. 清理过期数据
    cleanupOldData()
}

func aggregateTokenStats() {
    // 从 token_usage 表聚合到 statistics 表
    sql := `
        INSERT INTO statistics (stat_type, stat_key, time_key, request_count, quota_sum, ...)
        SELECT 'token', token_id, date_key, count(*), sum(quota), ...
        FROM token_usage
        WHERE created_at >= ?
        GROUP BY token_id, date_key
        ON DUPLICATE KEY UPDATE request_count = VALUES(request_count), ...
    `
}
```

#### 3.3.3 模糊搜索实现

```go
// model/log.go

func SearchLogsWithCount(params SearchParams) (logs []*Log, total int64, err error) {
    query := LOG_DB.Model(&Log{})
    
    // 模糊搜索
    if params.Keyword != "" {
        keyword := "%" + params.Keyword + "%"
        query = query.Where(
            "username LIKE ? OR token_name LIKE ? OR model_name LIKE ? OR content LIKE ?",
            keyword, keyword, keyword, keyword,
        )
    }
    
    // 其他筛选
    if params.ModelName != "" {
        query = query.Where("model_name LIKE ?", "%"+params.ModelName+"%")
    }
    
    // 获取总数
    query.Count(&total)
    
    // 分页查询
    err = query.Offset(params.Offset).Limit(params.Limit).Find(&logs).Error
    
    return logs, total, err
}
```

---

## 四、实施计划（分阶段）

### 阶段一：令牌精细化管理（第 1-2 周）

**目标**: 实现时间窗口限额和模型级别控制

#### Wave 1：数据库扩展（Day 1-3）

| 任务 | 文件 | 说明 |
|------|------|------|
| 扩展 Token 模型 | `model/token.go` | 添加时间窗口字段 |
| 创建 TokenUsage 表 | `model/token_usage.go` | 新建使用记录表 |
| 创建 Statistics 表 | `model/statistics.go` | 新建预聚合表 |
| 数据库迁移脚本 | `bin/migrate_token_v2.sql` | 零停机迁移 |

#### Wave 2：后端逻辑实现（Day 4-7）

| 任务 | 文件 | 说明 |
|------|------|------|
| 时间窗口检查中间件 | `middleware/token_quota.go` | 限额检查逻辑 |
| Redis 缓存实现 | `common/quota_cache.go` | 实时计数器 |
| 令牌配额扣除逻辑 | `model/token_billing.go` | 更新使用量 |
| 定时重置任务 | `model/quota_reset.go` | 每日/小时重置 |

#### Wave 3：API 实现（Day 8-10）

| 任务 | 文件 | 说明 |
|------|------|------|
| 令牌 CRUD 扩展 | `controller/token.go` | 支持新字段 |
| **批量创建令牌 API** | `controller/token.go` | **支持批量创建（逗号分隔名称）** |
| 令牌使用统计 API | `controller/token_stats.go` | 新增统计端点 |
| 路由注册 | `router/api.go` | 注册新路由 |

#### Wave 4：前端界面（Day 11-14）

| 任务 | 文件 | 说明 |
|------|------|------|
| 令牌创建/编辑表单 | `web/default/src/pages/Token/Form.js` | 添加限额配置 |
| **批量创建令牌表单** | `web/default/src/pages/Token/BatchCreate.js` | **支持逗号分隔批量创建** |
| 令牌使用统计页面 | `web/default/src/pages/Token/Stats.js` | 新增统计页面 |
| 使用趋势图表 | `web/default/src/components/TokenUsageChart.js` | 可视化组件 |

---

### 阶段二：统计报表系统（第 3 周）

**目标**: 提供全面的统计分析和可视化

#### Wave 1：统计API开发（Day 1-3）

| 任务 | 文件 | 说明 |
|------|------|------|
| 统计控制器 | `controller/statistics.go` | 统一统计入口 |
| 令牌统计服务 | `service/token_stats.go` | 令牌维度的统计 |
| 模型统计服务 | `service/model_stats.go` | 模型维度的统计 |
| 用户统计服务 | `service/user_stats.go` | 用户维度的统计 |

#### Wave 2：数据聚合任务（Day 4-5）

| 任务 | 文件 | 说明 |
|------|------|------|
| 定时聚合任务 | `model/stats_aggregator.go` | 每小时聚合 |
| 统计数据缓存 | `common/stats_cache.go` | Redis 缓存 |
| 历史数据清理 | `model/stats_cleanup.go` | 自动清理 |

#### Wave 3：前端报表页面（Day 6-7）

| 任务 | 文件 | 说明 |
|------|------|------|
| 总览仪表盘 | `web/default/src/pages/Dashboard/Overview.js` | 重新设计 |
| 令牌报表页面 | `web/default/src/pages/Reports/Tokens.js` | 新增页面 |
| 模型报表页面 | `web/default/src/pages/Reports/Models.js` | 新增页面 |
| 用户报表页面 | `web/default/src/pages/Reports/Users.js` | 新增页面 |
| 趋势图表组件 | `web/default/src/components/charts/` | 多种图表 |

---

### 阶段三：日志查询优化（第 4 周）

**目标**: 提升日志查询体验和功能

#### Wave 1：后端优化（Day 1-3）

| 任务 | 文件 | 说明 |
|------|------|------|
| 日志查询重构 | `model/log.go` | 返回总数 |
| 模糊搜索实现 | `model/log_search.go` | 全文搜索 |
| 高级筛选实现 | `model/log_filter.go` | 组合筛选 |
| 导出功能实现 | `controller/log_export.go` | CSV/Excel 导出 |

#### Wave 2：前端优化（Day 4-5）

| 任务 | 文件 | 说明 |
|------|------|------|
| 分页组件优化 | `web/default/src/components/Pagination.js` | 显示总数 |
| 搜索组件重构 | `web/default/src/components/LogSearch.js` | 模糊搜索UI |
| 高级筛选面板 | `web/default/src/components/LogFilter.js` | 筛选UI |
| 导出功能UI | `web/default/src/components/LogExport.js` | 导出按钮 |

#### Wave 3：性能优化（Day 6-7）

| 任务 | 文件 | 说明 |
|------|------|------|
| 数据库索引优化 | `bin/add_log_indexes.sql` | 添加索引 |
| 查询性能优化 | `model/log_optimization.go` | 查询优化 |
| 缓存策略 | `common/log_cache.go` | 热点数据缓存 |

---

## 五、验证与测试

### 5.1 单元测试

```bash
# 运行所有测试
go test -cover ./...

# 特定模块测试
go test ./model -run TestToken
go test ./controller -run TestLog
go test ./service -run TestStatistics
```

### 5.2 集成测试

**令牌限额测试**:
```bash
# 测试每日限额
curl -X POST http://localhost:3000/api/token \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"name":"test", "daily_quota_limit":1000}'

# 使用令牌
curl http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"model":"gpt-3.5-turbo", "messages":[...]}'

# 验证限额
curl http://localhost:3000/api/token/:id/usage
```

**统计API测试**:
```bash
# 总览统计
curl http://localhost:3000/api/stats/overview

# 令牌统计
curl http://localhost:3000/api/stats/tokens?start=2024-01-01&end=2024-01-31

# 模型排行
curl http://localhost:3000/api/stats/ranking/models
```

**日志查询测试**:
```bash
# 模糊搜索
curl "http://localhost:3000/api/log/search?keyword=gpt-4"

# 高级筛选
curl "http://localhost:3000/api/log/advanced?model_name=gpt-4&start_timestamp=...&end_timestamp=..."

# 导出
curl "http://localhost:3000/api/log/export?format=csv" -o logs.csv
```

### 5.3 性能测试

**测试场景**:
- 1000万条日志的查询性能
- 1000个令牌的统计聚合
- 高并发请求的限额检查

**性能指标**:
- 日志查询 < 500ms
- 统计聚合 < 2s
- 限额检查 < 10ms

---

## 六、风险评估与应对

### 6.1 技术风险

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| 数据库迁移失败 | 高 | 先备份，分步迁移，回滚方案 |
| Redis缓存失效 | 中 | 本地缓存降级，限流保护 |
| 性能下降 | 中 | 预聚合表，索引优化，查询优化 |

### 6.2 业务风险

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| 现有令牌额度丢失 | 高 | 数据迁移脚本，保留旧字段 |
| 用户体验变差 | 中 | 灰度发布，逐步切换 |
| 功能不兼容 | 中 | 版本控制，API版本化 |

---

## 七、部署方案

### 7.1 灰度发布

```
阶段 1: 内部测试环境（1-2天）
阶段 2: 预发布环境（2-3天）
阶段 3: 生产环境灰度（10%用户，3-5天）
阶段 4: 生产环境全量
```

### 7.2 数据迁移

```sql
-- 1. 备份数据
mysqldump -u root -p one-api > backup_$(date +%Y%m%d).sql

-- 2. 添加新字段
ALTER TABLE tokens ADD COLUMN daily_quota_limit BIGINT DEFAULT 0;
ALTER TABLE tokens ADD COLUMN hourly_quota_limit BIGINT DEFAULT 0;
-- ... 其他字段

-- 3. 创建新表
CREATE TABLE token_usage (...);
CREATE TABLE statistics (...);

-- 4. 初始化历史数据（可选）
INSERT INTO token_usage (...) SELECT ... FROM logs WHERE ...;
```

### 7.3 回滚方案

```bash
# 1. 停止新版本服务
docker-compose down

# 2. 恢复数据库
mysql -u root -p one-api < backup_20240101.sql

# 3. 启动旧版本服务
docker-compose -f docker-compose.v1.yml up -d

# 4. 验证服务正常
curl http://localhost:3000/api/status
```

---

## 八、后续规划

### 8.1 第二期功能

- 告警系统（额度不足、异常使用）
- 成本预算管理
- 多租户支持
- 自定义报表

### 8.2 性能优化

- 读写分离
- 分库分表
- 数据归档

---

## 九、验收标准

### 9.1 功能验收

- [ ] 令牌支持每日/小时限额配置
- [ ] 令牌限额超限返回明确错误
- [ ] 统计报表展示正确数据
- [ ] 日志分页显示总数
- [ ] 日志支持模糊搜索
- [ ] 日志支持导出功能

### 9.2 性能验收

- [ ] 日志查询 < 500ms
- [ ] 统计查询 < 1s
- [ ] 限额检查 < 10ms

### 9.3 稳定性验收

- [ ] 连续运行 7 天无崩溃
- [ ] 内存占用稳定
- [ ] CPU 使用率正常

---

---

## 十、日志数据管理策略（新增）

### 10.1 当前系统分析

**好消息**：系统已优化，**不存储大量对话内容**

**Content字段内容**：
```go
// relay/controller/helper.go:postConsumeQuota
logContent := fmt.Sprintf("倍率：%.2f × %.2f × %.2f", modelRatio, groupRatio, completionRatio)
// 只存储倍率信息，不存储prompt和completion
```

**Log模型字段（单条约100-200字节）**：
- 元数据：UserId, Username, TokenName, ModelName, ChannelId
- 统计：PromptTokens, CompletionTokens, Quota, ElapsedTime
- 短文本：Content（倍率信息）
- 状态：Type, IsStream, SystemPromptReset

### 10.2 数据增长预估

| 用户数 | 日均调用 | 日增记录 | 月增记录 | 年增记录 |
|--------|----------|----------|----------|----------|
| 100 | 10 | 1,000 | 30,000 | 36万 |
| 1,000 | 100 | 100,000 | 300万 | 3600万 |
| 10,000 | 100 | 1,000,000 | 3000万 | 3.6亿 |

**存储评估**（单条约150字节）：
- 300万条 ≈ 450MB
- 3600万条 ≈ 5.4GB
- 3.6亿条 ≈ 54GB

### 10.3 日志分级存储策略

#### 策略A：热温冷分级

```
热数据（Hot）：最近7天
├── 存储位置：主数据库（MySQL/PostgreSQL）
├── 查询性能：毫秒级
└── 功能：实时查询、统计分析

温数据（Warm）：8天-90天
├── 存储位置：归档表（同一数据库）
├── 查询性能：秒级
└── 功能：历史查询、报表生成

冷数据（Cold）：90天以上
├── 存储位置：对象存储（S3/OSS）或归档数据库
├── 查询性能：分钟级
└── 功能：审计、合规查询
```

#### 策略B：定期归档

```sql
-- 1. 创建归档表（按月分表）
CREATE TABLE logs_archive_202401 LIKE logs;
CREATE TABLE logs_archive_202402 LIKE logs;

-- 2. 定期迁移（每月执行）
INSERT INTO logs_archive_202401 
SELECT * FROM logs 
WHERE created_at >= UNIX_TIMESTAMP('2024-01-01 00:00:00') 
  AND created_at < UNIX_TIMESTAMP('2024-02-01 00:00:00');

DELETE FROM logs 
WHERE created_at >= UNIX_TIMESTAMP('2024-01-01 00:00:00') 
  AND created_at < UNIX_TIMESTAMP('2024-02-01 00:00:00');

-- 3. 压缩归档表
ALTER TABLE logs_archive_202401 ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
```

### 10.4 数据库优化方案

#### 10.4.1 索引优化

```sql
-- 当前索引
CREATE INDEX idx_user_id ON logs(user_id);
CREATE INDEX idx_created_at_type ON logs(created_at, type);
CREATE INDEX idx_token_name ON logs(token_name);
CREATE INDEX idx_model_name ON logs(model_name);

-- 新增优化索引
CREATE INDEX idx_user_created ON logs(user_id, created_at);
CREATE INDEX idx_token_created ON logs(token_name, created_at);
CREATE INDEX idx_model_created ON logs(model_name, created_at);
CREATE INDEX idx_channel_created ON logs(channel_id, created_at);

-- 复合索引用于统计查询
CREATE INDEX idx_stats_query ON logs(created_at, user_id, model_name);
```

#### 10.4.2 分区表方案

```sql
-- 按月分区（MySQL 8.0+）
ALTER TABLE logs PARTITION BY RANGE (created_at) (
    PARTITION p202401 VALUES LESS THAN (UNIX_TIMESTAMP('2024-02-01')),
    PARTITION p202402 VALUES LESS THAN (UNIX_TIMESTAMP('2024-03-01')),
    PARTITION p202403 VALUES LESS THAN (UNIX_TIMESTAMP('2024-04-01')),
    PARTITION pmax VALUES LESS THAN MAXVALUE
);

-- 自动删除旧分区
ALTER TABLE logs DROP PARTITION p202301;
```

#### 10.4.3 读写分离

```
写入：主库（Master）
├── 实时写入日志
└── 使用批量插入优化

读取：从库（Slave）/ 只读实例
├── 日志查询
├── 统计分析
└── 报表生成
```

### 10.5 统计数据预聚合

#### 10.5.1 预聚合表设计

```go
// model/log_stats.go
type LogDailyStats struct {
    Id                uint      `json:"id" gorm:"primaryKey"`
    DateKey           string    `json:"date_key" gorm:"uniqueIndex:idx_date_dim"` // YYYY-MM-DD
    
    // 维度
    UserId            int       `json:"user_id" gorm:"uniqueIndex:idx_date_dim"`
    TokenId           int       `json:"token_id" gorm:"uniqueIndex:idx_date_dim"`
    ModelName         string    `json:"model_name" gorm:"uniqueIndex:idx_date_dim"`
    ChannelId         int       `json:"channel_id" gorm:"uniqueIndex:idx_date_dim"`
    
    // 聚合指标
    RequestCount      int64     `json:"request_count"`
    QuotaSum          int64     `json:"quota_sum"`
    PromptTokenSum    int64     `json:"prompt_token_sum"`
    CompletionTokenSum int64    `json:"completion_token_sum"`
    AvgElapsedTime    float64   `json:"avg_elapsed_time"`
    SuccessCount      int64     `json:"success_count"`
    FailCount         int64     `json:"fail_count"`
}

// 每日凌晨聚合昨日数据
func AggregateDailyStats() {
    sql := `
        INSERT INTO log_daily_stats (date_key, user_id, token_id, model_name, channel_id,
            request_count, quota_sum, prompt_token_sum, completion_token_sum, avg_elapsed_time)
        SELECT 
            DATE_FORMAT(FROM_UNIXTIME(created_at), '%Y-%m-%d'),
            user_id,
            token_name,
            model_name,
            channel_id,
            COUNT(*),
            SUM(quota),
            SUM(prompt_tokens),
            SUM(completion_tokens),
            AVG(elapsed_time)
        FROM logs
        WHERE created_at >= UNIX_TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 1 DAY))
          AND created_at < UNIX_TIMESTAMP(CURDATE())
        GROUP BY user_id, token_name, model_name, channel_id
        ON DUPLICATE KEY UPDATE
            request_count = VALUES(request_count),
            quota_sum = VALUES(quota_sum),
            prompt_token_sum = VALUES(prompt_token_sum),
            completion_token_sum = VALUES(completion_token_sum),
            avg_elapsed_time = VALUES(avg_elapsed_time)
    `
}
```

#### 10.5.2 查询优化

```go
// 查询最近30天的统计数据
func GetStatsLast30Days(userId int) ([]*LogDailyStats, error) {
    var stats []*LogDailyStats
    err := DB.Where("user_id = ? AND date_key >= ?", 
        userId, time.Now().AddDate(0, 0, -30).Format("2006-01-02")).
        Order("date_key desc").
        Find(&stats).Error
    return stats, err
}

// 从预聚合表查询，性能提升100倍+
// 原始查询：扫描数百万条logs记录
// 优化查询：扫描几百条stats记录
```

### 10.6 内容存储扩展方案（可选）

**如果未来需要存储完整对话内容**：

#### 方案A：JSON压缩存储

```go
type LogContent struct {
    Prompt      []Message `json:"prompt"`
    Completion  string    `json:"completion"`
}

// 压缩后存储
func StoreLogContent(content *LogContent) string {
    json, _ := json.Marshal(content)
    compressed := gzip.Compress(json)  // 压缩率约70%
    return base64.Encode(compressed)
}
```

#### 方案B：分离存储

```go
// 新增 log_contents 表
type LogContent struct {
    LogId       uint      `json:"log_id" gorm:"primaryKey;index"`
    Prompt      string    `json:"prompt" gorm:"type:MEDIUMTEXT"`     // 最大16MB
    Completion  string    `json:"completion" gorm:"type:MEDIUMTEXT"`
    CreatedAt   int64     `json:"created_at" gorm:"index"`
}

// 主表不存储内容，关联查询
// 优点：主表轻量，查询快
// 缺点：需要JOIN查询
```

#### 方案C：对象存储

```go
// 对话内容存对象存储
type LogContentRef struct {
    LogId       uint      `json:"log_id" gorm:"primaryKey"`
    ContentUrl  string    `json:"content_url"`  // s3://bucket/logs/2024/01/xxx.json.gz
    ContentSize int64     `json:"content_size"`
}

// 优点：无限扩展，成本低
// 缺点：查询需要额外请求
```

### 10.7 实施建议

#### 阶段一：立即实施

1. **添加复合索引**（零停机）
   ```sql
   CREATE INDEX idx_user_created ON logs(user_id, created_at);
   CREATE INDEX idx_token_created ON logs(token_name, created_at);
   ```

2. **预聚合表**（新增功能）
   - 创建 `log_daily_stats` 表
   - 添加定时任务每日聚合

3. **日志清理策略**（可配置）
   ```bash
   # .env
   LOG_RETENTION_DAYS=90      # 保留90天
   LOG_ARCHIVE_ENABLED=true   # 启用归档
   ```

#### 阶段二：中期优化

1. **分区表**（需停机维护）
   - 按月分区logs表
   - 自动删除旧分区

2. **读写分离**
   - 配置主从复制
   - 统计查询走从库

#### 阶段三：长期架构

1. **数据归档系统**
   - 冷数据迁移到对象存储
   - 提供归档查询接口

2. **内容存储扩展**（如需要）
   - 分离存储对话内容
   - 支持全文检索

### 10.8 监控指标

```yaml
日志系统监控:
  - 日志总量：当前总记录数
  - 日增长量：每日新增记录数
  - 表大小：logs表占用空间
  - 查询性能：日志查询平均耗时
  - 聚合延迟：预聚合任务执行时间

告警阈值:
  - 日增长量 > 100万条
  - 表大小 > 10GB
  - 查询耗时 > 5秒
  - 聚合延迟 > 10分钟
```

---

---

## 十一、二期规划（后续迭代）

> **说明**: 以下功能作为二期规划，在核心功能稳定后逐步实施。

### 11.1 告警与通知系统

**优先级**: 🔴 高 | **预估工期**: 3-5天

#### 11.1.1 告警场景

```yaml
令牌告警:
  - 令牌额度即将用尽（<10%阈值可配置）
  - 令牌达到每日/小时限额
  - 令牌异常高频使用（突发流量检测）
  - 令牌状态变更（禁用/过期）

渠道告警:
  - 渠道成功率下降（<80%阈值可配置）
  - 渠道响应时间过长（>5s可配置）
  - 渠道余额不足
  - 渠道自动禁用通知

系统告警:
  - 数据库连接异常
  - Redis连接失败
  - 磁盘空间不足（<20%）
  - 内存使用率过高（>85%）

成本告警:
  - 用户消费超过预算
  - 单日消费异常增长（环比增长>50%）
  - 模型成本异常波动
```

#### 11.1.2 数据模型

```go
// model/alert.go
type Alert struct {
    Id          uint      `json:"id" gorm:"primaryKey"`
    Type        string    `json:"type" gorm:"index"`        // token_quota_low, channel_fail, cost_overrun
    Level       string    `json:"level"`                    // info, warning, critical
    Title       string    `json:"title"`
    Content     string    `json:"content"`
    TargetType  string    `json:"target_type"`              // token, channel, user
    TargetId    int       `json:"target_id" gorm:"index"`
    CreatedAt   int64     `json:"created_at" gorm:"index"`
    IsRead      bool      `json:"is_read" gorm:"default:false"`
    IsHandled   bool      `json:"is_handled" gorm:"default:false"`
}

// model/webhook.go
type Webhook struct {
    Id          uint      `json:"id" gorm:"primaryKey"`
    Name        string    `json:"name"`
    Url         string    `json:"url" gorm:"type:varchar(500)"`
    Secret      string    `json:"secret"`
    Events      string    `json:"events" gorm:"type:text"`   // JSON: ["token.quota.low", "channel.fail"]
    IsActive    bool      `json:"is_active" gorm:"default:true"`
    CreatedAt   int64     `json:"created_at"`
}

// model/alert_rule.go
type AlertRule struct {
    Id              uint    `json:"id" gorm:"primaryKey"`
    Name            string  `json:"name"`
    Type            string  `json:"type" gorm:"index"`
    Condition       string  `json:"condition"`           // JSON条件表达式
    Threshold       float64 `json:"threshold"`
    NotifyChannels  string  `json:"notify_channels"`     // JSON: ["email", "webhook"]
    IsEnabled       bool    `json:"is_enabled" gorm:"default:true"`
}
```

#### 11.1.3 通知渠道

| 渠道 | 状态 | 说明 |
|------|------|------|
| 邮件通知 | ✅ 已有 | 基于现有 SMTP 配置 |
| Webhook | ❌ 新增 | 通用 HTTP 回调 |
| 企业微信 | ❌ 新增 | 企业微信机器人 |
| 钉钉 | ❌ 新增 | 钉钉机器人 |
| Telegram | ❌ 新增 | Telegram Bot |

#### 11.1.4 实现要点

```go
// service/alert_service.go
func CheckAndSendAlerts() {
    // 1. 检查令牌额度
    checkTokenQuotaAlerts()
    
    // 2. 检查渠道状态
    checkChannelAlerts()
    
    // 3. 检查系统状态
    checkSystemAlerts()
    
    // 4. 检查成本告警
    checkCostAlerts()
}

func SendAlert(alert *Alert, channels []string) {
    for _, channel := range channels {
        switch channel {
        case "email":
            sendEmailAlert(alert)
        case "webhook":
            sendWebhookAlert(alert)
        case "wechat":
            sendWechatAlert(alert)
        }
    }
}
```

---

### 11.2 预算与成本管理

**优先级**: 🔴 高 | **预估工期**: 5-7天

#### 11.2.1 预算控制

```yaml
预算类型:
  月度预算:
    - 设置每月消费上限
    - 使用进度提醒（50%/80%/100%）
    - 超预算自动限制或告警
    
  项目预算:
    - 按项目/部门分配预算
    - 独立计费和统计
    - 预算余额追踪
```

#### 11.2.2 数据模型

```go
// model/budget.go
type Budget struct {
    Id              uint      `json:"id" gorm:"primaryKey"`
    UserId          int       `json:"user_id" gorm:"index"`
    Month           string    `json:"month" gorm:"index"`           // 2024-01
    BudgetLimit     int64     `json:"budget_limit"`                  // 月度预算（quota单位）
    UsedAmount      int64     `json:"used_amount"`                   // 已使用
    AlertThresholds string    `json:"alert_thresholds"`              // JSON: [50, 80, 100]
    AutoLimit       bool      `json:"auto_limit"`                    // 超预算自动限制
    Status          string    `json:"status"`                        // active, exceeded, closed
    CreatedAt       int64     `json:"created_at"`
    UpdatedAt       int64     `json:"updated_at"`
}

// model/cost_allocation.go
type CostAllocation struct {
    Id          uint      `json:"id" gorm:"primaryKey"`
    UserId      int       `json:"user_id" gorm:"index"`
    Department  string    `json:"department" gorm:"index"`
    Project     string    `json:"project" gorm:"index"`
    Month       string    `json:"month" gorm:"index"`
    CostAmount  int64     `json:"cost_amount"`
    TokenCount  int64     `json:"token_count"`
    CreatedAt   int64     `json:"created_at"`
}
```

#### 11.2.3 成本分析功能

```yaml
分析维度:
  按用户:
    - 各用户成本占比
    - 成本趋势
    - 异常消费识别
    
  按模型:
    - 各模型成本占比
    - 模型性价比分析
    - 成本优化建议
    
  按时间:
    - 日/周/月成本趋势
    - 环比/同比分析
    - 成本预测
    
  按部门/项目:
    - 成本分摊
    - 部门预算执行
    - ROI分析
```

#### 11.2.4 异常检测

```go
// service/anomaly_detection.go
func DetectCostAnomaly(userId int, todayCost int64) *Alert {
    // 1. 获取历史数据（最近7天）
    history := GetRecentCostHistory(userId, 7)
    
    // 2. 计算平均值和标准差
    avg, stdDev := calculateStats(history)
    
    // 3. 检测异常（超过2个标准差）
    if todayCost > avg + 2*stdDev {
        return &Alert{
            Type:    "cost_anomaly",
            Level:   "warning",
            Title:   "成本异常增长",
            Content: fmt.Sprintf("今日消费%.2f，超过平均值%.2f的2倍标准差", todayCost, avg),
        }
    }
    return nil
}
```

---

### 11.3 数据备份与恢复

**优先级**: 🔴 高 | **预估工期**: 2-3天

#### 11.3.1 备份策略

```yaml
自动备份:
  增量备份: 每日凌晨2点
  全量备份: 每周日凌晨3点
  保留策略:
    - 每日备份保留7天
    - 每周备份保留4周
    - 每月备份保留12月

备份内容:
  核心数据:
    - 用户表（users）
    - 令牌表（tokens）
    - 渠道表（channels）
    - 配置表（options）
    
  可选数据:
    - 日志表（logs）- 按需备份
    - 统计表（statistics）- 按需备份
```

#### 11.3.2 实现方案

```bash
# scripts/backup.sh
#!/bin/bash
set -e

BACKUP_DIR="${BACKUP_DIR:-/backup/one-api}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_TYPE="${1:-incremental}"  # incremental or full

mkdir -p $BACKUP_DIR

if [ "$BACKUP_TYPE" = "full" ]; then
    # 全量备份
    mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASS \
        --single-transaction \
        --routines \
        --triggers \
        one-api > $BACKUP_DIR/full_$DATE.sql
else
    # 增量备份（基于binlog或时间戳）
    mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASS \
        --single-transaction \
        --where="updated_at > DATE_SUB(NOW(), INTERVAL 1 DAY)" \
        one-api > $BACKUP_DIR/incr_$DATE.sql
fi

# 压缩
gzip $BACKUP_DIR/*.sql

# 上传到对象存储（可选）
if [ -n "$S3_BUCKET" ]; then
    aws s3 cp $BACKUP_DIR/*.sql.gz s3://$S3_BUCKET/one-api/
fi

# 清理旧备份
find $BACKUP_DIR -name "incr_*.sql.gz" -mtime +7 -delete
find $BACKUP_DIR -name "full_*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR"
```

```bash
# scripts/restore.sh
#!/bin/bash
set -e

BACKUP_FILE=$1
BACKUP_DIR="${BACKUP_DIR:-/backup/one-api}"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    echo "Available backups:"
    ls -lh $BACKUP_DIR/*.sql.gz
    exit 1
fi

# 解压
gunzip -c $BACKUP_DIR/$BACKUP_FILE > /tmp/restore.sql

# 恢复
mysql -h $DB_HOST -u $DB_USER -p$DB_PASS one-api < /tmp/restore.sql

# 清理
rm /tmp/restore.sql

echo "Restore completed from: $BACKUP_FILE"
```

#### 11.3.3 API接口

```
POST /api/backup/create          # 手动创建备份
GET  /api/backup/list            # 获取备份列表
POST /api/backup/restore         # 恢复指定备份
DELETE /api/backup/:id           # 删除备份
```

---

### 11.4 审计日志系统

**优先级**: 🟡 中 | **预估工期**: 3-5天

#### 11.4.1 审计范围

```yaml
用户操作:
  - 用户创建/删除
  - 角色权限变更
  - 登录成功/失败
  - 密码修改

令牌操作:
  - 令牌创建/删除
  - 额度调整
  - 状态变更
  - 限额修改

渠道操作:
  - 渠道添加/删除
  - 配置修改
  - 优先级调整
  - 启用/禁用

系统操作:
  - 系统配置修改
  - 批量导入/导出
  - 数据删除
```

#### 11.4.2 数据模型

```go
// model/audit_log.go
type AuditLog struct {
    Id            uint      `json:"id" gorm:"primaryKey"`
    UserId        int       `json:"user_id" gorm:"index"`
    Username      string    `json:"username"`
    Action        string    `json:"action" gorm:"index"`        // create_token, delete_user
    ResourceType  string    `json:"resource_type" gorm:"index"` // token, user, channel
    ResourceId    int       `json:"resource_id" gorm:"index"`
    ResourceName  string    `json:"resource_name"`
    OldValue      string    `json:"old_value" gorm:"type:text"`  // JSON
    NewValue      string    `json:"new_value" gorm:"type:text"`  // JSON
    IpAddress     string    `json:"ip_address"`
    UserAgent     string    `json:"user_agent"`
    RequestId     string    `json:"request_id"`
    CreatedAt     int64     `json:"created_at" gorm:"index"`
}

// 审计操作常量
const (
    ActionCreate   = "create"
    ActionUpdate   = "update"
    ActionDelete   = "delete"
    ActionLogin    = "login"
    ActionLogout   = "logout"
    ActionExport   = "export"
    ActionImport   = "import"
)
```

#### 11.4.3 审计中间件

```go
// middleware/audit.go
func AuditMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        // 记录请求开始时间
        start := time.Now()
        
        // 执行请求
        c.Next()
        
        // 只审计修改操作
        if c.Request.Method != "GET" {
            audit := &model.AuditLog{
                UserId:       GetCurrentUserId(c),
                Action:       getActionFromMethod(c.Request.Method),
                ResourceType: getResourceType(c.Request.URL.Path),
                ResourceId:   getResourceId(c),
                IpAddress:    c.ClientIP(),
                UserAgent:    c.Request.UserAgent(),
                RequestId:    c.GetString("request_id"),
                CreatedAt:    start.Unix(),
            }
            model.CreateAuditLog(audit)
        }
    }
}
```

---

### 11.5 系统健康检查与诊断

**优先级**: 🟡 中 | **预估工期**: 2-3天

#### 11.5.1 健康检查API

```
GET /api/health/basic       # 基础健康检查（负载均衡用）
GET /api/health/deep        # 深度健康检查（运维诊断）
GET /api/health/metrics     # 系统指标（监控用）
```

#### 11.5.2 检查项目

```go
// controller/health.go
type HealthStatus struct {
    Status      string            `json:"status"`     // healthy, degraded, unhealthy
    Timestamp   int64             `json:"timestamp"`
    Components  map[string]ComponentHealth `json:"components"`
}

type ComponentHealth struct {
    Status    string  `json:"status"`
    Latency   int64   `json:"latency_ms"`
    Message   string  `json:"message,omitempty"`
    Details   map[string]interface{} `json:"details,omitempty"`
}

func DeepHealthCheck(c *gin.Context) {
    status := &HealthStatus{
        Components: make(map[string]ComponentHealth),
    }
    
    // 1. 数据库检查
    status.Components["database"] = checkDatabase()
    
    // 2. Redis检查
    status.Components["redis"] = checkRedis()
    
    // 3. 磁盘空间
    status.Components["disk"] = checkDisk()
    
    // 4. 内存使用
    status.Components["memory"] = checkMemory()
    
    // 5. 连接池状态
    status.Components["connection_pool"] = checkConnectionPool()
    
    // 综合判断状态
    status.Status = determineOverallStatus(status.Components)
    
    c.JSON(200, status)
}

func checkDatabase() ComponentHealth {
    start := time.Now()
    
    // 执行简单查询
    var count int64
    err := DB.Raw("SELECT 1").Count(&count).Error
    
    latency := time.Since(start).Milliseconds()
    
    if err != nil {
        return ComponentHealth{
            Status:  "unhealthy",
            Latency: latency,
            Message: err.Error(),
        }
    }
    
    // 检查连接池
    stats := DB.Stats()
    
    return ComponentHealth{
        Status:  "healthy",
        Latency: latency,
        Details: map[string]interface{}{
            "open_connections": stats.OpenConnections,
            "in_use":           stats.InUse,
            "idle":             stats.Idle,
        },
    }
}
```

#### 11.5.3 性能诊断

```yaml
诊断指标:
  数据库:
    - 慢查询统计
    - 连接池使用率
    - 锁等待时间
    
  缓存:
    - 缓存命中率
    - 内存使用量
    - 键过期率
    
  API:
    - 平均响应时间
    - 错误率统计
    - 并发连接数
```

---

### 11.6 批量操作与管理

**优先级**: 🟡 中 | **预估工期**: 3-5天

#### 11.6.1 批量操作API

```
POST /api/user/batch/create       # 批量创建用户
POST /api/user/batch/update       # 批量更新用户
POST /api/token/batch/create      # 批量创建令牌
POST /api/token/batch/update      # 批量更新令牌
POST /api/channel/batch/test      # 批量测试渠道
POST /api/channel/batch/update    # 批量更新渠道

POST /api/import/users            # 导入用户（CSV/Excel）
POST /api/import/tokens           # 导入令牌
GET  /api/export/users            # 导出用户
GET  /api/export/tokens           # 导出令牌
GET  /api/export/logs             # 导出日志
```

#### 11.6.2 批量操作实现

```go
// controller/batch.go
type BatchOperation struct {
    Operation string        `json:"operation"`  // create, update, delete
    Items     []interface{} `json:"items"`
}

func BatchCreateTokens(c *gin.Context) {
    var req struct {
        Tokens []TokenRequest `json:"tokens"`
    }
    
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }
    
    results := make([]map[string]interface{}, len(req.Tokens))
    
    for i, tokenReq := range req.Tokens {
        token := &model.Token{
            UserId:     GetCurrentUserId(c),
            Name:       tokenReq.Name,
            RemainQuota: tokenReq.Quota,
        }
        
        err := model.CreateToken(token)
        
        results[i] = map[string]interface{}{
            "name":    tokenReq.Name,
            "success": err == nil,
            "error":   err,
            "id":      token.Id,
        }
    }
    
    c.JSON(200, gin.H{
        "success": true,
        "data":    results,
    })
}
```

#### 11.6.3 导入导出格式

```yaml
CSV格式:
  用户导入: username,email,password,group_id
  令牌导入: name,quota,expired_time,models
  
Excel格式:
  - 支持多Sheet
  - 自动类型识别
  - 模板下载
  
JSON格式:
  - 完整数据结构
  - 支持关联数据
```

---

### 11.7 多租户与权限增强（长期）

**优先级**: 🟢 低 | **预估工期**: 2-3周

```yaml
多租户架构:
  租户隔离:
    - 数据隔离（schema级别）
    - 配置隔离
    - 资源隔离
    
  独立计费:
    - 租户独立账单
    - 独立支付
    - 成本分摊

RBAC权限:
  角色管理:
    - 预设角色（admin, manager, user）
    - 自定义角色
    - 角色继承
    
  权限粒度:
    - 菜单权限
    - 操作权限
    - 数据权限
```

---

### 11.8 高可用架构（长期）

**优先级**: 🟢 低 | **预估工期**: 1-2周

```yaml
高可用方案:
  多实例部署:
    - 无状态服务
    - 负载均衡
    - 会话共享（Redis）
    
  故障转移:
    - 健康检查
    - 自动摘除
    - 自动恢复
    
  容灾备份:
    - 多数据中心
    - 异地容灾
    - 数据同步
```

---

### 11.9 开发者生态（长期）

**优先级**: 🟢 低 | **预估工期**: 2-3周

```yaml
SDK开发:
  Python SDK:
    - pip install one-api
    - 完整API封装
    - 异步支持
    
  Go SDK:
    - go get github.com/one-api/go-sdk
    - 类型安全
    - 错误处理
    
  Java SDK:
    - Maven依赖
    - Spring集成

CLI工具:
  one-api-cli:
    - 用户管理
    - 令牌管理
    - 批量操作
    - 状态检查

OpenAPI:
  自动文档:
    - Swagger集成
    - 在线测试
    - SDK生成
```

---

## 十二、二期实施路线图

### 12.1 时间规划

```
Phase 1 (1-2周): 告警与通知 + 数据备份
├── 告警系统框架
├── Webhook通知
├── 自动备份脚本
└── 恢复工具

Phase 2 (2-3周): 预算管理 + 审计日志
├── 预算设置API
├── 成本告警
├── 审计日志记录
└── 审计查询界面

Phase 3 (3-4周): 健康检查 + 批量操作
├── 深度健康检查
├── 性能诊断
├── 批量操作API
└── 导入导出功能

Phase 4 (长期): 架构升级
├── 多租户支持
├── 高可用架构
└── 开发者生态
```

### 12.2 优先级排序

| 功能 | 优先级 | 工期 | 业务价值 | 依赖关系 |
|------|--------|------|----------|----------|
| 数据备份恢复 | P0 | 2天 | 数据安全底线 | 无 |
| 告警通知系统 | P0 | 3天 | 故障及时响应 | 无 |
| 预算成本管理 | P1 | 5天 | 成本控制核心 | 无 |
| 审计日志 | P1 | 3天 | 合规要求 | 无 |
| 健康检查 | P2 | 2天 | 运维效率 | 无 |
| 批量操作 | P2 | 3天 | 管理效率 | 无 |
| 多租户 | P3 | 2周 | 企业级需求 | P0-P2完成 |
| 高可用 | P3 | 1周 | 稳定性保障 | P0-P2完成 |
| SDK/CLI | P3 | 2周 | 开发者体验 | API稳定 |

---

## 十三、总结

### 13.1 一期核心功能（当前计划）

- ✅ 令牌精细化管理（时间窗口限额、模型级别控制）
- ✅ 统计报表系统（令牌/模型/用户/趋势分析）
- ✅ 日志查询优化（模糊搜索、分页改进、导出功能）
- ✅ 日志数据管理（预聚合、索引优化、分区策略）

### 13.2 二期扩展功能（后续迭代）

- 🔄 告警与通知系统
- 🔄 预算与成本管理
- 🔄 数据备份与恢复
- 🔄 审计日志系统
- 🔄 系统健康检查
- 🔄 批量操作功能
- 🔄 多租户与高可用（长期）
- 🔄 开发者生态（长期）

### 13.3 实施建议

1. **一期先行**：先完成核心功能，满足当前业务需求
2. **逐步迭代**：二期功能按优先级分阶段实施
3. **用户反馈**：根据实际使用情况调整优先级
4. **技术债务**：保持代码质量，避免过度设计

---

## 附录

### A. 技术栈确认

- 后端：Go 1.20+, Gin, GORM
- 数据库：MySQL 8.0+ 或 PostgreSQL
- 缓存：Redis 6.0+
- 前端：React 18+, Semantic UI / MUI

### B. 参考资料

- OpenAI API Pricing: https://openai.com/pricing
- GORM 文档: https://gorm.io/docs/
- Gin 框架: https://gin-gonic.com/docs/

### C. 相关代码位置

```
model/token.go          # 令牌模型
model/log.go            # 日志模型
controller/log.go       # 日志API
controller/user.go      # 用户统计
middleware/auth.go      # 认证中间件
relay/billing/          # 计费逻辑
```