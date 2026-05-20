# e-platform 开发计划书

> AI 驱动的商品图片生成 + 多平台一键上架桌面客户端
> 版本：v1 | 日期：2026-05-20

---

## 一、项目概述

### 背景

电商商家在上架商品前，需要花费大量时间准备商品图片。传统流程依赖人工拍摄、修图、裁切，效率低、成本高。

### 目标

基于用户描述的需求，**AI 自动生成商品图片 → 用户确认/编辑 → 一键发布到电商平台**，形成完整的自动化上架工作流。

### 产品形态

- **桌面客户端**（Electron），本地数据，Windows 平台
- 多平台支持（拼多多、淘宝、京东、1688，按需扩展）
- AI 图片生成提供商可自定义（API / 本地模型均可）

---

## 二、核心工作流

```
输入需求 → AI 生成图片 → 挑选确认 → 填写平台表单 → 选择平台 → 一键发布
```

> **说明**：商品信息（标题、价格、SKU、库存等）不再单独维护独立的商品编辑模块，而是合并到各平台的发布表单中统一填写。

---

## 三、功能模块清单

### 1️⃣ 工作台（首页）

| 功能 | 说明 | 优先级 |
|------|------|--------|
| 快捷入口 | 新建商品、继续编辑、批量任务 | P0 |
| 最近任务 | 最近编辑/发布的商品卡片列表 | P0 |
| 数据看板 | 生成/发布统计 | P2 |
| 快捷状态 | AI 提供商在线状态、平台连接状态 | P1 |

### 2️⃣ AI 图片生成（P0）

| 功能 | 说明 |
|------|------|
| 需求输入 | 文字描述商品（如"白色陶瓷马克杯，简约风格，纯白背景"） |
| Prompt 模板库 | 预置电商常用模板：服装、数码、家居、食品…选模板 + 填空 |
| 批量生成 | 一次输入需求，同时出 4-8 张候选图 |
| 提供商切换 | 下拉切换 AI 提供商，实时预览不同模型效果 |
| 生成参数 | 尺寸、风格、数量、随机种子（高级用户可调） |
| 生成队列 | 多任务排队，后台逐个生成，不阻塞界面 |

### 3️⃣ 图片确认 & 编辑（P0）

| 功能 | 说明 |
|------|------|
| 多图对比 | 生成的候选图并排展示，勾选保留/淘汰 |
| 图片合规检查 | 自动检测是否符合平台要求（尺寸、大小、格式、水印） |
| 一键处理 | 自动裁剪到目标尺寸、压缩到大小限制、格式转换 |
| 基础编辑 | 裁剪、旋转、缩放 |
| 标记用途 | 标记某张图为主图、SKU 图、详情图、白底图 |
| 重生成 | 对不满意的单张图点"重新生成"，保留 prompt 上下文 |

### 4️⃣ 电商平台对接（P0）

> 商品标题、价格、SKU、库存等字段在各平台的发布表单中统一填写，不单独维护商品编辑模块。

| 功能 | 说明 |
|------|------|
| 平台授权 | OAuth 2.0 流程引导 |
| 多平台管理 | 同时绑定多个平台账号，切换操作 |
| 图片上传 | 将本地图片上传到平台图片空间 |
| 发布表单 | 填写商品信息（标题、价格、类目、SKU、库存等），按平台字段展示 |
| 商品发布 | 一键发布到选定平台，实时反馈进度 |
| 发布结果 | 成功/失败状态，失败显示具体原因 |
| 商品同步 | 拉取平台上已发布的商品列表 |
| 草稿保存 | 随时保存发布表单，下次继续编辑 |

### 5️⃣ 批量模式（P1）

| 功能 | 说明 |
|------|------|
| Excel/CSV 导入 | 导入商品清单（品名、价格、描述），批量生成 |
| 批量生成 | 按清单逐条调用 AI 生成图片 |
| 批量确认 | 逐条预览并确认图片 |
| 批量发布 | 确认后一键批量发布到平台 |
| 批量结果报告 | 成功/失败汇总，失败条目可单独重试 |

### 6️⃣ 设置 & 配置（P0）

| 功能 | 说明 |
|------|------|
| AI 提供商管理 | 添加/编辑/删除提供商，填写 API Key、端点、模型名 |
| 内置模板 | 一键添加通义万相、DALL-E、文心一格等预设 |
| 自定义提供商 | 手动填 API 地址、请求格式、响应解析 |
| 平台凭据管理 | 各平台的 Client ID、Secret、Access Token |
| 默认参数 | 默认图片尺寸、默认提供商、默认平台 |
| 数据管理 | 本地数据备份、导出、清理 |

### 7️⃣ 日志 & 历史（P1）

