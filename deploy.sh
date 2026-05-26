#!/bin/bash
# ============================================================
# e-platform 一键部署脚本
# 目标机器: 10.1.254.41 (或任意 Debian 服务器)
# 用法: bash deploy.sh [--install]
#   --install  : 首次部署（含 Node.js 安装 + 克隆 + 构建）
#   无参数     : 更新部署（git pull + 重建 + 重启）
# ============================================================

set -e

INSTALL_DIR="/opt/e-platform"
SERVICE_NAME="e-platform"
PORT=3001

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✘]${NC} $1"; exit 1; }

# ---------- 检查 root ----------
if [ "$(id -u)" -ne 0 ]; then
  err "请使用 root 或 sudo 运行此脚本"
fi

# ---------- 首次部署模式 ----------
if [ "$1" = "--install" ]; then
  echo -e "${GREEN}========== e-platform 首次部署 ==========${NC}"

  # 1. 检查/安装 Node.js
  if command -v node &>/dev/null; then
    NODE_VER=$(node -v | cut -d. -f1 | tr -d 'v')
    if [ "$NODE_VER" -lt 20 ]; then
      err "Node.js 版本过低 ($node -v)，需要 v20+"
    fi
    log "Node.js 已安装: $(node -v)"
  else
    warn "Node.js 未安装，正在安装 v22..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
    log "Node.js 已安装: $(node -v)"
  fi

  # 2. 检查 git
  if ! command -v git &>/dev/null; then
    warn "git 未安装，正在安装..."
    apt-get install -y git
  fi

  # 3. 克隆项目
  if [ -d "$INSTALL_DIR/.git" ]; then
    log "项目已存在，跳过克隆"
  else
    warn "正在克隆项目到 $INSTALL_DIR ..."
    mkdir -p "$(dirname $INSTALL_DIR)"
    git clone git@github.com:xiao-fengyu/-.git "$INSTALL_DIR" || \
    git clone https://github.com/xiao-fengyu/-.git "$INSTALL_DIR"
    log "克隆完成"
  fi

  cd "$INSTALL_DIR"

  # 4. 安装依赖（全量，因为需要 vite 构建）
  log "安装 npm 依赖..."
  npm install

  # 5. 构建前端
  log "构建前端 (vite build)..."
  npx vite build
  log "前端构建完成"

  # 6. 配置文件
  if [ ! -f "$INSTALL_DIR/config.json" ]; then
    if [ -f "$INSTALL_DIR/config.json.example" ]; then
      cp "$INSTALL_DIR/config.json.example" "$INSTALL_DIR/config.json"
      warn "已创建 config.json，请编辑填入实际配置"
    fi
  else
    log "config.json 已存在"
  fi

  # 7. 创建数据目录
  mkdir -p "$INSTALL_DIR/data/images" "$INSTALL_DIR/data/uploads"
  log "数据目录已创建"

  # 8. 安装 systemd 服务
  cat > /etc/systemd/system/${SERVICE_NAME}.service << 'SVCEOF'
[Unit]
Description=e-platform Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/e-platform
Environment=NODE_ENV=production
ExecStart=/usr/bin/npx tsx server/index.ts
Restart=on-failure
RestartSec=5
# 日志输出到 journal
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SVCEOF

  systemctl daemon-reload
  systemctl enable ${SERVICE_NAME}
  log "systemd 服务已创建并启用"

  # 9. 防火墙（仅提醒，不自动修改）
  if iptables -L INPUT -n | grep -q "dpt:${PORT}" 2>/dev/null; then
    log "端口 ${PORT} 已在防火墙中开放"
  else
    warn "端口 ${PORT} 未在防火墙规则中，如需外部访问请执行:"
    warn "  iptables -A INPUT -p tcp --dport ${PORT} -j ACCEPT"
    warn "  iptables-save > /etc/iptables.rules"
  fi

  # 10. 启动服务
  log "启动 ${SERVICE_NAME} 服务..."
  systemctl restart ${SERVICE_NAME}
  sleep 2

  # 11. 验证
  if systemctl is-active --quiet ${SERVICE_NAME}; then
    log "服务运行正常"
    log "访问地址: http://localhost:${PORT}"
    curl -sf http://localhost:${PORT}/api/health && echo "" || warn "健康检查未通过，请查看日志: journalctl -u ${SERVICE_NAME} -f"
  else
    err "服务启动失败，请查看日志: journalctl -u ${SERVICE_NAME} -f"
  fi

  echo -e "${GREEN}========== 部署完成 ==========${NC}"
  echo ""
  echo "常用命令:"
  echo "  查看状态: systemctl status ${SERVICE_NAME}"
  echo "  查看日志: journalctl -u ${SERVICE_NAME} -f"
  echo "  重启服务: systemctl restart ${SERVICE_NAME}"
  echo "  停止服务: systemctl stop ${SERVICE_NAME}"
  echo ""
  exit 0
fi

# ---------- 更新部署模式 ----------
echo -e "${GREEN}========== e-platform 更新部署 ==========${NC}"

if [ ! -d "$INSTALL_DIR/.git" ]; then
  err "项目目录不存在，请先运行: bash deploy.sh --install"
fi

cd "$INSTALL_DIR"

# 1. 拉取最新代码
log "拉取最新代码..."
git pull

# 2. 检查依赖是否需要更新
if git diff HEAD@{1}..HEAD -- package.json package-lock.json | grep -q .; then
  log "依赖有变更，重新安装..."
  npm install
else
  log "依赖无变更，跳过"
fi

# 3. 重新构建前端
log "重新构建前端..."
npx vite build

# 4. 重启服务
log "重启服务..."
systemctl restart ${SERVICE_NAME}
sleep 2

# 5. 验证
if systemctl is-active --quiet ${SERVICE_NAME}; then
  log "服务运行正常"
  curl -sf http://localhost:${PORT}/api/health && echo "" || warn "健康检查未通过"
else
  err "服务启动失败: journalctl -u ${SERVICE_NAME} -f"
fi

echo -e "${GREEN}========== 更新完成 ==========${NC}"
