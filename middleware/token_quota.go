package middleware

import (
	"fmt"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/songquanpeng/one-api/common"
	"github.com/songquanpeng/one-api/common/ctxkey"
	"github.com/songquanpeng/one-api/common/helper"
	"github.com/songquanpeng/one-api/common/logger"
	"github.com/songquanpeng/one-api/model"
)

// Redis key patterns for quota tracking
const (
	TokenDailyUsedQuotaKey  = "token_daily_used_quota:%d"
	TokenHourlyUsedQuotaKey = "token_hourly_used_quota:%d"
	TokenQuotaResetTimeKey  = "token_quota_reset_time:%d"
	TokenRequestCountKey    = "token_request_count:%d:%s" // tokenId:window (minute/hour)
)

// In-memory fallback for quota tracking when Redis is not available
var (
	quotaMemoryCache     = make(map[int64]int64)
	quotaMemoryCacheLock sync.RWMutex
	resetTimeCache       = make(map[int64]int64)
	resetTimeCacheLock   sync.RWMutex
	requestCountCache    = make(map[string]int)
	requestCountLock     sync.RWMutex
)

// getDailyUsedQuota retrieves the daily used quota for a token
func getDailyUsedQuota(tokenId int64) int64 {
	if common.RedisEnabled {
		key := fmt.Sprintf(TokenDailyUsedQuotaKey, tokenId)
		val, err := common.RedisGet(key)
		if err != nil {
			return 0
		}
		quota, _ := strconv.ParseInt(val, 10, 64)
		return quota
	}

	quotaMemoryCacheLock.RLock()
	defer quotaMemoryCacheLock.RUnlock()
	return quotaMemoryCache[tokenId]
}

// getHourlyUsedQuota retrieves the hourly used quota for a token
func getHourlyUsedQuota(tokenId int64) int64 {
	if common.RedisEnabled {
		key := fmt.Sprintf(TokenHourlyUsedQuotaKey, tokenId)
		val, err := common.RedisGet(key)
		if err != nil {
			return 0
		}
		quota, _ := strconv.ParseInt(val, 10, 64)
		return quota
	}

	quotaMemoryCacheLock.RLock()
	defer quotaMemoryCacheLock.RUnlock()
	return quotaMemoryCache[-tokenId] // Use negative key for hourly to distinguish
}

// setDailyUsedQuota sets the daily used quota for a token
func setDailyUsedQuota(tokenId int64, quota int64) {
	if common.RedisEnabled {
		key := fmt.Sprintf(TokenDailyUsedQuotaKey, tokenId)
		// Set with expiration at end of day (24 hours max)
		common.RedisSet(key, strconv.FormatInt(quota, 10), 24*time.Hour)
		return
	}

	quotaMemoryCacheLock.Lock()
	defer quotaMemoryCacheLock.Unlock()
	quotaMemoryCache[tokenId] = quota
}

// setHourlyUsedQuota sets the hourly used quota for a token
func setHourlyUsedQuota(tokenId int64, quota int64) {
	if common.RedisEnabled {
		key := fmt.Sprintf(TokenHourlyUsedQuotaKey, tokenId)
		// Set with expiration at end of hour (1 hour max)
		common.RedisSet(key, strconv.FormatInt(quota, 10), 1*time.Hour)
		return
	}

	quotaMemoryCacheLock.Lock()
	defer quotaMemoryCacheLock.Unlock()
	quotaMemoryCache[-tokenId] = quota // Use negative key for hourly
}

// increaseDailyUsedQuota atomically increases the daily used quota
func increaseDailyUsedQuota(tokenId int64, quota int64) error {
	if common.RedisEnabled {
		key := fmt.Sprintf(TokenDailyUsedQuotaKey, tokenId)
		err := common.RedisDecrease(key, -quota) // Negative to increase
		if err != nil {
			// Key might not exist, set it
			common.RedisSet(key, strconv.FormatInt(quota, 10), 24*time.Hour)
		}
		return nil
	}

	quotaMemoryCacheLock.Lock()
	defer quotaMemoryCacheLock.Unlock()
	quotaMemoryCache[tokenId] += quota
	return nil
}

