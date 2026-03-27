package service

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/songquanpeng/one-api/common"
	"github.com/songquanpeng/one-api/common/config"
	"github.com/songquanpeng/one-api/common/logger"
	"github.com/songquanpeng/one-api/model"
)

// AggregatedStats represents pre-aggregated statistics
type AggregatedStats struct {
	Timestamp        int64 `json:"timestamp"`
	RequestCount     int   `json:"request_count"`
	Quota            int   `json:"quota"`
	PromptTokens     int   `json:"prompt_tokens"`
	CompletionTokens int   `json:"completion_tokens"`
}

// HourlyStatsKey generates Redis key for hourly stats
func HourlyStatsKey(hour string) string {
	return fmt.Sprintf("stats:hourly:%s", hour)
}

// DailyStatsKey generates Redis key for daily stats
func DailyStatsKey(day string) string {
	return fmt.Sprintf("stats:daily:%s", day)
}

// UserHourlyStatsKey generates Redis key for user hourly stats
func UserHourlyStatsKey(userId int, hour string) string {
	return fmt.Sprintf("stats:user:%d:hourly:%s", userId, hour)
}

// UserDailyStatsKey generates Redis key for user daily stats
func UserDailyStatsKey(userId int, day string) string {
	return fmt.Sprintf("stats:user:%d:daily:%s", userId, day)
}

// ModelHourlyStatsKey generates Redis key for model hourly stats
func ModelHourlyStatsKey(modelName string, hour string) string {
	return fmt.Sprintf("stats:model:%s:hourly:%s", modelName, hour)
}

// ModelDailyStatsKey generates Redis key for model daily stats
func ModelDailyStatsKey(modelName string, day string) string {
	return fmt.Sprintf("stats:model:%s:daily:%s", modelName, day)
}

// ChannelHourlyStatsKey generates Redis key for channel hourly stats
func ChannelHourlyStatsKey(channelId int, hour string) string {
	return fmt.Sprintf("stats:channel:%d:hourly:%s", channelId, hour)
}

// ChannelDailyStatsKey generates Redis key for channel daily stats
func ChannelDailyStatsKey(channelId int, day string) string {
	return fmt.Sprintf("stats:channel:%d:daily:%s", channelId, day)
}

// Memory cache fallback when Redis is not available
var (
	hourlyStatsCache      = make(map[string]*AggregatedStats)
	dailyStatsCache       = make(map[string]*AggregatedStats)
	userHourlyStatsCache  = make(map[string]*AggregatedStats)
	userDailyStatsCache   = make(map[string]*AggregatedStats)
	modelHourlyStatsCache = make(map[string]*AggregatedStats)
	modelDailyStatsCache  = make(map[string]*AggregatedStats)
	channelHourlyStatsCache = make(map[string]*AggregatedStats)
	channelDailyStatsCache  = make(map[string]*AggregatedStats)
	statsCacheMutex       sync.RWMutex
)

// cacheSet stores stats in Redis or memory cache
func cacheSet(key string, stats *AggregatedStats, ttl time.Duration) error {
	data, err := json.Marshal(stats)
	if err != nil {
		return err
	}

	if common.RedisEnabled {
		return common.RedisSet(key, string(data), ttl)
	}

	// Fallback to memory cache
	statsCacheMutex.Lock()
	defer statsCacheMutex.Unlock()
	hourlyStatsCache[key] = stats
	return nil
}

// cacheGet retrieves stats from Redis or memory cache
func cacheGet(key string) (*AggregatedStats, error) {
	if common.RedisEnabled {
		data, err := common.RedisGet(key)
		if err != nil {
			return nil, err
		}
		var stats AggregatedStats
		if err := json.Unmarshal([]byte(data), &stats); err != nil {
			return nil, err
		}
		return &stats, nil
	}

	// Fallback to memory cache
	statsCacheMutex.RLock()
	defer statsCacheMutex.RUnlock()
	if stats, ok := hourlyStatsCache[key]; ok {
		return stats, nil
	}
	return nil, fmt.Errorf("key not found: %s", key)
}

// formatHour formats a timestamp to hour string (YYYY-MM-DD HH:00)
func formatHour(timestamp int64) string {
	return time.Unix(timestamp, 0).Format("2006-01-02 15:04")
}

