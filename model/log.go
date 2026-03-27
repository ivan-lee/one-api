package model

import (
	"context"
	"fmt"

	"gorm.io/gorm"

	"github.com/songquanpeng/one-api/common"
	"github.com/songquanpeng/one-api/common/config"
	"github.com/songquanpeng/one-api/common/helper"
	"github.com/songquanpeng/one-api/common/logger"
)

type Log struct {
	Id                int    `json:"id"`
	UserId            int    `json:"user_id" gorm:"index"`
	CreatedAt         int64  `json:"created_at" gorm:"bigint;index:idx_created_at_type"`
	Type              int    `json:"type" gorm:"index:idx_created_at_type"`
	Content           string `json:"content"`
	Username          string `json:"username" gorm:"index:index_username_model_name,priority:2;default:''"`
	TokenName         string `json:"token_name" gorm:"index;default:''"`
	ModelName         string `json:"model_name" gorm:"index;index:index_username_model_name,priority:1;default:''"`
	Quota             int    `json:"quota" gorm:"default:0"`
	PromptTokens      int    `json:"prompt_tokens" gorm:"default:0"`
	CompletionTokens  int    `json:"completion_tokens" gorm:"default:0"`
	ChannelId         int    `json:"channel" gorm:"index"`
	RequestId         string `json:"request_id" gorm:"default:''"`
	ElapsedTime       int64  `json:"elapsed_time" gorm:"default:0"` // unit is ms
	IsStream          bool   `json:"is_stream" gorm:"default:false"`
	SystemPromptReset bool   `json:"system_prompt_reset" gorm:"default:false"`
}

const (
	LogTypeUnknown = iota
	LogTypeTopup
	LogTypeConsume
	LogTypeManage
	LogTypeSystem
	LogTypeTest
)

func recordLogHelper(ctx context.Context, log *Log) {
	requestId := helper.GetRequestID(ctx)
	log.RequestId = requestId
	err := LOG_DB.Create(log).Error
	if err != nil {
		logger.Error(ctx, "failed to record log: "+err.Error())
		return
	}
	logger.Infof(ctx, "record log: %+v", log)
}

func RecordLog(ctx context.Context, userId int, logType int, content string) {
	if logType == LogTypeConsume && !config.LogConsumeEnabled {
		return
	}
	log := &Log{
		UserId:    userId,
		Username:  GetUsernameById(userId),
		CreatedAt: helper.GetTimestamp(),
		Type:      logType,
		Content:   content,
	}
	recordLogHelper(ctx, log)
}

func RecordTopupLog(ctx context.Context, userId int, content string, quota int) {
	log := &Log{
		UserId:    userId,
		Username:  GetUsernameById(userId),
		CreatedAt: helper.GetTimestamp(),
		Type:      LogTypeTopup,
		Content:   content,
		Quota:     quota,
	}
	recordLogHelper(ctx, log)
}

func RecordConsumeLog(ctx context.Context, log *Log) {
	if !config.LogConsumeEnabled {
		return
	}
	log.Username = GetUsernameById(log.UserId)
	log.CreatedAt = helper.GetTimestamp()
	log.Type = LogTypeConsume
	recordLogHelper(ctx, log)
}

func RecordTestLog(ctx context.Context, log *Log) {
	log.CreatedAt = helper.GetTimestamp()
	log.Type = LogTypeTest
	recordLogHelper(ctx, log)
}

func GetAllLogs(logType int, startTimestamp int64, endTimestamp int64, modelName string, username string, tokenName string, startIdx int, num int, channel int) (logs []*Log, err error) {
	var tx *gorm.DB
	if logType == LogTypeUnknown {
		tx = LOG_DB
	} else {
		tx = LOG_DB.Where("type = ?", logType)
	}
	if modelName != "" {
		tx = tx.Where("model_name = ?", modelName)
	}
	if username != "" {
		tx = tx.Where("username = ?", username)
	}
	if tokenName != "" {
		tx = tx.Where("token_name = ?", tokenName)
	}
	if startTimestamp != 0 {
		tx = tx.Where("created_at >= ?", startTimestamp)
	}
	if endTimestamp != 0 {
		tx = tx.Where("created_at <= ?", endTimestamp)
	}
	if channel != 0 {
		tx = tx.Where("channel_id = ?", channel)
	}
	err = tx.Order("id desc").Limit(num).Offset(startIdx).Find(&logs).Error
	return logs, err
}