// increaseHourlyUsedQuota atomically increases the hourly used quota
func increaseHourlyUsedQuota(tokenId int64, quota int64) error {
	if common.RedisEnabled {
		key := fmt.Sprintf(TokenHourlyUsedQuotaKey, tokenId)
		err := common.RedisDecrease(key, -quota) // Negative to increase
		if err != nil {
			// Key might not exist, set it
			common.RedisSet(key, strconv.FormatInt(quota, 10), 1*time.Hour)
		}
		return nil
	}

	quotaMemoryCacheLock.Lock()
	defer quotaMemoryCacheLock.Unlock()
	quotaMemoryCache[-tokenId] += quota
	return nil
}

// getQuotaResetTime gets the last quota reset timestamp
func getQuotaResetTime(tokenId int64) int64 {
	if common.RedisEnabled {
		key := fmt.Sprintf(TokenQuotaResetTimeKey, tokenId)
		val, err := common.RedisGet(key)
		if err != nil {
			return 0
		}
		ts, _ := strconv.ParseInt(val, 10, 64)
		return ts
	}

	resetTimeCacheLock.RLock()
	defer resetTimeCacheLock.RUnlock()
	return resetTimeCache[tokenId]
}

// setQuotaResetTime sets the quota reset timestamp
func setQuotaResetTime(tokenId int64, timestamp int64) {
	if common.RedisEnabled {
		key := fmt.Sprintf(TokenQuotaResetTimeKey, tokenId)
		common.RedisSet(key, strconv.FormatInt(timestamp, 10), 48*time.Hour)
		return
	}

	resetTimeCacheLock.Lock()
	defer resetTimeCacheLock.Unlock()
	resetTimeCache[tokenId] = timestamp
}

// checkAndResetQuotas checks if quotas need reset and resets them if necessary
func checkAndResetQuotas(token *model.Token) {
	tokenId := int64(token.Id)
	resetTime := getQuotaResetTime(tokenId)
	now := time.Now()

	if resetTime == 0 {
		setQuotaResetTime(tokenId, helper.GetTimestamp())
		return
	}

	resetTs := time.Unix(resetTime, 0)

	// Apply timezone if configured
	if token.QuotaTimezone != nil && *token.QuotaTimezone != "" {
		loc, err := time.LoadLocation(*token.QuotaTimezone)
		if err == nil {
			now = now.In(loc)
			resetTs = resetTs.In(loc)
		}
	}

	// Check daily reset (different day)
	if now.YearDay() != resetTs.YearDay() || now.Year() != resetTs.Year() {
		setDailyUsedQuota(tokenId, 0)
	}

	// Check hourly reset (different hour)
	if now.Hour() != resetTs.Hour() || now.Day() != resetTs.Day() {
		setHourlyUsedQuota(tokenId, 0)
	}

	// Update reset time
	setQuotaResetTime(tokenId, helper.GetTimestamp())
}

// checkRequestRateLimit checks rate limiting for requests per minute/hour
func checkRequestRateLimit(token *model.Token) error {
	tokenId := int64(token.Id)
	now := time.Now()

	// Check requests per minute
	if token.HasRequestsPerMinuteLimit() {
		key := fmt.Sprintf(TokenRequestCountKey, tokenId, "minute")
		minuteKey := fmt.Sprintf("%d:%d", now.Hour(), now.Minute())

		count := getRequestCount(key, minuteKey)
		if count >= token.RequestsPerMinute {
			return model.ErrRateLimitExceeded
		}
		incrementRequestCount(key, minuteKey, 60*time.Second)
	}

	// Check requests per hour
	if token.HasRequestsPerHourLimit() {
		key := fmt.Sprintf(TokenRequestCountKey, tokenId, "hour")
		hourKey := fmt.Sprintf("%d", now.Hour())

		count := getRequestCount(key, hourKey)
		if count >= token.RequestsPerHour {
			return model.ErrRateLimitExceeded
		}
		incrementRequestCount(key, hourKey, 1*time.Hour)
	}

	return nil
}

// getRequestCount gets the request count for a specific time window
func getRequestCount(key string, windowKey string) int {
	if common.RedisEnabled {
		fullKey := key + ":" + windowKey
		val, err := common.RedisGet(fullKey)
		if err != nil {
			return 0
		}
		count, _ := strconv.Atoi(val)
		return count
	}

	requestCountLock.RLock()
	defer requestCountLock.RUnlock()
	return requestCountCache[key+":"+windowKey]
}

