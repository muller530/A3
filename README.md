# A3 客服知识库工具

基于 Tauri v2 + React + TypeScript 开发的桌面端客服知识库工具。

## 技术栈

- **桌面框架**: Tauri v2
- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **UI 组件库**: shadcn/ui + Tailwind CSS
- **包管理器**: npm / pnpm（两种方式都支持）
- **数据源**: 飞书多维表格 (Bitable)

## 前置要求

- **Node.js**: 18+ 
- **npm**: 10+ (已内置) 或 **pnpm**: 8+ (可选，可使用 `npx pnpm` 无需安装)
- **Rust**: 1.70+ (Tauri CLI 会自动安装，或手动安装：`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)

## 快速开始

### 1. 安装依赖

**使用 npm（推荐）：**
```bash
npm install
```

**或使用 pnpm（使用 npx，无需全局安装）：**
```bash
npx pnpm install
```

### 2. 开发运行

**使用 npm：**
```bash
npm run dev
```

**或使用 pnpm：**
```bash
npx pnpm dev
```

首次运行会自动：
- 启动 Vite 开发服务器（`http://localhost:1420`）
- 编译 Tauri 后端（可能需要几分钟）
- 打开桌面应用窗口

### 3. 构建应用

**使用 npm：**
```bash
npm run tauri build
```

**或使用 pnpm：**
```bash
npx pnpm tauri build
```

构建产物位于 `src-tauri/target/release/` 目录。

## 项目结构

```
A3/
├── src/                    # React 前端
│   ├── components/        # 组件
│   │   ├── ui/           # shadcn/ui 组件
│   │   ├── Login.tsx     # 登录页
│   │   ├── Config.tsx    # 配置页
│   │   └── AnswerList.tsx # 答案列表页
│   ├── contexts/         # Context 状态管理
│   ├── lib/              # 工具函数和 API
│   ├── App.tsx           # 主应用组件
│   └── main.tsx          # 入口文件
├── src-tauri/            # Tauri 后端 (Rust)
│   ├── src/
│   │   ├── main.rs       # Tauri 入口
│   │   └── commands.rs   # 飞书 API 命令
│   ├── Cargo.toml        # Rust 依赖
│   └── tauri.conf.json    # Tauri 配置
├── public/               # 静态资源
├── package.json          # 前端依赖
└── vite.config.ts       # Vite 配置
```

## 功能特性

### Phase 1 (当前版本)

- ✅ 假登录系统（本地选择 user/admin 角色）
- ✅ 飞书凭证配置（App ID, App Secret, Bitable 链接）
- ✅ 从飞书 Bitable 拉取 Answers 表数据
- ✅ 答案列表展示
- ✅ 搜索过滤功能
- ✅ 状态过滤（仅显示"启用"状态的答案）
- ✅ 答案详情查看

## 使用说明

1. **登录**: 启动应用后，选择用户角色（user/admin）进行假登录
2. **配置凭证**: 
   - 填写飞书应用的 App ID 和 App Secret
   - 粘贴 Bitable 表格链接（系统会自动提取 Token）
3. **查看答案**: 配置完成后，自动跳转到答案列表页面
4. **搜索过滤**: 在搜索框输入关键词，系统会自动过滤状态为"启用"的答案
5. **查看详情**: 点击"查看详情"按钮查看完整的答案信息

## 开发命令

**使用 npm：**
```bash
# 开发模式（前端 + Tauri）
npm run dev

# 构建前端
npm run build

# 预览构建结果
npm run preview

# Tauri 相关命令
npm run tauri dev      # 开发模式
npm run tauri build    # 构建应用
npm run tauri info     # 显示环境信息
```

**使用 pnpm（通过 npx）：**
```bash
# 开发模式（前端 + Tauri）
npx pnpm dev

# 构建前端
npx pnpm build

# Tauri 相关命令
npx pnpm tauri dev      # 开发模式
npx pnpm tauri build    # 构建应用
```

## 常见问题

### 1. 首次运行很慢？

首次运行需要下载 Rust 工具链和编译依赖，可能需要 5-10 分钟，这是正常的。后续运行会快很多。

### 2. 端口 1420 被占用？

修改 `vite.config.ts` 中的 `server.port` 配置，或关闭占用该端口的程序。

### 3. Rust 编译错误？

确保 Rust 工具链是最新的：
```bash
rustup update
```

### 4. pnpm 命令不存在？

项目已配置为使用 npm，无需安装 pnpm。如果仍想使用 pnpm：

**方式 1（推荐）：** 使用 npx，无需安装
```bash
npx pnpm install
npx pnpm dev
```

**方式 2：** 全局安装（需要权限）
```bash
# macOS
brew install pnpm

# 或使用 npm（需要 sudo）
sudo npm install -g pnpm
```

详见 `INSTALL_PNPM.md` 文件。

### 5. Tauri 窗口无法打开？

- 检查终端是否有错误信息
- 确保 Vite 开发服务器正常运行（访问 `http://localhost:1420`）
- 查看 `src-tauri/target/debug/` 目录下的日志

### 6. 飞书 API 调用失败？

- 检查 App ID 和 App Secret 是否正确
- 确认应用有访问 Bitable 的权限
- 检查网络连接

## 环境变量

可以在 `.env` 文件中配置环境变量（如果需要）：

```env
VITE_API_BASE_URL=https://api.example.com
```

## 构建配置

### 开发环境

- 前端：Vite 开发服务器（HMR 热更新）
- 后端：Rust 调试模式
- 窗口：可调整大小，显示 DevTools

### 生产环境

- 前端：Vite 构建优化
- 后端：Rust 发布模式（优化）
- 窗口：根据 `tauri.conf.json` 配置

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## License

MIT

## 相关链接

- [Tauri 文档](https://tauri.app/)
- [React 文档](https://react.dev/)
- [shadcn/ui 文档](https://ui.shadcn.com/)
- [Tailwind CSS 文档](https://tailwindcss.com/)