// formatDay formats a timestamp to day string (YYYY-MM-DD)
func formatDay(timestamp int64) string {
	return time.Unix(timestamp, 0).Format("2006-01-02")
}

// getHourStart returns the start of the hour for a given timestamp
func getHourStart(timestamp int64) int64 {
	t := time.Unix(timestamp, 0)
	return time.Date(t.Year(), t.Month(), t.Day(), t.Hour(), 0, 0, 0, t.Location()).Unix()
}

// getDayStart returns the start of the day for a given timestamp
func getDayStart(timestamp int64) int64 {
	t := time.Unix(timestamp, 0)
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, t.Location()).Unix()
}

// aggregateHourlyStats aggregates stats for a specific hour from logs
func aggregateHourlyStats(ctx context.Context, hourStart int64) (*AggregatedStats, error) {
	hourEnd := hourStart + 3600 // 1 hour in seconds

	var stats AggregatedStats
	ifnull := "ifnull"
	if common.UsingPostgreSQL {
		ifnull = "COALESCE"
	}

	query := fmt.Sprintf(`
		SELECT 
			%s(count(*), 0) as request_count,
			%s(sum(quota), 0) as quota,
			%s(sum(prompt_tokens), 0) as prompt_tokens,
			%s(sum(completion_tokens), 0) as completion_tokens
		FROM logs
		WHERE type = ?
		AND created_at >= ?
		AND created_at < ?
	`, ifnull, ifnull, ifnull, ifnull)

	err := model.LOG_DB.Raw(query, model.LogTypeConsume, hourStart, hourEnd).Scan(&stats).Error
	if err != nil {
		return nil, err
	}

	stats.Timestamp = hourStart
	return &stats, nil
}

// aggregateDailyStats aggregates stats for a specific day from logs
func aggregateDailyStats(ctx context.Context, dayStart int64) (*AggregatedStats, error) {
	dayEnd := dayStart + 86400 // 1 day in seconds

	var stats AggregatedStats
	ifnull := "ifnull"
	if common.UsingPostgreSQL {
		ifnull = "COALESCE"
	}

	query := fmt.Sprintf(`
		SELECT 
			%s(count(*), 0) as request_count,
			%s(sum(quota), 0) as quota,
			%s(sum(prompt_tokens), 0) as prompt_tokens,
			%s(sum(completion_tokens), 0) as completion_tokens
		FROM logs
		WHERE type = ?
		AND created_at >= ?
		AND created_at < ?
	`, ifnull, ifnull, ifnull, ifnull)

	err := model.LOG_DB.Raw(query, model.LogTypeConsume, dayStart, dayEnd).Scan(&stats).Error
	if err != nil {
		return nil, err
	}

	stats.Timestamp = dayStart
	return &stats, nil
}

// aggregateUserHourlyStats aggregates hourly stats for a specific user
func aggregateUserHourlyStats(ctx context.Context, userId int, hourStart int64) (*AggregatedStats, error) {
	hourEnd := hourStart + 3600

	var stats AggregatedStats
	ifnull := "ifnull"
	if common.UsingPostgreSQL {
		ifnull = "COALESCE"
	}

	query := fmt.Sprintf(`
		SELECT 
			%s(count(*), 0) as request_count,
			%s(sum(quota), 0) as quota,
			%s(sum(prompt_tokens), 0) as prompt_tokens,
			%s(sum(completion_tokens), 0) as completion_tokens
		FROM logs
		WHERE type = ?
		AND user_id = ?
		AND created_at >= ?
		AND created_at < ?
	`, ifnull, ifnull, ifnull, ifnull)

	err := model.LOG_DB.Raw(query, model.LogTypeConsume, userId, hourStart, hourEnd).Scan(&stats).Error
	if err != nil {
		return nil, err
	}

	stats.Timestamp = hourStart
	return &stats, nil
}

