package controller

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/songquanpeng/one-api/common/config"
	"github.com/songquanpeng/one-api/common/ctxkey"
	"github.com/songquanpeng/one-api/common/helper"
	"github.com/songquanpeng/one-api/common/network"
	"github.com/songquanpeng/one-api/common/random"
	"github.com/songquanpeng/one-api/model"
)

func GetAllTokens(c *gin.Context) {
	userId := c.GetInt(ctxkey.Id)
	p, _ := strconv.Atoi(c.Query("p"))
	if p < 0 {
		p = 0
	}

	order := c.Query("order")
	tokens, err := model.GetAllUserTokens(userId, p*config.ItemsPerPage, config.ItemsPerPage, order)

	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    tokens,
	})
	return
}

func SearchTokens(c *gin.Context) {
	userId := c.GetInt(ctxkey.Id)
	keyword := c.Query("keyword")
	tokens, err := model.SearchUserTokens(userId, keyword)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    tokens,
	})
	return
}

func GetToken(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	userId := c.GetInt(ctxkey.Id)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	token, err := model.GetTokenByIds(id, userId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    token,
	})
	return
}

// BatchCreateTokenRequest represents the request body for batch token creation
type BatchCreateTokenRequest struct {
	Names             string  `json:"names" binding:"required"` // Comma, newline, or semicolon separated names
	RemainQuota       int64   `json:"remain_quota"`
	UnlimitedQuota    bool    `json:"unlimited_quota"`
	ExpiredTime       int64   `json:"expired_time"`
	Models            *string `json:"models"`
	Subnet            *string `json:"subnet"`
	DailyQuotaLimit   int64   `json:"daily_quota_limit"`
	HourlyQuotaLimit  int64   `json:"hourly_quota_limit"`
	MonthlyQuotaLimit int64   `json:"monthly_quota_limit"`
	QuotaResetTime    int64   `json:"quota_reset_time"`
	QuotaTimezone     *string `json:"quota_timezone"`
	ModelQuotas       *string `json:"model_quotas"`
	RequestsPerMinute int     `json:"requests_per_minute"`
	RequestsPerHour   int     `json:"requests_per_hour"`
	AllowedHours      *string `json:"allowed_hours"`
	AllowedDays       *string `json:"allowed_days"`
}

// BatchTokenResult represents the result of a single token creation
type BatchTokenResult struct {
	Name    string `json:"name"`
	Key     string `json:"key,omitempty"`
	Success bool   `json:"success"`
	Error   string `json:"error,omitempty"`
}

// BatchCreateTokenResponse represents the response for batch token creation
type BatchCreateTokenResponse struct {
	SuccessCount int                `json:"success_count"`
	FailCount    int                `json:"fail_count"`
	Results      []BatchTokenResult `json:"results"`
}

