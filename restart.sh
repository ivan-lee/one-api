#!/bin/bash
# =============================================
# One-API 重启服务脚本
# =============================================
# 用途：停止并重新启动 one-api 服务
# 使用：./restart.sh
# =============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 颜色输出
GREEN='\033[0;32m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_info "=========================================="
log_info "One-API 重启服务"
log_info "=========================================="
echo ""

# 停止服务
log_info "停止现有服务..."
./stop.sh

echo ""

# 启动服务
log_info "启动新服务..."
./start.sh
