#!/bin/bash
# =============================================
# One-API 完整构建脚本
# =============================================
# 用途：构建前端 + 编译后端，生成可执行文件
# 使用：./build-all.sh
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
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# ==================== 环境检查 ====================
check_environment() {
    log_step "检查构建环境..."
    
    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装，请先安装 Node.js"
        exit 1
    fi
    
    # 检查 npm
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安装，请先安装 npm"
        exit 1
    fi
    
    # 检查 Go
    if ! command -v go &> /dev/null; then
        log_error "Go 未安装，请先安装 Go (要求 1.20+)"
        exit 1
    fi
    
    log_info "✓ Node.js: $(node --version)"
    log_info "✓ npm: $(npm --version)"
    log_info "✓ Go: $(go version)"
    echo ""
}

# ==================== 构建前端 ====================
build_frontend() {
    log_step "构建前端..."
    
    # 检查前端目录
    if [ ! -d "web/default" ]; then
        log_error "web/default 目录不存在"
        exit 1
    fi
    
    cd web/default
    
    # 安装依赖
    log_info "安装前端依赖..."
    npm install --legacy-peer-deps
    
    # 获取版本号
    if [ -f "../../VERSION" ]; then
        version=$(cat ../../VERSION)
    else
        version="v0.0.0"
    fi
    
    # 构建主题
    log_info "构建 default 主题..."
    DISABLE_ESLINT_PLUGIN='true' REACT_APP_VERSION="$version" npm run build
    
    # 验证构建结果
    if [ -f "../../web/build/default/index.html" ]; then
        log_info "✓ 前端构建成功"
        ls -lh ../../web/build/default/index.html
    else
        log_error "✗ 前端构建失败：index.html 未生成"
        exit 1
    fi
    
    cd ../..
    echo ""
}

# ==================== 编译后端 ====================
build_backend() {
    log_step "编译后端..."
    
    # 获取 Git 版本信息
    if git describe --tags &> /dev/null; then
        version=$(git describe --tags)
    else
        version="v0.0.0"
    fi
    
    log_info "版本：$version"
    
    # 编译
    log_info "编译 one-api..."
    go build -ldflags "-s -w -X 'github.com/songquanpeng/one-api/common.Version=$version'" -o one-api
    
    # 验证编译结果
    if [ -f "one-api" ]; then
        log_info "✓ 后端编译成功"
        ls -lh one-api
        
        # 检查是否嵌入了前端文件
        file_size=$(stat -f%z one-api 2>/dev/null || stat -c%s one-api 2>/dev/null)
        if [ "$file_size" -gt 30000000 ]; then
            log_info "✓ 前端资源已嵌入（文件大小：$(du -h one-api | cut -f1)）"
        else
            log_warn "⚠ 文件较小，可能未嵌入前端资源"
        fi
    else
        log_error "✗ 后端编译失败"
        exit 1
    fi
    
    echo ""
}

# ==================== 清理旧文件 ====================
cleanup() {
    log_step "清理旧文件..."
    
    # 清理旧的构建文件
    if [ -d "web/default/build" ]; then
        rm -rf web/default/build
        log_info "✓ 清理 web/default/build"
    fi
    
    # 清理旧的二进制文件（可选）
    # if [ -f "one-api" ]; then
    #     rm one-api
    #     log_info "✓ 清理旧的 one-api 二进制文件"
    # fi
    
    echo ""
}

# ==================== 显示构建信息 ====================
show_build_info() {
    log_info "=========================================="
    log_info "构建完成！"
    log_info "=========================================="
    echo ""
    log_info "可执行文件：$(pwd)/one-api"
    log_info "前端文件：$(pwd)/web/build/default/"
    echo ""
    log_info "启动命令："
    echo "  export SQL_DSN=\"oneapi:password@tcp(localhost:3306)/one-api\""
    echo "  export REDIS_CONN_STRING=\"redis://localhost:6379\""
    echo "  export SESSION_SECRET=\"your_secret_key\""
    echo "  ./one-api --port 3000 --log-dir ./logs"
    echo ""
}

# ==================== 主流程 ====================
main() {
    echo ""
    log_info "=========================================="
    log_info "One-API 构建脚本"
    log_info "=========================================="
    echo ""
    
    # 清理
    cleanup
    
    # 检查环境
    check_environment
    
    # 构建前端
    build_frontend
    
    # 编译后端
    build_backend
    
    # 显示信息
    show_build_info
    
    log_info "构建成功！🎉"
}

# 执行主流程
main "$@"
