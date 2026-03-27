#!/bin/bash
# =============================================
# One-API 快速启动脚本
# =============================================
# 用途：加载配置并启动 one-api 服务
# 使用：./start.sh 或 ./start.sh --foreground
# =============================================

set -e

# ==================== 配置区域 ====================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ==================== 检查环境 ====================
check_prerequisites() {
    # 检查 one-api 是否存在
    if [ ! -f "one-api" ]; then
        log_error "one-api 二进制文件不存在，请先运行：./build-all.sh"
        exit 1
    fi
    
    # 检查 .env 文件
    if [ ! -f ".env" ]; then
        log_warn ".env 文件不存在，将使用默认配置"
        log_info "建议复制配置模板：cp .env.production .env"
    fi
    
    # 检查日志目录
    if [ ! -d "logs" ]; then
        mkdir -p logs
        log_info "创建日志目录：logs"
    fi
}

# ==================== 加载环境变量 ====================
load_env() {
    log_info "加载环境变量..."
    
    # 如果存在 .env 文件，加载它
    if [ -f ".env" ]; then
        set -a
        source .env
        set +a
        log_info "✓ 已加载 .env 文件"
    else
        log_warn "⚠ 未找到 .env 文件，使用默认配置"
        
        # 设置默认值
        export SQL_DSN="${SQL_DSN:-oneapi:OneAPI@2026@tcp(localhost:3306)/one-api}"
        export REDIS_CONN_STRING="${REDIS_CONN_STRING:-redis://localhost:6379}"
        export SYNC_FREQUENCY="${SYNC_FREQUENCY:-60}"
        export SESSION_SECRET="${SESSION_SECRET:-$(openssl rand -base64 32)}"
        export MEMORY_CACHE_ENABLED="${MEMORY_CACHE_ENABLED:-true}"
        export BATCH_UPDATE_ENABLED="${BATCH_UPDATE_ENABLED:-true}"
    fi
}

# ==================== 检查服务 ====================
check_services() {
    log_info "检查依赖服务..."
    
    # 检查 MySQL
    if command -v docker &> /dev/null && docker ps | grep -q mysql; then
        log_info "✓ MySQL 容器运行中"
    else
        log_warn "⚠ MySQL 容器未运行，请确保数据库可用"
    fi
    
    # 检查 Redis
    if command -v docker &> /dev/null && docker ps | grep -q redis; then
        log_info "✓ Redis 容器运行中"
    else
        log_warn "⚠ Redis 容器未运行，缓存功能将不可用"
    fi
    
    echo ""
}

# ==================== 停止旧进程 ====================
stop_existing() {
    log_info "停止现有的 one-api 进程..."
    
    if pkill -f "one-api" 2>/dev/null; then
        sleep 2
        log_info "✓ 已停止旧进程"
    else
        log_info "✓ 没有运行中的 one-api 进程"
    fi
    
    echo ""
}

# ==================== 启动服务 ====================
start_service() {
    local foreground="$1"
    
    log_info "启动 one-api 服务..."
    log_info "端口：${PORT:-3000}"
    log_info "日志目录：./logs"
    echo ""
    
    if [ "$foreground" = "--foreground" ] || [ "$foreground" = "-f" ]; then
        # 前台运行
        log_info "前台运行模式（按 Ctrl+C 停止）"
        echo ""
        ./one-api --port "${PORT:-3000}" --log-dir ./logs
    else
        # 后台运行
        log_info "后台运行模式"
        nohup ./one-api --port "${PORT:-3000}" --log-dir ./logs > /dev/null 2>&1 &
        PID=$!
        
        # 等待启动
        sleep 5
        
        # 检查进程
        if ps -p $PID > /dev/null; then
            log_info "✓ one-api 启动成功 (PID: $PID)"
        else
            log_error "✗ one-api 启动失败，请查看日志：logs/oneapi-*.log"
            exit 1
        fi
    fi
    
    echo ""
}

# ==================== 验证服务 ====================
verify_service() {
    log_info "验证服务..."
    
    # 等待服务完全启动
    sleep 5
    
    # 测试 API
    if curl -s http://localhost:${PORT:-3000}/api/status > /dev/null; then
        log_info "✓ API 接口正常"
    else
        log_error "✗ API 接口无响应"
        exit 1
    fi
    
    # 测试前端
    if curl -s http://localhost:${PORT:-3000}/ | grep -q "One API"; then
        log_info "✓ 前端页面正常"
    else
        log_warn "⚠ 前端页面可能有问题"
    fi
    
    echo ""
}

# ==================== 显示状态 ====================
show_status() {
    log_info "=========================================="
    log_info "one-api 服务状态"
    log_info "=========================================="
    echo ""
    log_info "访问地址：http://localhost:${PORT:-3000}"
    log_info "登录账号：root / 123456"
    log_info ""
    log_info "管理命令："
    echo "  查看日志：tail -f logs/oneapi-*.log"
    echo "  停止服务：./stop.sh"
    echo "  重启服务：./restart.sh"
    echo ""
    log_info "⚠️  首次登录后请立即修改默认密码！"
    echo ""
}

# ==================== 帮助信息 ====================
show_help() {
    echo "One-API 快速启动脚本"
    echo ""
    echo "用法：$0 [选项]"
    echo ""
    echo "选项:"
    echo "  -f, --foreground    前台运行（默认后台运行）"
    echo "  -s, --stop          先停止现有服务再启动"
    echo "  -h, --help          显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0                  # 后台启动"
    echo "  $0 -f               # 前台启动"
    echo "  $0 -s               # 重启服务"
    echo ""
}

# ==================== 主流程 ====================
main() {
    echo ""
    log_info "=========================================="
    log_info "One-API 快速启动"
    log_info "=========================================="
    echo ""
    
    # 解析参数
    local foreground=""
    local stop_first=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -f|--foreground)
                foreground="--foreground"
                shift
                ;;
            -s|--stop)
                stop_first=true
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                log_error "未知选项：$1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # 检查环境
    check_prerequisites
    
    # 加载环境变量
    load_env
    
    # 检查服务
    check_services
    
    # 停止旧进程（如果需要）
    if [ "$stop_first" = true ]; then
        stop_existing
    fi
    
    # 启动服务
    start_service "$foreground"
    
    # 验证服务（仅后台模式）
    if [ "$foreground" != "--foreground" ]; then
        verify_service
        show_status
    fi
}

# 执行主流程
main "$@"
