-- Migration: Add time-window quota control fields to tokens table
-- Run this script if GORM auto-migration is not available or for manual migration

-- MySQL syntax
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS daily_quota_limit BIGINT DEFAULT -1;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS hourly_quota_limit BIGINT DEFAULT -1;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS monthly_quota_limit BIGINT DEFAULT -1;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS quota_reset_time BIGINT DEFAULT 0;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS quota_timezone VARCHAR(64);
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS model_quotas TEXT;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS requests_per_minute INT DEFAULT -1;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS requests_per_hour INT DEFAULT -1;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS allowed_hours VARCHAR(48);
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS allowed_days VARCHAR(32);

-- PostgreSQL syntax (uncomment if using PostgreSQL)
-- ALTER TABLE tokens ADD COLUMN IF NOT EXISTS daily_quota_limit BIGINT DEFAULT -1;
-- ALTER TABLE tokens ADD COLUMN IF NOT EXISTS hourly_quota_limit BIGINT DEFAULT -1;
-- ALTER TABLE tokens ADD COLUMN IF NOT EXISTS monthly_quota_limit BIGINT DEFAULT -1;
-- ALTER TABLE tokens ADD COLUMN IF NOT EXISTS quota_reset_time BIGINT DEFAULT 0;
-- ALTER TABLE tokens ADD COLUMN IF NOT EXISTS quota_timezone VARCHAR(64);
-- ALTER TABLE tokens ADD COLUMN IF NOT EXISTS model_quotas TEXT;
-- ALTER TABLE tokens ADD COLUMN IF NOT EXISTS requests_per_minute INTEGER DEFAULT -1;
-- ALTER TABLE tokens ADD COLUMN IF NOT EXISTS requests_per_hour INTEGER DEFAULT -1;
-- ALTER TABLE tokens ADD COLUMN IF NOT EXISTS allowed_hours VARCHAR(48);
-- ALTER TABLE tokens ADD COLUMN IF NOT EXISTS allowed_days VARCHAR(32);

-- SQLite syntax (uncomment if using SQLite)
-- Note: SQLite doesn't support IF NOT EXISTS for ADD COLUMN
-- Run these only if the columns don't exist yet
-- ALTER TABLE tokens ADD COLUMN daily_quota_limit BIGINT DEFAULT -1;
-- ALTER TABLE tokens ADD COLUMN hourly_quota_limit BIGINT DEFAULT -1;
-- ALTER TABLE tokens ADD COLUMN monthly_quota_limit BIGINT DEFAULT -1;
-- ALTER TABLE tokens ADD COLUMN quota_reset_time BIGINT DEFAULT 0;
-- ALTER TABLE tokens ADD COLUMN quota_timezone VARCHAR(64);
-- ALTER TABLE tokens ADD COLUMN model_quotas TEXT;
-- ALTER TABLE tokens ADD COLUMN requests_per_minute INTEGER DEFAULT -1;
-- ALTER TABLE tokens ADD COLUMN requests_per_hour INTEGER DEFAULT -1;
-- ALTER TABLE tokens ADD COLUMN allowed_hours VARCHAR(48);
-- ALTER TABLE tokens ADD COLUMN allowed_days VARCHAR(32);