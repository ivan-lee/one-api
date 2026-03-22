#!/bin/bash
# =============================================
# One-API 停止服务脚本
# =============================================
# 用途：安全停止 one-api 服务
# 使用：./stop.sh
# =============================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# 停止进程
log_info "停止 one-api 服务..."

if pkill -f "one-api"; then
    sleep 2
    
    # 检查是否完全停止
    if pgrep -f "one-api" > /dev/null; then
        log_warn "进程未完全停止，尝试强制停止..."
        sleep 2
        pkill -9 -f "one-api" || true
    fi
    
    log_info "✓ one-api 已停止"
else
    log_info "✓ 没有运行中的 one-api 进程"
fi

echo ""
log_info "服务已停止"