func GetAllLogsWithCount(logType int, startTimestamp int64, endTimestamp int64, modelName string, username string, tokenName string, startIdx int, num int, channel int) (logs []*Log, total int64, err error) {
	var tx *gorm.DB
	if logType == LogTypeUnknown {
		tx = LOG_DB
	} else {
		tx = LOG_DB.Where("type = ?", logType)
	}
	if modelName != "" {
		tx = tx.Where("model_name = ?", modelName)
	}
	if username != "" {
		tx = tx.Where("username = ?", username)
	}
	if tokenName != "" {
		tx = tx.Where("token_name = ?", tokenName)
	}
	if startTimestamp != 0 {
		tx = tx.Where("created_at >= ?", startTimestamp)
	}
	if endTimestamp != 0 {
		tx = tx.Where("created_at <= ?", endTimestamp)
	}
	if channel != 0 {
		tx = tx.Where("channel_id = ?", channel)
	}
	// Get total count before pagination
	err = tx.Model(&Log{}).Count(&total).Error
	if err != nil {
		return nil, 0, err
	}
	// Get paginated logs
	err = tx.Order("id desc").Limit(num).Offset(startIdx).Find(&logs).Error
	return logs, total, err
}

func GetUserLogs(userId int, logType int, startTimestamp int64, endTimestamp int64, modelName string, tokenName string, startIdx int, num int) (logs []*Log, err error) {
	var tx *gorm.DB
	if logType == LogTypeUnknown {
		tx = LOG_DB.Where("user_id = ?", userId)
	} else {
		tx = LOG_DB.Where("user_id = ? and type = ?", userId, logType)
	}
	if modelName != "" {
		tx = tx.Where("model_name = ?", modelName)
	}
	if tokenName != "" {
		tx = tx.Where("token_name = ?", tokenName)
	}
	if startTimestamp != 0 {
		tx = tx.Where("created_at >= ?", startTimestamp)
	}
	if endTimestamp != 0 {
		tx = tx.Where("created_at <= ?", endTimestamp)
	}
	err = tx.Order("id desc").Limit(num).Offset(startIdx).Omit("id").Find(&logs).Error
	return logs, err
}

func GetUserLogsWithCount(userId int, logType int, startTimestamp int64, endTimestamp int64, modelName string, tokenName string, startIdx int, num int) (logs []*Log, total int64, err error) {
	var tx *gorm.DB
	if logType == LogTypeUnknown {
		tx = LOG_DB.Where("user_id = ?", userId)
	} else {
		tx = LOG_DB.Where("user_id = ? and type = ?", userId, logType)
	}
	if modelName != "" {
		tx = tx.Where("model_name = ?", modelName)
	}
	if tokenName != "" {
		tx = tx.Where("token_name = ?", tokenName)
	}
	if startTimestamp != 0 {
		tx = tx.Where("created_at >= ?", startTimestamp)
	}
	if endTimestamp != 0 {
		tx = tx.Where("created_at <= ?", endTimestamp)
	}
	// Get total count before pagination
	err = tx.Model(&Log{}).Count(&total).Error
	if err != nil {
		return nil, 0, err
	}
	// Get paginated logs
	err = tx.Order("id desc").Limit(num).Offset(startIdx).Omit("id").Find(&logs).Error
	return logs, total, err
}

func SearchAllLogs(keyword string) (logs []*Log, err error) {
	err = LOG_DB.Where("type = ? or content LIKE ?", keyword, keyword+"%").Order("id desc").Limit(config.MaxRecentItems).Find(&logs).Error
	return logs, err
}