// incrementRequestCount increments the request count for a time window
func incrementRequestCount(key string, windowKey string, expiration time.Duration) {
	fullKey := key + ":" + windowKey

	if common.RedisEnabled {
		val, err := common.RedisGet(fullKey)
		if err != nil {
			common.RedisSet(fullKey, "1", expiration)
			return
		}
		count, _ := strconv.Atoi(val)
		common.RedisSet(fullKey, strconv.Itoa(count+1), expiration)
		return
	}

	requestCountLock.Lock()
	defer requestCountLock.Unlock()
	requestCountCache[fullKey]++
}

// TokenQuotaMiddleware checks time-window based quota limits
// This should be called after TokenAuth middleware
func TokenQuotaMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get token from context (set by TokenAuth)
		tokenIdValue, exists := c.Get(ctxkey.TokenId)
		if !exists {
			c.Next()
			return
		}

		tokenId := tokenIdValue.(int)

		// Get token from cache
		token, err := model.GetTokenById(tokenId)
		if err != nil {
			abortWithMessage(c, http.StatusInternalServerError, "failed to get token")
			return
		}

		// Check allowed time windows (days/hours)
		if err := token.IsAllowedTime(); err != nil {
			abortWithMessage(c, http.StatusForbidden, err.Error())
			return
		}

		// Check and reset quotas if needed
		checkAndResetQuotas(token)

		// Load current usage from cache
		token.DailyUsedQuota = getDailyUsedQuota(int64(tokenId))
		token.HourlyUsedQuota = getHourlyUsedQuota(int64(tokenId))

		// Check rate limits (requests per minute/hour)
		if err := checkRequestRateLimit(token); err != nil {
			abortWithMessage(c, http.StatusTooManyRequests, err.Error())
			return
		}

		// Store updated token in context for later use
		c.Set(ctxkey.Token, token)

		c.Next()
	}
}

// DecreaseTokenQuotaWithTimeWindow decreases all quota types including time-window quotas
// This should be called after successful request completion
func DecreaseTokenQuotaWithTimeWindow(tokenId int, quota int64) error {
	if quota <= 0 {
		return nil
	}

	// Update time-window quotas in cache
	if err := increaseDailyUsedQuota(int64(tokenId), quota); err != nil {
		logger.SysError("failed to increase daily used quota: " + err.Error())
	}
	if err := increaseHourlyUsedQuota(int64(tokenId), quota); err != nil {
		logger.SysError("failed to increase hourly used quota: " + err.Error())
	}

	return nil
}

// CheckTokenQuota checks if token has enough quota for the requested amount
// This includes RemainQuota, DailyUsedQuota, and HourlyUsedQuota
func CheckTokenQuota(token *model.Token, requestedQuota int64) error {
	// Load current usage from cache
	token.DailyUsedQuota = getDailyUsedQuota(int64(token.Id))
	token.HourlyUsedQuota = getHourlyUsedQuota(int64(token.Id))

	// Use the token's CheckAllQuotas method
	return token.CheckAllQuotas(requestedQuota)
}

// GetTokenQuotaUsage returns current quota usage for a token
func GetTokenQuotaUsage(tokenId int) (dailyUsed, hourlyUsed int64) {
	dailyUsed = getDailyUsedQuota(int64(tokenId))
	hourlyUsed = getHourlyUsedQuota(int64(tokenId))
	return
}

// ResetTokenQuotaCache resets quota cache for a specific token
// Useful when token is updated or deleted
func ResetTokenQuotaCache(tokenId int) {
	if common.RedisEnabled {
		common.RedisDel(fmt.Sprintf(TokenDailyUsedQuotaKey, tokenId))
		common.RedisDel(fmt.Sprintf(TokenHourlyUsedQuotaKey, tokenId))
		common.RedisDel(fmt.Sprintf(TokenQuotaResetTimeKey, tokenId))
		return
	}

	quotaMemoryCacheLock.Lock()
	defer quotaMemoryCacheLock.Unlock()
	delete(quotaMemoryCache, int64(tokenId))
	delete(quotaMemoryCache, -int64(tokenId))

	resetTimeCacheLock.Lock()
	defer resetTimeCacheLock.Unlock()
	delete(resetTimeCache, int64(tokenId))
}