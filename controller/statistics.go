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
	TotalUsers            int `json:"total_users"`
	TotalTokens           int `json:"total_tokens"`
	TotalChannels         int `json:"total_channels"`
	TotalRequests         int `json:"total_requests"`
	TotalQuota            int `json:"total_quota"`
	TotalPromptTokens     int `json:"total_prompt_tokens"`
	TotalCompletionTokens int `json:"total_completion_tokens"`
}

// UserStats represents statistics for a single user
type UserStats struct {
	UserId           int    `json:"user_id" gorm:"column:user_id"`
	Username         string `json:"username" gorm:"column:username"`
	RequestCount     int    `json:"request_count" gorm:"column:request_count"`
	Quota            int    `json:"quota" gorm:"column:quota"`
	PromptTokens     int    `json:"prompt_tokens" gorm:"column:prompt_tokens"`
	CompletionTokens int    `json:"completion_tokens" gorm:"column:completion_tokens"`
}

// GroupStats represents statistics for a single user group
type GroupStats struct {
	Group            string `json:"group" gorm:"column:group"`
	RequestCount     int    `json:"request_count" gorm:"column:request_count"`
	Quota            int    `json:"quota" gorm:"column:quota"`
	PromptTokens     int    `json:"prompt_tokens" gorm:"column:prompt_tokens"`
	CompletionTokens int    `json:"completion_tokens" gorm:"column:completion_tokens"`
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

// ChannelStats represents statistics for a single channel
type ChannelStats struct {
	ChannelId        int    `json:"channel_id" gorm:"column:channel_id"`
	ChannelName      string `json:"channel_name" gorm:"column:channel_name"`
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
	granularity := c.Query("granularity")

	p, _ := strconv.Atoi(c.Query("p"))
	if p < 0 {
		p = 0
	}
	num, _ := strconv.Atoi(c.Query("num"))
	if num <= 0 {
		num = config.ItemsPerPage
	}

	var stats []*TokenStatsResponse

	if granularity != "" {
		groupSelect, groupAlias := model.GetDateGroupByColumn(granularity)
		query := model.LOG_DB.Table("logs").
			Select(groupSelect+", token_name, count(1) as request_count, sum(quota) as quota, sum(prompt_tokens) as prompt_tokens, sum(completion_tokens) as completion_tokens").
			Where("type = ?", model.LogTypeConsume).
			Where("token_name != ''").
			Group(groupAlias + ", token_name").
			Order(groupAlias + ", request_count DESC")

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
	} else {
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
	granularity := c.Query("granularity")

	p, _ := strconv.Atoi(c.Query("p"))
	if p < 0 {
		p = 0
	}
	num, _ := strconv.Atoi(c.Query("num"))
	if num <= 0 {
		num = config.ItemsPerPage
	}

	var stats []*ModelStats

	if granularity != "" {
		groupSelect, groupAlias := model.GetDateGroupByColumn(granularity)
		query := model.LOG_DB.Table("logs").
			Select(groupSelect+", model_name, count(1) as request_count, sum(quota) as quota, sum(prompt_tokens) as prompt_tokens, sum(completion_tokens) as completion_tokens").
			Where("type = ?", model.LogTypeConsume).
			Where("model_name != ''").
			Group(groupAlias + ", model_name").
			Order(groupAlias + ", request_count DESC")

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
	} else {
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
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    stats,
	})
}

// GetChannelStats returns statistics by channel
// GET /api/stats/channels
func GetChannelStats(c *gin.Context) {
	startTimestamp, endTimestamp := parseTimeRange(c)

	p, _ := strconv.Atoi(c.Query("p"))
	if p < 0 {
		p = 0
	}
	num, _ := strconv.Atoi(c.Query("num"))
	if num <= 0 {
		num = config.ItemsPerPage
	}

	var stats []*ChannelStats

	ifnull := "ifnull"
	if common.UsingPostgreSQL {
		ifnull = "COALESCE"
	}

	baseQuery := model.LOG_DB.Table("logs").
		Select(fmt.Sprintf("channel_id, count(1) as request_count, %s(sum(quota), 0) as quota, %s(sum(prompt_tokens), 0) as prompt_tokens, %s(sum(completion_tokens), 0) as completion_tokens", ifnull, ifnull, ifnull)).
		Where("type = ?", model.LogTypeConsume).
		Where("channel_id > 0").
		Group("channel_id").
		Order("request_count DESC")

	if startTimestamp != 0 {
		baseQuery = baseQuery.Where("created_at >= ?", startTimestamp)
	}
	if endTimestamp != 0 {
		baseQuery = baseQuery.Where("created_at <= ?", endTimestamp)
	}

	var rawStats []*ChannelStats
	err := baseQuery.Limit(num).Offset(p * num).Scan(&rawStats).Error
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	for _, stat := range rawStats {
		channel, err := model.GetChannelById(stat.ChannelId, false)
		if err != nil {
			stat.ChannelName = fmt.Sprintf("Deleted Channel #%d", stat.ChannelId)
		} else {
			stat.ChannelName = channel.Name
		}
		stats = append(stats, stat)
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
	granularity := c.Query("granularity")

	p, _ := strconv.Atoi(c.Query("p"))
	if p < 0 {
		p = 0
	}
	num, _ := strconv.Atoi(c.Query("num"))
	if num <= 0 {
		num = config.ItemsPerPage
	}

	var stats []*UserStats

	if granularity != "" {
		groupSelect, groupAlias := model.GetDateGroupByColumn(granularity)
		query := model.LOG_DB.Table("logs").
			Select(groupSelect+", user_id, username, count(1) as request_count, sum(quota) as quota, sum(prompt_tokens) as prompt_tokens, sum(completion_tokens) as completion_tokens").
			Where("type = ?", model.LogTypeConsume).
			Group(groupAlias + ", user_id, username").
			Order(groupAlias + ", request_count DESC")

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
	} else {
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
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    stats,
	})
}

func GetUserGroupStats(c *gin.Context) {
	startTimestamp, endTimestamp := parseTimeRange(c)

	var stats []*GroupStats

	query := model.LOG_DB.Table("logs").
		Select("users.group, count(1) as request_count, sum(quota) as quota, sum(prompt_tokens) as prompt_tokens, sum(completion_tokens) as completion_tokens").
		Joins("JOIN users ON logs.user_id = users.id").
		Where("logs.type = ?", model.LogTypeConsume).
		Group("users.group").
		Order("request_count DESC")

	if startTimestamp != 0 {
		query = query.Where("logs.created_at >= ?", startTimestamp)
	}
	if endTimestamp != 0 {
		query = query.Where("logs.created_at <= ?", endTimestamp)
	}

	err := query.Scan(&stats).Error
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

// ChannelGroupStats represents statistics for a single channel group
type ChannelGroupStats struct {
	Group            string `json:"group" gorm:"column:group"`
	RequestCount     int    `json:"request_count" gorm:"column:request_count"`
	Quota            int    `json:"quota" gorm:"column:quota"`
	PromptTokens     int    `json:"prompt_tokens" gorm:"column:prompt_tokens"`
	CompletionTokens int    `json:"completion_tokens" gorm:"column:completion_tokens"`
}

// GetChannelGroupStats returns statistics by channel group
// GET /api/stats/channel-groups
func GetChannelGroupStats(c *gin.Context) {
	startTimestamp, endTimestamp := parseTimeRange(c)

	p, _ := strconv.Atoi(c.Query("p"))
	if p < 0 {
		p = 0
	}
	num, _ := strconv.Atoi(c.Query("num"))
	if num <= 0 {
		num = config.ItemsPerPage
	}

	var stats []*ChannelGroupStats

	// Join logs with channels to get channel group
	query := model.LOG_DB.Table("logs").
		Select("channels.group, count(1) as request_count, sum(logs.quota) as quota, sum(logs.prompt_tokens) as prompt_tokens, sum(logs.completion_tokens) as completion_tokens").
		Joins("JOIN channels ON channels.id = logs.channel_id").
		Where("logs.type = ?", model.LogTypeConsume).
		Group("channels.group").
		Order("request_count DESC")

	if startTimestamp != 0 {
		query = query.Where("logs.created_at >= ?", startTimestamp)
	}
	if endTimestamp != 0 {
		query = query.Where("logs.created_at <= ?", endTimestamp)
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

// HeatmapData represents usage statistics aggregated by hour and weekday
type HeatmapData struct {
	Hour             int   `json:"hour" gorm:"column:hour"`
	Weekday          int   `json:"weekday" gorm:"column:weekday"`
	RequestCount     int64 `json:"request_count" gorm:"column:request_count"`
	Quota            int64 `json:"quota" gorm:"column:quota"`
	PromptTokens     int64 `json:"prompt_tokens" gorm:"column:prompt_tokens"`
	CompletionTokens int64 `json:"completion_tokens" gorm:"column:completion_tokens"`
}

// GetHeatmapData returns usage statistics aggregated by hour (0-23) and weekday (1-7)
// GET /api/stats/heatmap
func GetHeatmapData(c *gin.Context) {
	startTimestamp, endTimestamp := parseTimeRange(c)

	var stats []*HeatmapData
	var query string

	// Build database-specific query for hour and weekday extraction
	if common.UsingPostgreSQL {
		query = `
			SELECT 
				CAST(EXTRACT(HOUR FROM to_timestamp(created_at)) AS INTEGER) as hour,
				CAST(EXTRACT(DOW FROM to_timestamp(created_at)) + 1 AS INTEGER) as weekday,
				count(*) as request_count,
				COALESCE(sum(quota), 0) as quota,
				COALESCE(sum(prompt_tokens), 0) as prompt_tokens,
				COALESCE(sum(completion_tokens), 0) as completion_tokens
			FROM logs
			WHERE type = ?
				AND ($1 = 0 OR created_at >= $1)
				AND ($2 = 0 OR created_at <= $2)
			GROUP BY hour, weekday
			ORDER BY weekday, hour`
	} else if common.UsingSQLite {
		query = `
			SELECT 
				CAST(strftime('%H', datetime(created_at, 'unixepoch')) AS INTEGER) as hour,
				CAST(strftime('%w', datetime(created_at, 'unixepoch')) + 1 AS INTEGER) as weekday,
				count(*) as request_count,
				COALESCE(sum(quota), 0) as quota,
				COALESCE(sum(prompt_tokens), 0) as prompt_tokens,
				COALESCE(sum(completion_tokens), 0) as completion_tokens
			FROM logs
			WHERE type = ?
				AND (? = 0 OR created_at >= ?)
				AND (? = 0 OR created_at <= ?)
			GROUP BY hour, weekday
			ORDER BY weekday, hour`
	} else {
		// MySQL (default)
		query = `
			SELECT 
				HOUR(FROM_UNIXTIME(created_at)) as hour,
				DAYOFWEEK(FROM_UNIXTIME(created_at)) as weekday,
				count(*) as request_count,
				IFNULL(sum(quota), 0) as quota,
				IFNULL(sum(prompt_tokens), 0) as prompt_tokens,
				IFNULL(sum(completion_tokens), 0) as completion_tokens
			FROM logs
			WHERE type = ?
				AND (? = 0 OR created_at >= ?)
				AND (? = 0 OR created_at <= ?)
			GROUP BY hour, weekday
			ORDER BY weekday, hour`
	}

	var err error
	if common.UsingPostgreSQL {
		err = model.LOG_DB.Raw(query, model.LogTypeConsume, startTimestamp, endTimestamp).Scan(&stats).Error
	} else {
		// MySQL and SQLite use the same parameter pattern
		err = model.LOG_DB.Raw(query, model.LogTypeConsume, startTimestamp, startTimestamp, endTimestamp, endTimestamp).Scan(&stats).Error
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
		"data":    stats,
	})
}
