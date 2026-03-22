package model

import (
	"encoding/json"
	"errors"
	"time"

	"github.com/songquanpeng/one-api/common/helper"
)

const (
	QuotaUnlimited = -1
)

var (
	ErrQuotaExceeded       = errors.New("token quota exceeded")
	ErrDailyQuotaExceeded  = errors.New("daily quota exceeded")
	ErrHourlyQuotaExceeded = errors.New("hourly quota exceeded")
	ErrRateLimitExceeded   = errors.New("rate limit exceeded")
	ErrTimeWindowDenied    = errors.New("access denied outside allowed time window")
)

type ModelQuotaConfig struct {
	Model string `json:"model"`
	Limit int64  `json:"limit"`
	Used  int64  `json:"used"`
}

func (t *Token) HasDailyQuotaLimit() bool {
	return t.DailyQuotaLimit != QuotaUnlimited
}

func (t *Token) HasHourlyQuotaLimit() bool {
	return t.HourlyQuotaLimit != QuotaUnlimited
}

func (t *Token) HasMonthlyQuotaLimit() bool {
	return t.MonthlyQuotaLimit != QuotaUnlimited
}

func (t *Token) HasRequestsPerMinuteLimit() bool {
	return t.RequestsPerMinute != QuotaUnlimited
}

func (t *Token) HasRequestsPerHourLimit() bool {
	return t.RequestsPerHour != QuotaUnlimited
}

func (t *Token) CheckQuota(quota int64) error {
	if t.UnlimitedQuota {
		return nil
	}
	if t.RemainQuota < quota {
		return ErrQuotaExceeded
	}
	return nil
}

func (t *Token) CheckDailyQuota(quota int64) error {
	if !t.HasDailyQuotaLimit() {
		return nil
	}
	if t.DailyUsedQuota+quota > t.DailyQuotaLimit {
		return ErrDailyQuotaExceeded
	}
	return nil
}

func (t *Token) CheckHourlyQuota(quota int64) error {
	if !t.HasHourlyQuotaLimit() {
		return nil
	}
	if t.HourlyUsedQuota+quota > t.HourlyQuotaLimit {
		return ErrHourlyQuotaExceeded
	}
	return nil
}

func (t *Token) CheckAllQuotas(quota int64) error {
	if err := t.CheckQuota(quota); err != nil {
		return err
	}
	if err := t.CheckDailyQuota(quota); err != nil {
		return err
	}
	if err := t.CheckHourlyQuota(quota); err != nil {
		return err
	}
	return nil
}

func (t *Token) NeedsQuotaReset() bool {
	if t.QuotaResetTime == 0 {
		return true
	}

	now := time.Now()
	resetTime := time.Unix(t.QuotaResetTime, 0)

	if t.QuotaTimezone != nil && *t.QuotaTimezone != "" {
		loc, err := time.LoadLocation(*t.QuotaTimezone)
		if err == nil {
			now = now.In(loc)
			resetTime = resetTime.In(loc)
		}
	}

	return now.Day() != resetTime.Day() || now.Hour() != resetTime.Hour()
}

func (t *Token) ShouldResetDailyQuota() bool {
	if t.QuotaResetTime == 0 {
		return true
	}

	now := time.Now()
	resetTime := time.Unix(t.QuotaResetTime, 0)

	if t.QuotaTimezone != nil && *t.QuotaTimezone != "" {
		loc, err := time.LoadLocation(*t.QuotaTimezone)
		if err == nil {
			now = now.In(loc)
			resetTime = resetTime.In(loc)
		}
	}

	return now.YearDay() != resetTime.YearDay()
}

func (t *Token) ShouldResetHourlyQuota() bool {
	if t.QuotaResetTime == 0 {
		return true
	}

	now := time.Now()
	resetTime := time.Unix(t.QuotaResetTime, 0)

	if t.QuotaTimezone != nil && *t.QuotaTimezone != "" {
		loc, err := time.LoadLocation(*t.QuotaTimezone)
		if err == nil {
			now = now.In(loc)
			resetTime = resetTime.In(loc)
		}
	}

	return now.Hour() != resetTime.Hour()
}

func (t *Token) UpdateQuotaResetTime() {
	t.QuotaResetTime = helper.GetTimestamp()
}

func (t *Token) GetAllowedHours() ([]int, error) {
	if t.AllowedHours == nil || *t.AllowedHours == "" {
		return nil, nil
	}

	var hours []int
	if err := json.Unmarshal([]byte(*t.AllowedHours), &hours); err != nil {
		return nil, err
	}
	return hours, nil
}

func (t *Token) GetAllowedDays() ([]int, error) {
	if t.AllowedDays == nil || *t.AllowedDays == "" {
		return nil, nil
	}

	var days []int
	if err := json.Unmarshal([]byte(*t.AllowedDays), &days); err != nil {
		return nil, err
	}
	return days, nil
}

func (t *Token) IsAllowedTime() error {
	hours, err := t.GetAllowedHours()
	if err != nil {
		return err
	}

	days, err := t.GetAllowedDays()
	if err != nil {
		return err
	}

	if hours == nil && days == nil {
		return nil
	}

	now := time.Now()
	if t.QuotaTimezone != nil && *t.QuotaTimezone != "" {
		loc, err := time.LoadLocation(*t.QuotaTimezone)
		if err == nil {
			now = now.In(loc)
		}
	}

	if days != nil {
		currentDay := int(now.Weekday())
		found := false
		for _, d := range days {
			if d == currentDay {
				found = true
				break
			}
		}
		if !found {
			return ErrTimeWindowDenied
		}
	}

	if hours != nil {
		currentHour := now.Hour()
		found := false
		for _, h := range hours {
			if h == currentHour {
				found = true
				break
			}
		}
		if !found {
			return ErrTimeWindowDenied
		}
	}

	return nil
}

func (t *Token) GetModelQuotas() ([]ModelQuotaConfig, error) {
	if t.ModelQuotas == nil || *t.ModelQuotas == "" {
		return nil, nil
	}

	var quotas []ModelQuotaConfig
	if err := json.Unmarshal([]byte(*t.ModelQuotas), &quotas); err != nil {
		return nil, err
	}
	return quotas, nil
}

func (t *Token) CheckModelQuota(model string, quota int64) error {
	quotas, err := t.GetModelQuotas()
	if err != nil || quotas == nil {
		return nil
	}

	for _, mq := range quotas {
		if mq.Model == model {
			if mq.Limit != QuotaUnlimited && mq.Used+quota > mq.Limit {
				return ErrQuotaExceeded
			}
			break
		}
	}
	return nil
}

func (t *Token) UpdateUsedQuotas(quota int64) {
	t.DailyUsedQuota += quota
	t.HourlyUsedQuota += quota
}

func (t *Token) ResetDailyUsedQuota() {
	t.DailyUsedQuota = 0
}

func (t *Token) ResetHourlyUsedQuota() {
	t.HourlyUsedQuota = 0
}

func (t *Token) ResetAllUsedQuotas() {
	t.DailyUsedQuota = 0
	t.HourlyUsedQuota = 0
	t.QuotaResetTime = helper.GetTimestamp()
}