// aggregateUserDailyStats aggregates daily stats for a specific user
func aggregateUserDailyStats(ctx context.Context, userId int, dayStart int64) (*AggregatedStats, error) {
	dayEnd := dayStart + 86400

	var stats AggregatedStats
	ifnull := "ifnull"
	if common.UsingPostgreSQL {
		ifnull = "COALESCE"
	}

	query := fmt.Sprintf(`
		SELECT 
			%s(count(*), 0) as request_count,
			%s(sum(quota), 0) as quota,
			%s(sum(prompt_tokens), 0) as prompt_tokens,
			%s(sum(completion_tokens), 0) as completion_tokens
		FROM logs
		WHERE type = ?
		AND user_id = ?
		AND created_at >= ?
		AND created_at < ?
	`, ifnull, ifnull, ifnull, ifnull)

	err := model.LOG_DB.Raw(query, model.LogTypeConsume, userId, dayStart, dayEnd).Scan(&stats).Error
	if err != nil {
		return nil, err
	}

	stats.Timestamp = dayStart
	return &stats, nil
}

// aggregateModelHourlyStats aggregates hourly stats for a specific model
func aggregateModelHourlyStats(ctx context.Context, modelName string, hourStart int64) (*AggregatedStats, error) {
	hourEnd := hourStart + 3600

	var stats AggregatedStats
	ifnull := "ifnull"
	if common.UsingPostgreSQL {
		ifnull = "COALESCE"
	}

	query := fmt.Sprintf(`
		SELECT 
			%s(count(*), 0) as request_count,
			%s(sum(quota), 0) as quota,
			%s(sum(prompt_tokens), 0) as prompt_tokens,
			%s(sum(completion_tokens), 0) as completion_tokens
		FROM logs
		WHERE type = ?
		AND model_name = ?
		AND created_at >= ?
		AND created_at < ?
	`, ifnull, ifnull, ifnull, ifnull)

	err := model.LOG_DB.Raw(query, model.LogTypeConsume, modelName, hourStart, hourEnd).Scan(&stats).Error
	if err != nil {
		return nil, err
	}

	stats.Timestamp = hourStart
	return &stats, nil
}

// aggregateModelDailyStats aggregates daily stats for a specific model
func aggregateModelDailyStats(ctx context.Context, modelName string, dayStart int64) (*AggregatedStats, error) {
	dayEnd := dayStart + 86400

	var stats AggregatedStats
	ifnull := "ifnull"
	if common.UsingPostgreSQL {
		ifnull = "COALESCE"
	}

	query := fmt.Sprintf(`
		SELECT 
			%s(count(*), 0) as request_count,
			%s(sum(quota), 0) as quota,
			%s(sum(prompt_tokens), 0) as prompt_tokens,
			%s(sum(completion_tokens), 0) as completion_tokens
		FROM logs
		WHERE type = ?
		AND model_name = ?
		AND created_at >= ?
		AND created_at < ?
	`, ifnull, ifnull, ifnull, ifnull)

	err := model.LOG_DB.Raw(query, model.LogTypeConsume, modelName, dayStart, dayEnd).Scan(&stats).Error
	if err != nil {
		return nil, err
	}

	stats.Timestamp = dayStart
	return &stats, nil
}

// aggregateChannelHourlyStats aggregates hourly stats for a specific channel
func aggregateChannelHourlyStats(ctx context.Context, channelId int, hourStart int64) (*AggregatedStats, error) {
	hourEnd := hourStart + 3600

	var stats AggregatedStats
	ifnull := "ifnull"
	if common.UsingPostgreSQL {
		ifnull = "COALESCE"
	}

	query := fmt.Sprintf(`
		SELECT 
			%s(count(*), 0) as request_count,
			%s(sum(quota), 0) as quota,
			%s(sum(prompt_tokens), 0) as prompt_tokens,
			%s(sum(completion_tokens), 0) as completion_tokens
		FROM logs
		WHERE type = ?
		AND channel_id = ?
		AND created_at >= ?
		AND created_at < ?
	`, ifnull, ifnull, ifnull, ifnull)

	err := model.LOG_DB.Raw(query, model.LogTypeConsume, channelId, hourStart, hourEnd).Scan(&stats).Error
	if err != nil {
		return nil, err
	}

	stats.Timestamp = hourStart
	return &stats, nil
}

