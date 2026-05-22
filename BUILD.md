# e-platform 构建与打包指南

## 环境要求

| 依赖 | 最低版本 | 说明 |
|------|---------|------|
| Node.js | >= 18 | 推荐使用 LTS 版本（v20+） |
| npm | >= 9 | 随 Node.js 一起安装 |
| Git | >= 2.0 | 用于克隆仓库 |
| Windows | 10/11 | 目标运行平台（x64） |

> **注意**：`sharp` 图片处理库包含原生 C++ 模块，`npm install` 时会自动下载预编译的二进制文件。如果预编译文件不可用，需要安装 C++ 构建工具（Visual Studio Build Tools）。

---

## 开发模式

```bash
# 1. 克隆仓库
git clone https://github.com/xiao-fengyu/- e-platform
cd e-platform

# 2. 安装依赖
npm install

# 3. 复制配置模板
cp config.json.example config.json
# 编辑 config.json，填入你的 API Key 和平台凭据

# 4. 启动开发模式
npm run dev           # 仅启动前端 UI（浏览器）
npm run electron:dev  # 启动 Electron 桌面应用
```

---

## 构建与打包

### 前端构建（仅 UI）

```bash
# TypeScript 类型检查 + Vite 构建
npm run build
```

产出：`dist/` 目录（静态文件，不包含 Electron 主进程）。

### Electron 打包

#### Linux AppImage（当前服务器已验证通过 ✅）

```bash
# 构建前端 + electron-builder 打包 AppImage
cd e-platform
ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/" npx electron-builder --linux appimage
```

产出：`release/e-platform-1.0.0.AppImage`（~143MB）

AppImage 是自包含的可执行文件，无需安装，双击即可运行。适用于所有主流 Linux 发行版。

#### Windows NSIS 安装包

```bash
# 构建前端 + electron-builder 打包 NSIS 安装包
npm run electron:build
# 或
npx electron-builder --win nsis
```

产出：`release/` 目录下生成 `.exe` 安装包。

#### 打包参数说明

打包配置在 `electron-builder.yml`：

| 参数 | 值 | 说明 |
|------|-----|------|
| appId | com.eplatform.app | 应用唯一标识 |
| productName | e-platform | 显示名称 |
| win.target | nsis | Windows 安装程序类型 |
| nsis.oneClick | false | 允许用户选择安装路径 |
| nsis.perMachine | true | 安装到 Program Files（需管理员权限） |

#### 打包包含的文件

```
dist/**/*              # 前端构建产物
dist-electron/**/*     # Electron 主进程编译产物
server/**/*            # 本地后端服务
node_modules/**/*      # 运行时依赖（electron-builder 会自动裁剪 devDependencies）
```

### 网络环境

**服务器外网 HTTP/HTTPS 完全阻断**，SSH 通道可用。

| 场景 | 状态 | 说明 |
|------|------|------|
| Electron 二进制下载 | ✅ 可缓存 | 通过 `ELECTRON_MIRROR` 指向国内镜像源 |
| AppImage 构建 | ✅ 成功 | 工具已缓存 `~/.cache/electron-builder/appimage/` |
| deb 构建 | ❌ 失败 | fpm 工具需要从 GitHub 下载，HTTP 阻断 |
| Windows NSIS | ❌ 失败 | 需要 wine + GitHub 下载 NSIS 工具 |

**Windows 安装包构建建议**：在本地 Windows 开发机上执行 `npm run electron:package:win`，网络畅通可一键构建。

---

## 配置文件

| 文件 | 说明 | 是否跟踪 |
|------|------|---------|
| `config.json.example` | 配置模板（含占位值） | ✅ Git 跟踪 |
| `config.json` | 实际配置（含 API Key） | ❌ Git 忽略 |

首次运行前必须执行：
```bash
cp config.json.example config.json
```

然后编辑 `config.json` 填入真实的 API Key 和平台凭据。

---

## 跨平台注意事项

### sharp 原生模块

`sharp` 包含平台特定的 `.node` 二进制文件。`npm install` 时会根据当前 OS + CPU 架构下载对应的预编译包。

**问题场景**：在 Linux 上开发，打包 Windows 安装包时，`sharp` 的 Linux 二进制会被打包进去，Windows 上运行会报错。

**解决方法**：
1. **推荐**：在 Windows 机器上执行 `npm run electron:build`
2. **备选**：使用 `electron-builder` 的 `--win` 参数配合 `npm install --target_arch=x64 --target_platform=win32` 强制安装 Windows 版依赖

### Electron 打包

Electron 本身是跨平台的，但 NSIS 安装包只能在 Windows 上构建。macOS/Linux 上打包需要指定对应目标：

```bash
# macOS
npm run electron:build -- --mac

# Linux
npm run electron:build -- --linux
```

---

## 故障排查

| 问题 | 原因 | 解决 |
|------|------|------|
| `npm install` 卡在 electron 安装 | GitHub CDN 下载超时（`socket hang up`） | 使用国内镜像：`ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm install` |
| AppImage 构建失败 | 工具未缓存 | 首次构建需要下载 appimage-12.0.1 工具；HTTP 阻断时无法下载 |
| electron-builder 下载工具 EOF | 外网 HTTP 阻断 | AppImage 工具已缓存可用；deb/NSIS 需在有网络的机器上构建 |
| `npm install` 报错 `sharp` | 缺少 C++ 构建工具 | 安装 Visual Studio Build Tools（Windows）或 `build-essential`（Linux） |
| 启动后白屏 | 前端构建失败 | 运行 `npm run build` 检查是否有 TS 错误 |
| 生成图片失败 | API Key 未配置 | 检查 `config.json` 中的 `apiKey` 字段 |
| 打包后应用闪退 | `sharp` 平台不匹配 | 确保在目标平台上执行 `npm install` 后再打包 |
| SQLite 报错 `DYNAMIC_LINKING` | better-sqlite3 编译问题 | 删除 `node_modules` 和 `package-lock.json`，重新 `npm install` |

---

## 依赖一致性

本项目使用 `package-lock.json` 锁定依赖版本。任何人在任何机器上执行 `npm install` 都会安装完全相同版本的依赖包。

**不要删除 `package-lock.json`**，也不要将它加入 `.gitignore`。
