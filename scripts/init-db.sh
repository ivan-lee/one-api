#!/bin/bash
# One-API 数据库初始化脚本
# 用途：创建数据库、用户并设置权限

set -e

# ==================== 配置区域 ====================
# MySQL 连接信息
MYSQL_CONTAINER="mysql"
MYSQL_ROOT_PASSWORD="Root123456"  # 根据实际情况修改

# 数据库配置
DB_NAME="one-api"
DB_USER="oneapi"
DB_PASSWORD="OneAPI@2026"  # 建议修改为强密码

# ==================== 颜色输出 ====================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# ==================== 主流程 ====================
main() {
    log_info "开始初始化 One-API 数据库..."
    echo ""
    
    # 检查 MySQL 容器是否运行
    if ! docker ps | grep -q "$MYSQL_CONTAINER"; then
        log_error "MySQL 容器未运行，请先启动容器"
        exit 1
    fi
    
    log_info "MySQL 容器状态正常"
    
    # 创建数据库（如果不存在）
    log_info "创建数据库：$DB_NAME"
    docker exec -i $MYSQL_CONTAINER mysql -u root -p"$MYSQL_ROOT_PASSWORD" <<-EOSQL
        CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` 
        DEFAULT CHARACTER SET utf8mb4 
        DEFAULT COLLATE utf8mb4_unicode_ci;
EOSQL
    log_info "数据库创建成功"
    
    # 创建用户（如果不存在）并授权
    log_info "创建数据库用户：$DB_USER"
    docker exec -i $MYSQL_CONTAINER mysql -u root -p"$MYSQL_ROOT_PASSWORD" <<-EOSQL
        CREATE USER IF NOT EXISTS '${DB_USER}'@'%' IDENTIFIED BY '${DB_PASSWORD}';
        GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'%';
        FLUSH PRIVILEGES;
EOSQL
    log_info "用户创建并授权成功"
    
    # 验证连接
    log_info "验证数据库连接..."
    if docker exec -i $MYSQL_CONTAINER mysql -u "$DB_USER" -p"$DB_PASSWORD" -D "$DB_NAME" -e "SELECT 1;" > /dev/null 2>&1; then
        log_info "✓ 数据库连接验证成功"
    else
        log_error "✗ 数据库连接验证失败"
        exit 1
    fi
    
    echo ""
    log_info "=========================================="
    log_info "数据库初始化完成！"
    log_info "=========================================="
    echo ""
    log_info "连接信息："
    echo "  数据库名称：$DB_NAME"
    echo "  用户名：$DB_USER"
    echo "  密码：$DB_PASSWORD"
    echo "  连接字符串：$DB_USER:$DB_PASSWORD@tcp(mysql:3306)/$DB_NAME"
    echo ""
    log_info "下一步："
    echo "  1. 复制 .env.production 文件为 .env"
    echo "  2. 修改 SESSION_SECRET 为随机字符串"
    echo "  3. 启动 one-api 服务"
    echo ""
}

# 执行主流程
main