// aggregateChannelDailyStats aggregates daily stats for a specific channel
func aggregateChannelDailyStats(ctx context.Context, channelId int, dayStart int64) (*AggregatedStats, error) {
	dayEnd := dayStart + 86400

	var stats AggregatedStats
	ifnull := "ifnull"
	if common.UsingPostgreSQL {
		ifnull = "COALESCE"
	}

	query := fmt.Sprintf(`
		SELECT 
			%s(count(*), 0) as request_count,
			%s(sum(quota), 0) as quota,
			%s(sum(prompt_tokens), 0) as prompt_tokens,
			%s(sum(completion_tokens), 0) as completion_tokens
		FROM logs
		WHERE type = ?
		AND channel_id = ?
		AND created_at >= ?
		AND created_at < ?
	`, ifnull, ifnull, ifnull, ifnull)

	err := model.LOG_DB.Raw(query, model.LogTypeConsume, channelId, dayStart, dayEnd).Scan(&stats).Error
	if err != nil {
		return nil, err
	}

	stats.Timestamp = dayStart
	return &stats, nil
}

// GetHourlyStats retrieves cached hourly stats, aggregates if not found
func GetHourlyStats(ctx context.Context, hour string) (*AggregatedStats, error) {
	key := HourlyStatsKey(hour)

	// Try to get from cache first
	stats, err := cacheGet(key)
	if err == nil {
		return stats, nil
	}

	// Parse hour string and aggregate
	t, err := time.Parse("2006-01-02 15:04", hour)
	if err != nil {
		return nil, fmt.Errorf("invalid hour format: %s", hour)
	}

	hourStart := t.Unix()
	stats, err = aggregateHourlyStats(ctx, hourStart)
	if err != nil {
		return nil, err
	}

	// Cache for 2 hours (7200 seconds)
	if err := cacheSet(key, stats, 2*time.Hour); err != nil {
		logger.SysError("failed to cache hourly stats: " + err.Error())
	}

	return stats, nil
}

// GetDailyStats retrieves cached daily stats, aggregates if not found
func GetDailyStats(ctx context.Context, day string) (*AggregatedStats, error) {
	key := DailyStatsKey(day)

	// Try to get from cache first
	stats, err := cacheGet(key)
	if err == nil {
		return stats, nil
	}

	// Parse day string and aggregate
	t, err := time.Parse("2006-01-02", day)
	if err != nil {
		return nil, fmt.Errorf("invalid day format: %s", day)
	}

	dayStart := t.Unix()
	stats, err = aggregateDailyStats(ctx, dayStart)
	if err != nil {
		return nil, err
	}

	// Cache for 48 hours (2 days)
	if err := cacheSet(key, stats, 48*time.Hour); err != nil {
		logger.SysError("failed to cache daily stats: " + err.Error())
	}

	return stats, nil
}

// GetUserHourlyStats retrieves cached user hourly stats
func GetUserHourlyStats(ctx context.Context, userId int, hour string) (*AggregatedStats, error) {
	key := UserHourlyStatsKey(userId, hour)

	stats, err := cacheGet(key)
	if err == nil {
		return stats, nil
	}

	t, err := time.Parse("2006-01-02 15:04", hour)
	if err != nil {
		return nil, fmt.Errorf("invalid hour format: %s", hour)
	}

	hourStart := t.Unix()
	stats, err = aggregateUserHourlyStats(ctx, userId, hourStart)
	if err != nil {
		return nil, err
	}

	if err := cacheSet(key, stats, 2*time.Hour); err != nil {
		logger.SysError("failed to cache user hourly stats: " + err.Error())
	}

	return stats, nil
}

// GetUserDailyStats retrieves cached user daily stats
func GetUserDailyStats(ctx context.Context, userId int, day string) (*AggregatedStats, error) {
	key := UserDailyStatsKey(userId, day)

	stats, err := cacheGet(key)
	if err == nil {
		return stats, nil
	}

	t, err := time.Parse("2006-01-02", day)
	if err != nil {
		return nil, fmt.Errorf("invalid day format: %s", day)
	}

	dayStart := t.Unix()
	stats, err = aggregateUserDailyStats(ctx, userId, dayStart)
	if err != nil {
		return nil, err
	}

	if err := cacheSet(key, stats, 48*time.Hour); err != nil {
		logger.SysError("failed to cache user daily stats: " + err.Error())
	}

	return stats, nil
}