// BatchCreateToken creates multiple tokens at once
func BatchCreateToken(c *gin.Context) {
	userId := c.GetInt(ctxkey.Id)

	var req BatchCreateTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	names := parseTokenNames(req.Names)
	if len(names) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "未提供有效的令牌名称",
		})
		return
	}

	const maxTokensPerBatch = 100
	if len(names) > maxTokensPerBatch {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": fmt.Sprintf("单次最多创建 %d 个令牌", maxTokensPerBatch),
		})
		return
	}

	dailyQuotaLimit := req.DailyQuotaLimit
	if dailyQuotaLimit == 0 {
		dailyQuotaLimit = -1
	}
	hourlyQuotaLimit := req.HourlyQuotaLimit
	if hourlyQuotaLimit == 0 {
		hourlyQuotaLimit = -1
	}
	monthlyQuotaLimit := req.MonthlyQuotaLimit
	if monthlyQuotaLimit == 0 {
		monthlyQuotaLimit = -1
	}
	requestsPerMinute := req.RequestsPerMinute
	if requestsPerMinute == 0 {
		requestsPerMinute = -1
	}
	requestsPerHour := req.RequestsPerHour
	if requestsPerHour == 0 {
		requestsPerHour = -1
	}

	response := BatchCreateTokenResponse{
		Results: make([]BatchTokenResult, 0, len(names)),
	}

	for _, name := range names {
		result := BatchTokenResult{
			Name: name,
		}

		if len(name) > 30 {
			result.Success = false
			result.Error = "令牌名称过长"
			response.FailCount++
			response.Results = append(response.Results, result)
			continue
		}

		token := model.Token{
			UserId:            userId,
			Name:              name,
			Key:               random.GenerateKey(),
			CreatedTime:       helper.GetTimestamp(),
			AccessedTime:      helper.GetTimestamp(),
			ExpiredTime:       req.ExpiredTime,
			RemainQuota:       req.RemainQuota,
			UnlimitedQuota:    req.UnlimitedQuota,
			Models:            req.Models,
			Subnet:            req.Subnet,
			DailyQuotaLimit:   dailyQuotaLimit,
			HourlyQuotaLimit:  hourlyQuotaLimit,
			MonthlyQuotaLimit: monthlyQuotaLimit,
			QuotaResetTime:    req.QuotaResetTime,
			QuotaTimezone:     req.QuotaTimezone,
			ModelQuotas:       req.ModelQuotas,
			RequestsPerMinute: requestsPerMinute,
			RequestsPerHour:   requestsPerHour,
			AllowedHours:      req.AllowedHours,
			AllowedDays:       req.AllowedDays,
		}

		if err := validateToken(c, token); err != nil {
			result.Success = false
			result.Error = err.Error()
			response.FailCount++
			response.Results = append(response.Results, result)
			continue
		}

		if err := token.Insert(); err != nil {
			result.Success = false
			result.Error = err.Error()
			response.FailCount++
			response.Results = append(response.Results, result)
			continue
		}

		result.Success = true
		result.Key = token.Key
		response.SuccessCount++
		response.Results = append(response.Results, result)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"success_count": response.SuccessCount,
			"fail_count":    response.FailCount,
			"results":       response.Results,
		},
	})
}

// parseTokenNames parses a string of token names separated by comma, newline, or semicolon
func parseTokenNames(names string) []string {
	normalized := strings.ReplaceAll(names, "\n", ",")
	normalized = strings.ReplaceAll(normalized, ";", ",")

	parts := strings.Split(normalized, ",")

	result := make([]string, 0, len(parts))
	for _, part := range parts {
		name := strings.TrimSpace(part)
		if name != "" {
			result = append(result, name)
		}
	}

	return result
}

