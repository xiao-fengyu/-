# e-platform 部署指南

## 快速部署

### 首次部署

将 `deploy.sh` 复制到目标服务器（10.1.254.41），然后：

```bash
chmod +x deploy.sh
sudo bash deploy.sh --install
```

脚本会自动完成：
1. 检测/安装 Node.js v22
2. 克隆项目到 `/opt/e-platform`
3. 安装 npm 依赖
4. 构建前端（vite build）
5. 创建 config.json
6. 安装并启用 systemd 服务
7. 启动服务并验证

### 更新部署

```bash
sudo bash deploy.sh
```

等同于 `git pull → npm install（如有变更）→ vite build → systemctl restart`

---

## 手动部署（逐步）

### 1. 安装 Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
node -v  # 确认 v22+
```

### 2. 克隆项目

```bash
cd /opt
git clone git@github.com:xiao-fengyu/-.git e-platform
cd e-platform
```

### 3. 安装依赖并构建

```bash
npm install          # 全量安装（含 vite 等 devDep）
npx vite build       # 构建前端到 dist/
```

### 4. 配置文件

```bash
cp config.json.example config.json
nano config.json     # 填入实际 API key 等
```

### 5. 创建 systemd 服务

```bash
cat > /etc/systemd/system/e-platform.service << 'EOF'
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

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable e-platform
systemctl start e-platform
```

### 6. 防火墙

```bash
# 如需从外部访问，开放 3001 端口
iptables -A INPUT -p tcp --dport 3001 -j ACCEPT
iptables-save > /etc/iptables.rules
```

### 7. 验证

```bash
curl http://localhost:3001/api/health
# 预期: {"status":"ok","timestamp":"..."}
```

---

## 常用运维命令

```bash
# 查看状态
systemctl status e-platform

# 查看实时日志
journalctl -u e-platform -f

# 查看应用日志（如果有文件日志）
tail -f /opt/e-platform/data/*.log

# 重启/停止
systemctl restart e-platform
systemctl stop e-platform

# 更新
cd /opt/e-platform && git pull && npm install && npx vite build && systemctl restart e-platform
```

---

## 项目架构

```
e-platform/
├── src/              # React 前端源码
├── server/           # Express 后端源码（TypeScript）
│   ├── index.ts      # 入口
│   ├── routes/       # API 路由
│   ├── services/     # 业务逻辑
│   └── config.ts     # 配置管理
├── dist/             # vite 构建产物（生产环境静态文件）
├── data/             # 运行数据（SQLite 数据库 + 图片）
├── electron/         # Electron 桌面端（服务器不需要）
└── config.json       # 运行时配置
```

**运行模式**: 生产环境下，Express 同时提供 API 和前端静态文件，一体化服务。

---

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | React 19 + Vite 6 + Ant Design |
| 后端 | Express + better-sqlite3 + sharp |
| 桌面端 | Electron 33（仅客户端，服务器不需要） |
| 数据库 | SQLite（嵌入式，无需额外服务） |
