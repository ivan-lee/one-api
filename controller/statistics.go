package controller

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/songquanpeng/one-api/common"
	"github.com/songquanpeng/one-api/common/config"
	"github.com/songquanpeng/one-api/common/ctxkey"
	"github.com/songquanpeng/one-api/model"
)

// GlobalStats represents overall system statistics
type GlobalStats struct {
	TotalUsers       int   `json:"total_users"`
	TotalTokens      int   `json:"total_tokens"`
	TotalChannels    int   `json:"total_channels"`
	TotalRequests    int   `json:"total_requests"`
	TotalQuota       int   `json:"total_quota"`
	TotalPromptTokens int  `json:"total_prompt_tokens"`
	TotalCompletionTokens int `json:"total_completion_tokens"`
}

// UserStats represents statistics for a single user
type UserStats struct {
	UserId            int    `json:"user_id" gorm:"column:user_id"`
	Username          string `json:"username" gorm:"column:username"`
	RequestCount      int    `json:"request_count" gorm:"column:request_count"`
	Quota             int    `json:"quota" gorm:"column:quota"`
	PromptTokens      int    `json:"prompt_tokens" gorm:"column:prompt_tokens"`
	CompletionTokens  int    `json:"completion_tokens" gorm:"column:completion_tokens"`
}

// ModelStats represents statistics for a single model
type ModelStats struct {
	ModelName        string `json:"model_name" gorm:"column:model_name"`
	RequestCount     int    `json:"request_count" gorm:"column:request_count"`
	Quota            int    `json:"quota" gorm:"column:quota"`
	PromptTokens     int    `json:"prompt_tokens" gorm:"column:prompt_tokens"`
	CompletionTokens int    `json:"completion_tokens" gorm:"column:completion_tokens"`
}

// TokenStatsResponse represents token statistics for listing
type TokenStatsResponse struct {
	TokenName        string `json:"token_name" gorm:"column:token_name"`
	RequestCount     int    `json:"request_count" gorm:"column:request_count"`
	Quota            int    `json:"quota" gorm:"column:quota"`
	PromptTokens     int    `json:"prompt_tokens" gorm:"column:prompt_tokens"`
	CompletionTokens int    `json:"completion_tokens" gorm:"column:completion_tokens"`
}

// GetGlobalStats returns overall system statistics
// GET /api/stats/overview
func GetGlobalStats(c *gin.Context) {
	startTimestamp, endTimestamp := parseTimeRange(c)
	
	stats := &GlobalStats{}
	
	// Get total counts
	var userCount, tokenCount, channelCount int64
	model.DB.Model(&model.User{}).Count(&userCount)
	model.DB.Model(&model.Token{}).Count(&tokenCount)
	model.DB.Model(&model.Channel{}).Count(&channelCount)
	
	stats.TotalUsers = int(userCount)
	stats.TotalTokens = int(tokenCount)
	stats.TotalChannels = int(channelCount)
	
	// Get log statistics
	ifnull := "ifnull"
	if common.UsingPostgreSQL {
		ifnull = "COALESCE"
	}
	
	query := model.LOG_DB.Table("logs").
		Select(fmt.Sprintf("%s(count(*), 0) as total_requests, %s(sum(quota), 0) as total_quota, %s(sum(prompt_tokens), 0) as total_prompt_tokens, %s(sum(completion_tokens), 0) as total_completion_tokens", ifnull, ifnull, ifnull, ifnull)).
		Where("type = ?", model.LogTypeConsume)
	
	if startTimestamp != 0 {
		query = query.Where("created_at >= ?", startTimestamp)
	}
	if endTimestamp != 0 {
		query = query.Where("created_at <= ?", endTimestamp)
	}
	
	query.Scan(stats)
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    stats,
	})
}