| 功能 | 说明 |
|------|------|
| 生成历史 | 所有生成过的图片记录，可按时间/商品搜索 |
| 发布历史 | 发布记录，成功/失败，点击可查看详情 |
| 操作日志 | 关键操作留痕，出问题可追溯 |

---

## 四、技术架构

### 4.1 技术栈

| 层级 | 选择 | 理由 |
|------|------|------|
| 桌面框架 | Electron | 跨平台、生态成熟、支持完整 Node.js |
| 前端 UI | React + TypeScript | 组件化、类型安全 |
| 构建工具 | Vite | 快速开发热更新 |
| 本地后端 | Express (Node.js) | 处理 API 调用、签名、文件操作 |
| 数据存储 | SQLite (better-sqlite3) | 轻量、零配置、单文件 |
| 图片处理 | Sharp | 高性能图片裁剪/缩放/格式转换 |
| 打包 | electron-builder (NSIS) | Windows 安装包 |

### 4.2 架构概览

```
┌─────────────────────────────────────────────────────────┐
│              e-platform Desktop Client                   │
│  (Electron + React + TypeScript, Windows)                │
├─────────────────────────────────────────────────────────┤
│  前端 (React)                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ 工作台    │  │ 图片生成  │  │ 图片编辑  │  │ 平台发布  │ │
│  │ Dashboard│  │ Generator│  │  Editor   │  │Publish   │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │ 批量任务  │  │ 平台管理  │  │ 设置面板  │               │
│  │ Batch    │  │ Platforms│  │ Settings │               │
│  └──────────┘  └──────────┘  └──────────┘               │
├─────────────────────────────────────────────────────────┤
│  本地后端 (Express)                                      │
│  ┌─────────────────────────────────────────────────────┐│
│  │  Platform Abstraction Layer                         ││
│  │  IPlatformAdapter (统一接口)                         ││
│  │  ├── authenticate()   OAuth 授权                     ││
│  │  ├── uploadImage()    图片上传到平台空间              ││
│  │  ├── getCategories()  获取类目树                     ││
│  │  ├── publishProduct() 发布商品                       ││
│  │  └── getProductInfo() 查询商品                       ││
│  └─────────────────────────────────────────────────────┘│
│  ┌────────┐ ┌──────┐ ┌────┐ ┌─────┐                     │
│  │拼多多   ││淘宝   ││京东 ││1688 │  ... 按需扩展         │
│  │Adapter  ││Adapter││Adapter│Adapter│                   │
│  └────────┘ └──────┘ └────┘ └─────┘                     │
│  ┌─────────────────────────────────────────────────────┐│
│  │  Image Generation Engine                            ││
│  │  IImageProvider (统一接口)                           ││
│  │  ├── generate(prompt, config)                       ││
│  │  └── getModels()                                    ││
│  └─────────────────────────────────────────────────────┘│
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌────────┐                  │
│  │DALL-E││通义万相││文心一格││SD 本地  │  ... 用户自定义   │
│  └──────┘ └──────┘ └──────┘ └────────┘                  │
│  ┌─────────────────────────────────────────────────────┐│
│  │  Image Processing (Sharp)                           ││
│  │  裁剪 / 缩放 / 格式转换 / 压缩 / 合规检查              ││
│  └─────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────┐│
│  │  SQLite (better-sqlite3)                            ││
│  │  商品表 / 图片表 / 平台凭据 / 提供商配置 / 操作日志     ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### 4.3 电商平台 API 对比

| 平台 | API 网关 | 签名方式 | 数据格式 | 优先级 |
|------|---------|---------|---------|--------|
| 拼多多 | `gw-api.pinduoduo.com` | MD5 | JSON | 首发 |
| 淘宝/天猫 | `gw.api.taobao.com` | Top 签名 | XML | 第二批 |
| 京东 | `api.jd.com` | OAuth 2.0 | JSON | 第三批 |
| 1688 | `gw.api.alibaba.com` | 签名 | JSON/XML | 第三批 |

### 4.4 图片生成提供商配置模型

```typescript
interface ImageProviderConfig {
  id: string;              // 唯一标识，如 "dall-e-3", "wanx-v1"
  name: string;            // 显示名称
  type: 'api' | 'local';   // 云端 API 或本地服务
  endpoint: string;        // API 端点地址
  apiKey: string;          // 认证密钥
  model: string;           // 模型名称
  maxImages: number;       // 单次最大生成数
  defaultParams: Record<string, any>; // 默认参数
}
```

---

## 五、开发计划

### 阶段一：项目骨架 + 核心 UI 框架

| 任务 | 产出 |
|------|------|
| Electron + React + TypeScript 项目初始化 | 可运行的桌面应用窗口 |
| Vite 构建配置（开发 + 生产） | 热更新 + 打包能力 |
| 本地 SQLite 数据库设计 & 实现 | 数据表就绪 |
| UI 框架：侧边栏 + 路由 + 全局状态管理 | 导航框架 |
| 设置页面骨架（提供商配置、平台凭据） | 配置界面基础 |
| Windows 打包配置（electron-builder NSIS） | 可生成安装包 |

### 阶段二：AI 图片生成引擎

| 任务 | 产出 |
|------|------|
| IImageProvider 统一接口设计 | 标准接口定义 |
| 内置 2-3 个提供商（DALL-E 3 + 通义万相 + 自定义） | 多模型支持 |
| Prompt 模板系统（电商场景模板库） | 模板选择界面 |
| 图片预览/对比/选择界面 | 多图浏览 + 勾选 |
| 图片合规检查（尺寸、大小、格式自动校验） | 自动验证 |
| 图片基础编辑（裁剪、缩放、格式转换） | Sharp 处理 |
| 生成历史记录 | 历史查询 |

### 阶段三：平台适配层 — 拼多多

| 任务 | 产出 |
|------|------|
| IPlatformAdapter 统一接口设计 | 标准接口定义 |
| 拼多多适配器（MD5 签名 + OAuth 2.0） | PDD API 封装 |
| 类目查询 | 类目选择功能 |
| 图片上传（pdd.goods.filespace.image.upload） | 图片空间上传 |
| 商品发布（pdd.goods.add） | 完整发布流程 |
| 上架状态反馈 & 错误处理 | 发布结果展示 |

### 阶段四：完整工作流串联

| 任务 | 产出 |
|------|------|
| 全流程串联：需求 → 生成 → 确认 → 填写 → 发布 | 最小闭环跑通 |
| 草稿保存 & 加载 | 编辑不丢失 |
| 操作日志 | 关键操作记录 |
| 异常处理（API 失败重试、图片上传失败回退） | 容错能力 |
| 数据备份 & 导出 | 数据安全 |

### 阶段五：批量模式

| 任务 | 产出 |
|------|------|
| Excel/CSV 导入功能 | 商品清单导入 |
| 批量生成 & 队列管理 | 并发处理 |
| 批量确认界面 | 逐条审核 |
| 批量发布 & 结果报告 | 批量操作 |

### 阶段六：测试 & 打包发布

| 任务 | 产出 |
|------|------|
| 端到端测试（拼多多全流程） | 功能验证 |
| Windows NSIS 安装包 | 分发版本 |
| 各提供商连通性测试 | 兼容性验证 |
| 使用说明书 | 用户文档 |

---

## 六、数据库设计（初版）

```sql
-- 商品表
CREATE TABLE products (
  id          TEXT PRIMARY KEY,
  title       TEXT,
  category_id TEXT,
  price       DECIMAL(10,2),
  stock       INTEGER,
  description TEXT,
  status      TEXT DEFAULT 'draft',  -- draft / ready / published / failed
  platform    TEXT,                  -- pdd / taobao / jd / 1688
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- SKU 表
CREATE TABLE skus (
  id          TEXT PRIMARY KEY,
  product_id  TEXT REFERENCES products(id),
  spec_name   TEXT,    -- 规格名称，如 "颜色"
  spec_value  TEXT,    -- 规格值，如 "红色"
  price       DECIMAL(10,2),
  stock       INTEGER,
  image_id    TEXT
);

-- 图片表
CREATE TABLE images (
  id          TEXT PRIMARY KEY,
  product_id  TEXT REFERENCES products(id),
  local_path  TEXT,           -- 本地文件路径
  url         TEXT,           -- 平台图片空间 URL（上传后）
  type        TEXT,           -- main / sku / detail / white_bg
  provider    TEXT,           -- AI 提供商 ID
  prompt      TEXT,           -- 生成时的 prompt
  status      TEXT DEFAULT 'generated',  -- generated / confirmed / uploaded / rejected
  width       INTEGER,
  height      INTEGER,
  file_size   INTEGER,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- AI 提供商配置
CREATE TABLE image_providers (
  id            TEXT PRIMARY KEY,
  name          TEXT,
  type          TEXT,        -- api / local
  endpoint      TEXT,
  api_key       TEXT,
  model         TEXT,
  max_images    INTEGER,
  default_params TEXT,       -- JSON
  is_default    INTEGER DEFAULT 0,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 平台授权凭据
CREATE TABLE platform_credentials (
  id            TEXT PRIMARY KEY,
  platform      TEXT,        -- pdd / taobao / jd / 1688
  client_id     TEXT,
  client_secret TEXT,
  access_token  TEXT,
  refresh_token TEXT,
  expires_at    DATETIME,
  shop_name     TEXT,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 操作日志
CREATE TABLE operation_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  action      TEXT,          -- generate / confirm / upload / publish
  product_id  TEXT,
  platform    TEXT,
  status      TEXT,          -- success / failed
  message     TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 七、项目目录结构

```
e-platform/
├── PLAN.md                     # 本计划书
├── package.json
├── tsconfig.json
├── vite.config.ts
├── electron-builder.yml
│
├── electron/                   # Electron 主进程
│   ├── main.ts                 # 应用入口
│   ├── preload.ts              # 安全桥接
│   └── ipc-handlers.ts         # IPC 通信处理
│
├── src/                        # React 前端
│   ├── main.tsx                # 前端入口
│   ├── App.tsx                 # 根组件
│   ├── router.tsx              # 路由配置
│   ├── store/                  # 状态管理
│   │   ├── productStore.ts
│   │   ├── imageStore.ts
│   │   └── settingsStore.ts
│   ├── components/
│   │   ├── Layout/             # 侧边栏 + 主布局
│   │   ├── Dashboard/          # 工作台
│   │   ├── ImageGenerator/     # 图片生成
│   │   ├── ImageEditor/        # 图片确认 & 编辑
│   │   ├── PublishForm/        # 平台发布表单（含商品字段）
│   │   ├── PlatformManager/    # 平台授权管理
│   │   ├── BatchImport/        # 批量导入
│   │   └── Settings/           # 设置面板
│   └── services/
│       ├── api.ts              # 后端 API 调用封装
│       └── types.ts            # TypeScript 类型定义
│
├── server/                     # 本地后端服务
│   ├── index.ts                # Express 入口
│   ├── routes/
│   │   ├── images.ts           # 图片生成 & 处理路由
│   │   ├── products.ts         # 商品管理路由
│   │   ├── platforms/          # 平台适配路由
│   │   │   ├── pdd.ts
│   │   │   ├── taobao.ts
│   │   │   └── ...
│   │   └── settings.ts         # 设置 & 配置路由
│   ├── services/
│   │   ├── image-gen/          # 图片生成引擎
│   │   │   ├── provider.ts     # IImageProvider 接口
│   │   │   ├── dalle.ts        # DALL-E 实现
│   │   │   ├── wanx.ts         # 通义万相实现
│   │   │   └── custom.ts       # 自定义提供商
│   │   ├── platforms/          # 平台适配器
│   │   │   ├── adapter.ts      # IPlatformAdapter 接口
│   │   │   ├── pdd-adapter.ts  # 拼多多适配器
│   │   │   └── ...
│   │   ├── image-processor.ts  # Sharp 图片处理
│   │   └── database.ts         # SQLite 操作
│   └── utils/
│       ├── crypto.ts           # 签名 & 加密工具
│       └── validator.ts        # 数据校验
│
├── data/                       # 运行时数据（gitignore）
│   ├── images/                 # 生成的图片
│   └── e-platform.db           # SQLite 数据库
│
└── resources/                  # 应用资源
    ├── icon.png                # 应用图标
    └── templates/              # Prompt 模板文件
```

---

## 八、验收标准

### 最小闭环（阶段三完成后）

- [ ] 用户能输入商品描述，选择 AI 提供商，生成图片
- [ ] 用户能预览生成的图片，选择保留/淘汰
- [ ] 图片能自动校验并处理到符合拼多多要求（480x480, <3MB, PNG/JPG）
- [ ] 用户能在发布表单中填写商品基本信息（标题、价格、类目、库存）
- [ ] 用户能选择已绑定的拼多多账号，一键发布商品
- [ ] 发布结果实时反馈（成功/失败及原因）

### 完整版（阶段六完成后）

- [ ] 上述最小闭环全部通过
- [ ] 支持切换多个 AI 提供商（至少 2 个内置 + 自定义）
- [ ] 支持批量导入、批量生成、批量发布
- [ ] 操作有日志记录，失败可追溯
- [ ] Windows 安装包可正常安装运行
- [ ] 数据可备份导出

---

## 九、风险 & 应对

| 风险 | 影响 | 应对策略 |
|------|------|----------|
| 各平台 API 权限限制 | 部分接口个人开发者无法调用 | v1 先支持"半自动"模式：生成图片+商品信息 → 导出为可导入格式 → 手动粘贴到商家后台 |
| AI 图片质量不稳定 | 用户不满意 | 多张候选图供选择；Prompt 模板优化；支持重生成 |
| 云端 API 成本 | 批量生成费用高 | 支持多提供商切换；本地缓存已生成图片；用户自建模型 |
| 平台图片审核不通过 | 商品无法上架 | 内置图片合规检查（尺寸、大小、格式、水印检测） |
| 淘宝 XML 格式复杂 | 开发周期延长 | 放在第二批对接，先跑通 JSON 格式的平台 |

---

## 十、下一步

1. ✅ 本计划书确认
2. ⏳ 阶段一：搭建项目骨架（Electron + React + TS + SQLite）
3. 按计划逐阶段推进