// GetModelHourlyStats retrieves cached model hourly stats
func GetModelHourlyStats(ctx context.Context, modelName string, hour string) (*AggregatedStats, error) {
	key := ModelHourlyStatsKey(modelName, hour)

	stats, err := cacheGet(key)
	if err == nil {
		return stats, nil
	}

	t, err := time.Parse("2006-01-02 15:04", hour)
	if err != nil {
		return nil, fmt.Errorf("invalid hour format: %s", hour)
	}

	hourStart := t.Unix()
	stats, err = aggregateModelHourlyStats(ctx, modelName, hourStart)
	if err != nil {
		return nil, err
	}

	if err := cacheSet(key, stats, 2*time.Hour); err != nil {
		logger.SysError("failed to cache model hourly stats: " + err.Error())
	}

	return stats, nil
}

// GetModelDailyStats retrieves cached model daily stats
func GetModelDailyStats(ctx context.Context, modelName string, day string) (*AggregatedStats, error) {
	key := ModelDailyStatsKey(modelName, day)

	stats, err := cacheGet(key)
	if err == nil {
		return stats, nil
	}

	t, err := time.Parse("2006-01-02", day)
	if err != nil {
		return nil, fmt.Errorf("invalid day format: %s", day)
	}

	dayStart := t.Unix()
	stats, err = aggregateModelDailyStats(ctx, modelName, dayStart)
	if err != nil {
		return nil, err
	}

	if err := cacheSet(key, stats, 48*time.Hour); err != nil {
		logger.SysError("failed to cache model daily stats: " + err.Error())
	}

	return stats, nil
}

// GetChannelHourlyStats retrieves cached channel hourly stats
func GetChannelHourlyStats(ctx context.Context, channelId int, hour string) (*AggregatedStats, error) {
	key := ChannelHourlyStatsKey(channelId, hour)

	stats, err := cacheGet(key)
	if err == nil {
		return stats, nil
	}

	t, err := time.Parse("2006-01-02 15:04", hour)
	if err != nil {
		return nil, fmt.Errorf("invalid hour format: %s", hour)
	}

	hourStart := t.Unix()
	stats, err = aggregateChannelHourlyStats(ctx, channelId, hourStart)
	if err != nil {
		return nil, err
	}

	if err := cacheSet(key, stats, 2*time.Hour); err != nil {
		logger.SysError("failed to cache channel hourly stats: " + err.Error())
	}

	return stats, nil
}

// GetChannelDailyStats retrieves cached channel daily stats
func GetChannelDailyStats(ctx context.Context, channelId int, day string) (*AggregatedStats, error) {
	key := ChannelDailyStatsKey(channelId, day)

	stats, err := cacheGet(key)
	if err == nil {
		return stats, nil
	}

	t, err := time.Parse("2006-01-02", day)
	if err != nil {
		return nil, fmt.Errorf("invalid day format: %s", day)
	}

	dayStart := t.Unix()
	stats, err = aggregateChannelDailyStats(ctx, channelId, dayStart)
	if err != nil {
		return nil, err
	}

	if err := cacheSet(key, stats, 48*time.Hour); err != nil {
		logger.SysError("failed to cache channel daily stats: " + err.Error())
	}

	return stats, nil
}

// RunHourlyAggregation runs the hourly aggregation for the previous hour
func RunHourlyAggregation(ctx context.Context) error {
	now := time.Now()
	// Get the start of the previous hour
	prevHour := time.Date(now.Year(), now.Month(), now.Day(), now.Hour(), 0, 0, 0, now.Location()).Add(-time.Hour)
	hourStart := prevHour.Unix()
	hourStr := prevHour.Format("2006-01-02 15:04")

	logger.SysLogf("running hourly stats aggregation for %s", hourStr)

	// Aggregate global hourly stats
	stats, err := aggregateHourlyStats(ctx, hourStart)
	if err != nil {
		logger.SysError("failed to aggregate hourly stats: " + err.Error())
		return err
	}

	// Cache for 2 hours
	if err := cacheSet(HourlyStatsKey(hourStr), stats, 2*time.Hour); err != nil {
		logger.SysError("failed to cache hourly stats: " + err.Error())
	}

	logger.SysLogf("hourly stats aggregation completed: %d requests, %d quota", stats.RequestCount, stats.Quota)
	return nil
}