// GetTokenStats returns statistics for all tokens
// GET /api/stats/tokens
func GetTokenStats(c *gin.Context) {
	startTimestamp, endTimestamp := parseTimeRange(c)
	
	p, _ := strconv.Atoi(c.Query("p"))
	if p < 0 {
		p = 0
	}
	num, _ := strconv.Atoi(c.Query("num"))
	if num <= 0 {
		num = config.ItemsPerPage
	}
	
	var stats []*TokenStatsResponse
	
	query := model.LOG_DB.Table("logs").
		Select("token_name, count(1) as request_count, sum(quota) as quota, sum(prompt_tokens) as prompt_tokens, sum(completion_tokens) as completion_tokens").
		Where("type = ?", model.LogTypeConsume).
		Where("token_name != ''").
		Group("token_name").
		Order("request_count DESC")
	
	if startTimestamp != 0 {
		query = query.Where("created_at >= ?", startTimestamp)
	}
	if endTimestamp != 0 {
		query = query.Where("created_at <= ?", endTimestamp)
	}
	
	err := query.Limit(num).Offset(p * num).Scan(&stats).Error
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
		"data":    stats,
	})
}

// GetModelStats returns statistics by model
// GET /api/stats/models
func GetModelStats(c *gin.Context) {
	startTimestamp, endTimestamp := parseTimeRange(c)
	
	p, _ := strconv.Atoi(c.Query("p"))
	if p < 0 {
		p = 0
	}
	num, _ := strconv.Atoi(c.Query("num"))
	if num <= 0 {
		num = config.ItemsPerPage
	}
	
	var stats []*ModelStats
	
	query := model.LOG_DB.Table("logs").
		Select("model_name, count(1) as request_count, sum(quota) as quota, sum(prompt_tokens) as prompt_tokens, sum(completion_tokens) as completion_tokens").
		Where("type = ?", model.LogTypeConsume).
		Where("model_name != ''").
		Group("model_name").
		Order("request_count DESC")
	
	if startTimestamp != 0 {
		query = query.Where("created_at >= ?", startTimestamp)
	}
	if endTimestamp != 0 {
		query = query.Where("created_at <= ?", endTimestamp)
	}
	
	err := query.Limit(num).Offset(p * num).Scan(&stats).Error
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
		"data":    stats,
	})
}

// GetUserStats returns statistics by user
// GET /api/stats/users
func GetUserStats(c *gin.Context) {
	startTimestamp, endTimestamp := parseTimeRange(c)
	
	p, _ := strconv.Atoi(c.Query("p"))
	if p < 0 {
		p = 0
	}
	num, _ := strconv.Atoi(c.Query("num"))
	if num <= 0 {
		num = config.ItemsPerPage
	}
	
	var stats []*UserStats
	
	query := model.LOG_DB.Table("logs").
		Select("user_id, username, count(1) as request_count, sum(quota) as quota, sum(prompt_tokens) as prompt_tokens, sum(completion_tokens) as completion_tokens").
		Where("type = ?", model.LogTypeConsume).
		Group("user_id, username").
		Order("request_count DESC")
	
	if startTimestamp != 0 {
		query = query.Where("created_at >= ?", startTimestamp)
	}
	if endTimestamp != 0 {
		query = query.Where("created_at <= ?", endTimestamp)
	}
	
	err := query.Limit(num).Offset(p * num).Scan(&stats).Error
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
		"data":    stats,
	})
}

// GetStatsRanking returns top users/tokens/models
// GET /api/stats/ranking
func GetStatsRanking(c *gin.Context) {
	startTimestamp, endTimestamp := parseTimeRange(c)
	
	rankType := c.Query("type")
	if rankType == "" {
		rankType = "user"
	}
	
	limit, _ := strconv.Atoi(c.Query("limit"))
	if limit <= 0 || limit > 100 {
		limit = 10
	}
	
	orderBy := c.DefaultQuery("order_by", "quota")
	if orderBy != "quota" && orderBy != "request_count" && orderBy != "prompt_tokens" && orderBy != "completion_tokens" {
		orderBy = "quota"
	}
	
	var result interface{}
	var err error
	
	switch rankType {
	case "user":
		result, err = getUserRanking(startTimestamp, endTimestamp, orderBy, limit)
	case "token":
		result, err = getTokenRanking(startTimestamp, endTimestamp, orderBy, limit)
	case "model":
		result, err = getModelRanking(startTimestamp, endTimestamp, orderBy, limit)
	default:
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "invalid type, must be 'user', 'token' or 'model'",
		})
		return
	}
	
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
		"data":    result,
	})
}

