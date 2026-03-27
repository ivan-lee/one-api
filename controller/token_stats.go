package controller

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/songquanpeng/one-api/common/ctxkey"
	"github.com/songquanpeng/one-api/model"
)

func GetTokenUsageStats(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无效的令牌ID",
		})
		return
	}

	userId := c.GetInt(ctxkey.Id)
	token, err := model.GetTokenByIds(id, userId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	startTimestamp, endTimestamp := parseTimeRange(c)

	stats, err := model.GetTokenUsageStats(token.Name, startTimestamp, endTimestamp)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "获取统计信息失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"total_requests":         stats.TotalRequests,
			"total_quota":            stats.TotalQuota,
			"total_prompt_tokens":    stats.TotalPromptTokens,
			"total_completion_tokens": stats.TotalCompletion,
		},
	})
}

func GetTokenDailyStats(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无效的令牌ID",
		})
		return
	}

	userId := c.GetInt(ctxkey.Id)
	token, err := model.GetTokenByIds(id, userId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	startTimestamp, endTimestamp := parseTimeRange(c)

	stats, err := model.GetTokenDailyStats(token.Name, startTimestamp, endTimestamp)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "获取统计信息失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    stats,
	})
}

func GetTokenHourlyStats(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无效的令牌ID",
		})
		return
	}

	userId := c.GetInt(ctxkey.Id)
	token, err := model.GetTokenByIds(id, userId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	startTimestamp, endTimestamp := parseTimeRange(c)

	stats, err := model.GetTokenHourlyStats(token.Name, startTimestamp, endTimestamp)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "获取统计信息失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    stats,
	})
}

func GetTokenModelStats(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无效的令牌ID",
		})
		return
	}

	userId := c.GetInt(ctxkey.Id)
	token, err := model.GetTokenByIds(id, userId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	startTimestamp, endTimestamp := parseTimeRange(c)

	stats, err := model.GetTokenModelStats(token.Name, startTimestamp, endTimestamp)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "获取统计信息失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    stats,
	})
}

func parseTimeRange(c *gin.Context) (startTimestamp, endTimestamp int64) {
	startStr := c.Query("start_timestamp")
	endStr := c.Query("end_timestamp")

	if startStr != "" {
		startTimestamp, _ = strconv.ParseInt(startStr, 10, 64)
	}
	if endStr != "" {
		endTimestamp, _ = strconv.ParseInt(endStr, 10, 64)
	}

	if startTimestamp == 0 && endTimestamp == 0 {
		now := time.Now()
		startTimestamp = now.AddDate(0, 0, -7).Truncate(24 * time.Hour).Unix()
		endTimestamp = now.Truncate(24*time.Hour).Add(24*time.Hour - time.Second).Unix()
	}

	return
}