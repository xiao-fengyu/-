# e-platform

> AI 驱动的商品图片生成 + 多平台一键上架桌面客户端

## 简介

基于用户描述的需求，AI 自动生成商品图片 → 用户确认/编辑 → 一键发布到电商平台（拼多多、淘宝、京东、1688），形成完整的自动化上架工作流。

## 产品形态

- **桌面客户端**（Electron + React + TypeScript），Windows 平台
- 本地数据存储（SQLite）
- 多电商平台支持，按需扩展
- AI 图片生成提供商可自定义（API / 本地模型均可）

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 开发模式

```bash
# 1. 克隆仓库
git clone https://github.com/xiao-fengyu/- e-platform
cd e-platform

# 2. 安装依赖
npm install

# 3. 复制配置模板（如需要）
cp config.json.example config.json

# 4. 启动开发模式
npm run dev
```

### 构建安装包

```bash
npm run build
npm run package
```

## 项目结构

```
e-platform/
├── PLAN.md              # 开发计划书
├── README.md            # 本文件
├── package.json
├── tsconfig.json
├── vite.config.ts
├── electron-builder.yml
├── .gitignore
├── electron/            # Electron 主进程
├── src/                 # React 前端
├── server/              # 本地后端服务
├── data/                # 运行时数据（不纳入 git）
└── resources/           # 应用资源
```

## 开发进度

| 阶段 | 状态 | 说明 |
|------|------|------|
| 阶段一：项目骨架 + 核心 UI 框架 | ✅ 已完成 | Electron + React + TS + SQLite + Ant Design UI |
| 阶段二：AI 图片生成引擎 | 📋 待开始 | 多提供商接入 |
| 阶段三：平台适配层 — 拼多多 | 📋 待开始 | MD5 签名 + OAuth 2.0 |
| 阶段四：完整工作流串联 | 📋 待开始 | 最小闭环 |
| 阶段五：批量模式 | 📋 待开始 | 批量导入/生成/发布 |
| 阶段六：测试 & 打包发布 | 📋 待开始 | Windows 安装包 |

### 已完成详情
- [x] 项目骨架搭建（Electron + React + TypeScript + Vite）
- [x] Express 后端服务器（health check 端点）
- [x] SQLite 数据库服务（商品表 + 图片表）
- [x] Zustand 全局状态管理（AI 提供商 + 平台凭据 CRUD）
- [x] Ant Design UI 框架 + Layout 组件（侧边栏 + 路由）
- [x] 8 个页面骨架（工作台/AI生成/图片编辑/发布/平台管理/批量/日志/设置）
- [x] 设置页面完整 UI：内置 AI 提供商模板 + 自定义提供商表单 + 平台凭据管理
- [x] electron-builder NSIS 打包配置
- [x] TypeScript 编译零错误，vite build 通过

## 配置说明

首次运行前需配置 AI 图片生成提供商和电商平台凭据，可通过应用内设置面板完成，无需手动编辑配置文件。

## 许可证

MIT