// GetUserSelfStats returns statistics for current user
// GET /api/stats/self
func GetUserSelfStats(c *gin.Context) {
	userId := c.GetInt(ctxkey.Id)
	startTimestamp, endTimestamp := parseTimeRange(c)
	
	stats := &UserStats{}
	
	query := model.LOG_DB.Table("logs").
		Select("user_id, username, count(1) as request_count, sum(quota) as quota, sum(prompt_tokens) as prompt_tokens, sum(completion_tokens) as completion_tokens").
		Where("type = ?", model.LogTypeConsume).
		Where("user_id = ?", userId)
	
	if startTimestamp != 0 {
		query = query.Where("created_at >= ?", startTimestamp)
	}
	if endTimestamp != 0 {
		query = query.Where("created_at <= ?", endTimestamp)
	}
	
	err := query.Group("user_id, username").Scan(stats).Error
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
		"data":    stats,
	})
}

func getUserRanking(startTimestamp, endTimestamp int64, orderBy string, limit int) ([]*UserStats, error) {
	var stats []*UserStats
	
	query := model.LOG_DB.Table("logs").
		Select("user_id, username, count(1) as request_count, sum(quota) as quota, sum(prompt_tokens) as prompt_tokens, sum(completion_tokens) as completion_tokens").
		Where("type = ?", model.LogTypeConsume).
		Group("user_id, username").
		Order(orderBy + " DESC").
		Limit(limit)
	
	if startTimestamp != 0 {
		query = query.Where("created_at >= ?", startTimestamp)
	}
	if endTimestamp != 0 {
		query = query.Where("created_at <= ?", endTimestamp)
	}
	
	err := query.Scan(&stats).Error
	return stats, err
}

func getTokenRanking(startTimestamp, endTimestamp int64, orderBy string, limit int) ([]*TokenStatsResponse, error) {
	var stats []*TokenStatsResponse
	
	query := model.LOG_DB.Table("logs").
		Select("token_name, count(1) as request_count, sum(quota) as quota, sum(prompt_tokens) as prompt_tokens, sum(completion_tokens) as completion_tokens").
		Where("type = ?", model.LogTypeConsume).
		Where("token_name != ''").
		Group("token_name").
		Order(orderBy + " DESC").
		Limit(limit)
	
	if startTimestamp != 0 {
		query = query.Where("created_at >= ?", startTimestamp)
	}
	if endTimestamp != 0 {
		query = query.Where("created_at <= ?", endTimestamp)
	}
	
	err := query.Scan(&stats).Error
	return stats, err
}

func getModelRanking(startTimestamp, endTimestamp int64, orderBy string, limit int) ([]*ModelStats, error) {
	var stats []*ModelStats
	
	query := model.LOG_DB.Table("logs").
		Select("model_name, count(1) as request_count, sum(quota) as quota, sum(prompt_tokens) as prompt_tokens, sum(completion_tokens) as completion_tokens").
		Where("type = ?", model.LogTypeConsume).
		Where("model_name != ''").
		Group("model_name").
		Order(orderBy + " DESC").
		Limit(limit)
	
	if startTimestamp != 0 {
		query = query.Where("created_at >= ?", startTimestamp)
	}
	if endTimestamp != 0 {
		query = query.Where("created_at <= ?", endTimestamp)
	}
	
	err := query.Scan(&stats).Error
	return stats, err
}