// SearchAllLogsFuzzy performs fuzzy search on username, token_name, and model_name
// with partial matching using LIKE queries
func SearchAllLogsFuzzy(keyword string) (logs []*Log, err error) {
	if keyword == "" {
		err = LOG_DB.Order("id desc").Limit(config.MaxRecentItems).Find(&logs).Error
		return logs, err
	}
	searchPattern := "%" + keyword + "%"
	err = LOG_DB.Where(
		"username LIKE ? OR token_name LIKE ? OR model_name LIKE ? OR content LIKE ?",
		searchPattern, searchPattern, searchPattern, searchPattern,
	).Order("id desc").Limit(config.MaxRecentItems).Find(&logs).Error
	return logs, err
}

func SearchUserLogs(userId int, keyword string) (logs []*Log, err error) {
	err = LOG_DB.Where("user_id = ? and type = ?", userId, keyword).Order("id desc").Limit(config.MaxRecentItems).Omit("id").Find(&logs).Error
	return logs, err
}

// SearchUserLogsFuzzy performs fuzzy search for a specific user on token_name and model_name
// with partial matching using LIKE queries
func SearchUserLogsFuzzy(userId int, keyword string) (logs []*Log, err error) {
	if keyword == "" {
		err = LOG_DB.Where("user_id = ?", userId).Order("id desc").Limit(config.MaxRecentItems).Omit("id").Find(&logs).Error
		return logs, err
	}
	searchPattern := "%" + keyword + "%"
	err = LOG_DB.Where(
		"user_id = ? AND (token_name LIKE ? OR model_name LIKE ? OR content LIKE ?)",
		userId, searchPattern, searchPattern, searchPattern,
	).Order("id desc").Limit(config.MaxRecentItems).Omit("id").Find(&logs).Error
	return logs, err
}

func SumUsedQuota(logType int, startTimestamp int64, endTimestamp int64, modelName string, username string, tokenName string, channel int) (quota int64) {
	ifnull := "ifnull"
	if common.UsingPostgreSQL {
		ifnull = "COALESCE"
	}
	tx := LOG_DB.Table("logs").Select(fmt.Sprintf("%s(sum(quota),0)", ifnull))
	if username != "" {
		tx = tx.Where("username = ?", username)
	}
	if tokenName != "" {
		tx = tx.Where("token_name = ?", tokenName)
	}
	if startTimestamp != 0 {
		tx = tx.Where("created_at >= ?", startTimestamp)
	}
	if endTimestamp != 0 {
		tx = tx.Where("created_at <= ?", endTimestamp)
	}
	if modelName != "" {
		tx = tx.Where("model_name = ?", modelName)
	}
	if channel != 0 {
		tx = tx.Where("channel_id = ?", channel)
	}
	tx.Where("type = ?", LogTypeConsume).Scan(&quota)
	return quota
}

func SumUsedToken(logType int, startTimestamp int64, endTimestamp int64, modelName string, username string, tokenName string) (token int) {
	ifnull := "ifnull"
	if common.UsingPostgreSQL {
		ifnull = "COALESCE"
	}
	tx := LOG_DB.Table("logs").Select(fmt.Sprintf("%s(sum(prompt_tokens),0) + %s(sum(completion_tokens),0)", ifnull, ifnull))
	if username != "" {
		tx = tx.Where("username = ?", username)
	}
	if tokenName != "" {
		tx = tx.Where("token_name = ?", tokenName)
	}
	if startTimestamp != 0 {
		tx = tx.Where("created_at >= ?", startTimestamp)
	}
	if endTimestamp != 0 {
		tx = tx.Where("created_at <= ?", endTimestamp)
	}
	if modelName != "" {
		tx = tx.Where("model_name = ?", modelName)
	}
	tx.Where("type = ?", LogTypeConsume).Scan(&token)
	return token
}

func DeleteOldLog(targetTimestamp int64) (int64, error) {
	result := LOG_DB.Where("created_at < ?", targetTimestamp).Delete(&Log{})
	return result.RowsAffected, result.Error
}