// RunDailyAggregation runs the daily aggregation for the previous day
func RunDailyAggregation(ctx context.Context) error {
	now := time.Now()
	// Get the start of the previous day
	prevDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location()).AddDate(0, 0, -1)
	dayStart := prevDay.Unix()
	dayStr := prevDay.Format("2006-01-02")

	logger.SysLogf("running daily stats aggregation for %s", dayStr)

	// Aggregate global daily stats
	stats, err := aggregateDailyStats(ctx, dayStart)
	if err != nil {
		logger.SysError("failed to aggregate daily stats: " + err.Error())
		return err
	}

	// Cache for 48 hours (2 days retention for daily stats)
	if err := cacheSet(DailyStatsKey(dayStr), stats, 48*time.Hour); err != nil {
		logger.SysError("failed to cache daily stats: " + err.Error())
	}

	logger.SysLogf("daily stats aggregation completed: %d requests, %d quota", stats.RequestCount, stats.Quota)
	return nil
}

// StartStatsAggregator starts the stats aggregation background service
func StartStatsAggregator() {
	if !config.StatsAggregatorEnabled {
		logger.SysLog("stats aggregator is disabled")
		return
	}

	logger.SysLog("stats aggregator started")
	ctx := context.Background()

	// Run initial aggregation for current hour and day
	now := time.Now()
	currentHour := time.Date(now.Year(), now.Month(), now.Day(), now.Hour(), 0, 0, 0, now.Location())
	currentDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	// Aggregate current hour
	if _, err := aggregateHourlyStats(ctx, currentHour.Unix()); err != nil {
		logger.SysError("initial hourly aggregation failed: " + err.Error())
	}

	// Aggregate current day
	if _, err := aggregateDailyStats(ctx, currentDay.Unix()); err != nil {
		logger.SysError("initial daily aggregation failed: " + err.Error())
	}

	// Start hourly aggregation goroutine
	go func() {
		for {
			// Calculate time until next hour
			now := time.Now()
			nextHour := time.Date(now.Year(), now.Month(), now.Day(), now.Hour()+1, 0, 0, 0, now.Location())
			timeUntilNextHour := nextHour.Sub(now)

			// Wait until the next hour
			time.Sleep(timeUntilNextHour)

			// Run aggregation for the previous hour
			if err := RunHourlyAggregation(ctx); err != nil {
				logger.SysError("hourly aggregation error: " + err.Error())
			}
		}
	}()

	// Start daily aggregation goroutine
	go func() {
		for {
			// Calculate time until next day at configured hour
			now := time.Now()
			hourOfDay := config.StatsAggregatorDailyHour
			nextDay := time.Date(now.Year(), now.Month(), now.Day(), hourOfDay, 0, 0, 0, now.Location())
			if now.Hour() >= hourOfDay {
				nextDay = nextDay.AddDate(0, 0, 1)
			}
			timeUntilNextDay := nextDay.Sub(now)

			// Wait until the scheduled time
			time.Sleep(timeUntilNextDay)

			// Run aggregation for the previous day
			if err := RunDailyAggregation(ctx); err != nil {
				logger.SysError("daily aggregation error: " + err.Error())
			}
		}
	}()
}

// GetRecentHourlyStats returns stats for the last N hours
func GetRecentHourlyStats(ctx context.Context, hours int) ([]*AggregatedStats, error) {
	var stats []*AggregatedStats
	now := time.Now()

	for i := 0; i < hours; i++ {
		hour := time.Date(now.Year(), now.Month(), now.Day(), now.Hour()-i, 0, 0, 0, now.Location())
		hourStr := hour.Format("2006-01-02 15:04")

		stat, err := GetHourlyStats(ctx, hourStr)
		if err != nil {
			logger.SysError(fmt.Sprintf("failed to get hourly stats for %s: %s", hourStr, err.Error()))
			continue
		}
		stats = append(stats, stat)
	}

	return stats, nil
}

// GetRecentDailyStats returns stats for the last N days
func GetRecentDailyStats(ctx context.Context, days int) ([]*AggregatedStats, error) {
	var stats []*AggregatedStats
	now := time.Now()

	for i := 0; i < days; i++ {
		day := time.Date(now.Year(), now.Month(), now.Day()-i, 0, 0, 0, 0, now.Location())
		dayStr := day.Format("2006-01-02")

		stat, err := GetDailyStats(ctx, dayStr)
		if err != nil {
			logger.SysError(fmt.Sprintf("failed to get daily stats for %s: %s", dayStr, err.Error()))
			continue
		}
		stats = append(stats, stat)
	}

	return stats, nil
}