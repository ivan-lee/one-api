-- Migration: Add indexes to logs table for improved query performance
-- Run this script if GORM auto-migration is not available or for manual migration
-- These indexes optimize common query patterns in model/log.go

-- MySQL syntax (primary)
-- Index for user-specific log queries (GetUserLogs, GetUserLogsWithCount, SearchUserLogsFuzzy)
CREATE INDEX IF NOT EXISTS idx_logs_user_id_type ON logs(user_id, type);

-- Index for time-range queries filtered by type (GetAllLogs, SumUsedQuota, SumUsedToken)
-- Reverse order from GORM's idx_created_at_type for better selectivity when filtering by type first
CREATE INDEX IF NOT EXISTS idx_logs_type_created_at ON logs(type, created_at);

-- Index for token-specific statistics queries (GetTokenUsageStats, GetTokenDailyStats, etc.)
CREATE INDEX IF NOT EXISTS idx_logs_token_name_type ON logs(token_name, type);

-- Index for channel-based queries with time range (GetAllLogs, SumUsedQuota)
CREATE INDEX IF NOT EXISTS idx_logs_channel_id_created_at ON logs(channel_id, created_at);

-- Index for user + time range queries (SearchLogsByDayAndModel, GetUserLogs with time filter)
CREATE INDEX IF NOT EXISTS idx_logs_user_id_created_at ON logs(user_id, created_at);

-- Index for username queries (GetAllLogs, SumUsedQuota, SumUsedToken)
CREATE INDEX IF NOT EXISTS idx_logs_username ON logs(username);

-- PostgreSQL syntax (uncomment if using PostgreSQL)
-- CREATE INDEX IF NOT EXISTS idx_logs_user_id_type ON logs(user_id, type);
-- CREATE INDEX IF NOT EXISTS idx_logs_type_created_at ON logs(type, created_at);
-- CREATE INDEX IF NOT EXISTS idx_logs_token_name_type ON logs(token_name, type);
-- CREATE INDEX IF NOT EXISTS idx_logs_channel_id_created_at ON logs(channel_id, created_at);
-- CREATE INDEX IF NOT EXISTS idx_logs_user_id_created_at ON logs(user_id, created_at);
-- CREATE INDEX IF NOT EXISTS idx_logs_username ON logs(username);

-- SQLite syntax (uncomment if using SQLite)
-- Note: SQLite doesn't support IF NOT EXISTS for CREATE INDEX before version 3.8.0
-- For older SQLite versions, check if index exists before creating
-- CREATE INDEX IF NOT EXISTS idx_logs_user_id_type ON logs(user_id, type);
-- CREATE INDEX IF NOT EXISTS idx_logs_type_created_at ON logs(type, created_at);
-- CREATE INDEX IF NOT EXISTS idx_logs_token_name_type ON logs(token_name, type);
-- CREATE INDEX IF NOT EXISTS idx_logs_channel_id_created_at ON logs(channel_id, created_at);
-- CREATE INDEX IF NOT EXISTS idx_logs_user_id_created_at ON logs(user_id, created_at);
-- CREATE INDEX IF NOT EXISTS idx_logs_username ON logs(username);

-- Note: GORM auto-migration already creates these indexes from model/log.go:
-- - idx_created_at_type (created_at, type)
-- - index_username_model_name (model_name, username)
-- - idx_logs_user_id (user_id)
-- - idx_logs_token_name (token_name)
-- - idx_logs_model_name (model_name)
-- - idx_logs_channel_id (channel_id)
-- 
-- This script adds additional composite indexes that improve performance for:
-- 1. User-specific filtered queries (user_id + type)
-- 2. Type-first time-range queries (type + created_at)
-- 3. Token statistics queries (token_name + type)
-- 4. Channel time-range queries (channel_id + created_at)
-- 5. User time-range queries (user_id + created_at)
-- 6. Username lookups (username)