type LogStatistic struct {
	Day              string `gorm:"column:day"`
	ModelName        string `gorm:"column:model_name"`
	RequestCount     int    `gorm:"column:request_count"`
	Quota            int    `gorm:"column:quota"`
	PromptTokens     int    `gorm:"column:prompt_tokens"`
	CompletionTokens int    `gorm:"column:completion_tokens"`
}

func SearchLogsByDayAndModel(userId, start, end int) (LogStatistics []*LogStatistic, err error) {
	groupSelect := "DATE_FORMAT(FROM_UNIXTIME(created_at), '%Y-%m-%d') as day"

	if common.UsingPostgreSQL {
		groupSelect = "TO_CHAR(date_trunc('day', to_timestamp(created_at)), 'YYYY-MM-DD') as day"
	}

	if common.UsingSQLite {
		groupSelect = "strftime('%Y-%m-%d', datetime(created_at, 'unixepoch')) as day"
	}

	err = LOG_DB.Raw(`
		SELECT `+groupSelect+`,
		model_name, count(1) as request_count,
		sum(quota) as quota,
		sum(prompt_tokens) as prompt_tokens,
		sum(completion_tokens) as completion_tokens
		FROM logs
		WHERE type=2
		AND user_id= ?
		AND created_at BETWEEN ? AND ?
		GROUP BY day, model_name
		ORDER BY day, model_name
	`, userId, start, end).Scan(&LogStatistics).Error

	return LogStatistics, err
}

// TokenUsageStats represents overall token usage statistics
type TokenUsageStats struct {
	TotalRequests     int   `json:"total_requests" gorm:"column:total_requests"`
	TotalQuota        int   `json:"total_quota" gorm:"column:total_quota"`
	TotalPromptTokens int   `json:"total_prompt_tokens" gorm:"column:total_prompt_tokens"`
	TotalCompletion   int   `json:"total_completion_tokens" gorm:"column:total_completion_tokens"`
}

// TokenDailyStats represents daily token usage statistics
type TokenDailyStats struct {
	Day              string `json:"day" gorm:"column:day"`
	RequestCount     int    `json:"request_count" gorm:"column:request_count"`
	Quota            int    `json:"quota" gorm:"column:quota"`
	PromptTokens     int    `json:"prompt_tokens" gorm:"column:prompt_tokens"`
	CompletionTokens int    `json:"completion_tokens" gorm:"column:completion_tokens"`
}

// TokenHourlyStats represents hourly token usage statistics
type TokenHourlyStats struct {
	Hour             string `json:"hour" gorm:"column:hour"`
	RequestCount     int    `json:"request_count" gorm:"column:request_count"`
	Quota            int    `json:"quota" gorm:"column:quota"`
	PromptTokens     int    `json:"prompt_tokens" gorm:"column:prompt_tokens"`
	CompletionTokens int    `json:"completion_tokens" gorm:"column:completion_tokens"`
}

// TokenModelStats represents token usage statistics by model
type TokenModelStats struct {
	ModelName        string `json:"model_name" gorm:"column:model_name"`
	RequestCount     int    `json:"request_count" gorm:"column:request_count"`
	Quota            int    `json:"quota" gorm:"column:quota"`
	PromptTokens     int    `json:"prompt_tokens" gorm:"column:prompt_tokens"`
	CompletionTokens int    `json:"completion_tokens" gorm:"column:completion_tokens"`
}

// GetTokenUsageStats returns overall usage statistics for a token
func GetTokenUsageStats(tokenName string, startTimestamp, endTimestamp int64) (*TokenUsageStats, error) {
	var stats TokenUsageStats
	ifnull := "ifnull"
	if common.UsingPostgreSQL {
		ifnull = "COALESCE"
	}

	query := LOG_DB.Table("logs").
		Select(fmt.Sprintf("%s(count(*), 0) as total_requests, %s(sum(quota), 0) as total_quota, %s(sum(prompt_tokens), 0) as total_prompt_tokens, %s(sum(completion_tokens), 0) as total_completion_tokens", ifnull, ifnull, ifnull, ifnull)).
		Where("type = ?", LogTypeConsume).
		Where("token_name = ?", tokenName)

	if startTimestamp != 0 {
		query = query.Where("created_at >= ?", startTimestamp)
	}
	if endTimestamp != 0 {
		query = query.Where("created_at <= ?", endTimestamp)
	}

	err := query.Scan(&stats).Error
	if err != nil {
		return nil, err
	}
	return &stats, nil
}