func GetTokenStatus(c *gin.Context) {
	tokenId := c.GetInt(ctxkey.TokenId)
	userId := c.GetInt(ctxkey.Id)
	token, err := model.GetTokenByIds(tokenId, userId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	expiredAt := token.ExpiredTime
	if expiredAt == -1 {
		expiredAt = 0
	}
	c.JSON(http.StatusOK, gin.H{
		"object":          "credit_summary",
		"total_granted":   token.RemainQuota,
		"total_used":      0, // not supported currently
		"total_available": token.RemainQuota,
		"expires_at":      expiredAt * 1000,
	})
}

func validateToken(c *gin.Context, token model.Token) error {
	if len(token.Name) > 30 {
		return fmt.Errorf("令牌名称过长")
	}
	if token.Subnet != nil && *token.Subnet != "" {
		err := network.IsValidSubnets(*token.Subnet)
		if err != nil {
			return fmt.Errorf("无效的网段：%s", err.Error())
		}
	}
	// Validate quota limit fields: must be >= -1 (-1 means unlimited)
	if token.DailyQuotaLimit < -1 {
		return fmt.Errorf("每日额度限制无效，必须大于等于 -1")
	}
	if token.HourlyQuotaLimit < -1 {
		return fmt.Errorf("每小时额度限制无效，必须大于等于 -1")
	}
	if token.MonthlyQuotaLimit < -1 {
		return fmt.Errorf("每月额度限制无效，必须大于等于 -1")
	}
	// Validate rate limit fields: must be >= -1 (-1 means unlimited)
	if token.RequestsPerMinute < -1 {
		return fmt.Errorf("每分钟请求限制无效，必须大于等于 -1")
	}
	if token.RequestsPerHour < -1 {
		return fmt.Errorf("每小时请求限制无效，必须大于等于 -1")
	}
	return nil
}

func AddToken(c *gin.Context) {
	token := model.Token{}
	err := c.ShouldBindJSON(&token)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	err = validateToken(c, token)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": fmt.Sprintf("参数错误：%s", err.Error()),
		})
		return
	}

	cleanToken := model.Token{
		UserId:            c.GetInt(ctxkey.Id),
		Name:              token.Name,
		Key:               random.GenerateKey(),
		CreatedTime:       helper.GetTimestamp(),
		AccessedTime:      helper.GetTimestamp(),
		ExpiredTime:       token.ExpiredTime,
		RemainQuota:       token.RemainQuota,
		UnlimitedQuota:    token.UnlimitedQuota,
		Models:            token.Models,
		Subnet:            token.Subnet,
		DailyQuotaLimit:   token.DailyQuotaLimit,
		HourlyQuotaLimit:  token.HourlyQuotaLimit,
		MonthlyQuotaLimit: token.MonthlyQuotaLimit,
		QuotaResetTime:    token.QuotaResetTime,
		QuotaTimezone:     token.QuotaTimezone,
		ModelQuotas:       token.ModelQuotas,
		RequestsPerMinute: token.RequestsPerMinute,
		RequestsPerHour:   token.RequestsPerHour,
		AllowedHours:      token.AllowedHours,
		AllowedDays:       token.AllowedDays,
	}
	err = cleanToken.Insert()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    cleanToken,
	})
	return
}

func DeleteToken(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	userId := c.GetInt(ctxkey.Id)
	err := model.DeleteTokenById(id, userId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
	return
}

func UpdateToken(c *gin.Context) {
	userId := c.GetInt(ctxkey.Id)
	statusOnly := c.Query("status_only")
	token := model.Token{}
	err := c.ShouldBindJSON(&token)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	err = validateToken(c, token)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": fmt.Sprintf("参数错误：%s", err.Error()),
		})
		return
	}
	cleanToken, err := model.GetTokenByIds(token.Id, userId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	if token.Status == model.TokenStatusEnabled {
		if cleanToken.Status == model.TokenStatusExpired && cleanToken.ExpiredTime <= helper.GetTimestamp() && cleanToken.ExpiredTime != -1 {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "令牌已过期，无法启用，请先修改令牌过期时间，或者设置为永不过期",
			})
			return
		}
		if cleanToken.Status == model.TokenStatusExhausted && cleanToken.RemainQuota <= 0 && !cleanToken.UnlimitedQuota {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "令牌可用额度已用尽，无法启用，请先修改令牌剩余额度，或者设置为无限额度",
			})
			return
		}
	}
	if statusOnly != "" {
		cleanToken.Status = token.Status
	} else {
		cleanToken.Name = token.Name
		cleanToken.ExpiredTime = token.ExpiredTime
		cleanToken.RemainQuota = token.RemainQuota
		cleanToken.UnlimitedQuota = token.UnlimitedQuota
		cleanToken.Models = token.Models
		cleanToken.Subnet = token.Subnet
		cleanToken.DailyQuotaLimit = token.DailyQuotaLimit
		cleanToken.HourlyQuotaLimit = token.HourlyQuotaLimit
		cleanToken.MonthlyQuotaLimit = token.MonthlyQuotaLimit
		cleanToken.QuotaResetTime = token.QuotaResetTime
		cleanToken.QuotaTimezone = token.QuotaTimezone
		cleanToken.ModelQuotas = token.ModelQuotas
		cleanToken.RequestsPerMinute = token.RequestsPerMinute
		cleanToken.RequestsPerHour = token.RequestsPerHour
		cleanToken.AllowedHours = token.AllowedHours
		cleanToken.AllowedDays = token.AllowedDays
	}
	err = cleanToken.Update()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    cleanToken,
	})
	return
}