// GetTokenDailyStats returns daily usage statistics for a token
func GetTokenDailyStats(tokenName string, startTimestamp, endTimestamp int64) ([]*TokenDailyStats, error) {
	var stats []*TokenDailyStats
	groupSelect := "DATE_FORMAT(FROM_UNIXTIME(created_at), '%Y-%m-%d') as day"

	if common.UsingPostgreSQL {
		groupSelect = "TO_CHAR(date_trunc('day', to_timestamp(created_at)), 'YYYY-MM-DD') as day"
	}

	if common.UsingSQLite {
		groupSelect = "strftime('%Y-%m-%d', datetime(created_at, 'unixepoch')) as day"
	}

	query := `
		SELECT ` + groupSelect + `,
		count(1) as request_count,
		sum(quota) as quota,
		sum(prompt_tokens) as prompt_tokens,
		sum(completion_tokens) as completion_tokens
		FROM logs
		WHERE type = ?
		AND token_name = ?
	`
	args := []interface{}{LogTypeConsume, tokenName}

	if startTimestamp != 0 {
		query += " AND created_at >= ?"
		args = append(args, startTimestamp)
	}
	if endTimestamp != 0 {
		query += " AND created_at <= ?"
		args = append(args, endTimestamp)
	}

	query += " GROUP BY day ORDER BY day"

	err := LOG_DB.Raw(query, args...).Scan(&stats).Error
	return stats, err
}

// GetTokenHourlyStats returns hourly usage statistics for a token
func GetTokenHourlyStats(tokenName string, startTimestamp, endTimestamp int64) ([]*TokenHourlyStats, error) {
	var stats []*TokenHourlyStats
	groupSelect := "DATE_FORMAT(FROM_UNIXTIME(created_at), '%Y-%m-%d %H:00') as hour"

	if common.UsingPostgreSQL {
		groupSelect = "TO_CHAR(date_trunc('hour', to_timestamp(created_at)), 'YYYY-MM-DD HH24:00') as hour"
	}

	if common.UsingSQLite {
		groupSelect = "strftime('%Y-%m-%d %H:00', datetime(created_at, 'unixepoch')) as hour"
	}

	query := `
		SELECT ` + groupSelect + `,
		count(1) as request_count,
		sum(quota) as quota,
		sum(prompt_tokens) as prompt_tokens,
		sum(completion_tokens) as completion_tokens
		FROM logs
		WHERE type = ?
		AND token_name = ?
	`
	args := []interface{}{LogTypeConsume, tokenName}

	if startTimestamp != 0 {
		query += " AND created_at >= ?"
		args = append(args, startTimestamp)
	}
	if endTimestamp != 0 {
		query += " AND created_at <= ?"
		args = append(args, endTimestamp)
	}

	query += " GROUP BY hour ORDER BY hour"

	err := LOG_DB.Raw(query, args...).Scan(&stats).Error
	return stats, err
}

// GetTokenModelStats returns usage statistics by model for a token
func GetTokenModelStats(tokenName string, startTimestamp, endTimestamp int64) ([]*TokenModelStats, error) {
	var stats []*TokenModelStats

	query := LOG_DB.Table("logs").
		Select("model_name, count(1) as request_count, sum(quota) as quota, sum(prompt_tokens) as prompt_tokens, sum(completion_tokens) as completion_tokens").
		Where("type = ?", LogTypeConsume).
		Where("token_name = ?", tokenName).
		Group("model_name").
		Order("request_count DESC")

	if startTimestamp != 0 {
		query = query.Where("created_at >= ?", startTimestamp)
	}
	if endTimestamp != 0 {
		query = query.Where("created_at <= ?", endTimestamp)
	}

	err := query.Scan(&stats).Error
	return stats, err
}
