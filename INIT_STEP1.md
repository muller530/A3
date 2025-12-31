# Phase 1 Step 1: 初始化项目骨架

## 1. 创建项目的命令（逐行执行）

```bash
# 步骤 1: 确保已安装 pnpm（如果未安装）
npm install -g pnpm

# 步骤 2: 删除旧的依赖（如果存在）
rm -rf node_modules package-lock.json pnpm-lock.yaml

# 步骤 3: 安装 Tauri v2 CLI 和依赖
pnpm add -D @tauri-apps/cli@latest

# 步骤 4: 安装前端依赖
pnpm install

# 步骤 5: 安装 Tauri v2 API
pnpm add @tauri-apps/api@latest

# 步骤 6: 开发运行（首次运行会编译 Rust，需要几分钟）
pnpm dev
```

## 2. 需要新增/修改的关键文件内容

所有关键文件已更新完成：

### ✅ package.json
- 已更新为使用 `@tauri-apps/api@^2.0.0` 和 `@tauri-apps/cli@^2.0.0`
- 使用 pnpm 作为包管理器

### ✅ src-tauri/Cargo.toml
- 已更新为 Tauri v2.0
- 添加了 `tauri-plugin-shell` 插件

### ✅ src-tauri/tauri.conf.json
- 已更新为 Tauri v2 配置格式
- 使用 `devUrl` 和 `frontendDist` 替代旧格式
- 配置了 `beforeDevCommand` 为 `pnpm dev`

### ✅ src-tauri/src/main.rs
- 已更新为 Tauri v2 API
- 添加了 shell 插件初始化

### ✅ vite.config.ts
- 配置正确，无需修改

### ✅ README.md
- 已创建完整的项目文档
- 包含启动、构建、常见问题说明

## 3. 验证方式（您应该看到什么界面）

### 运行 `pnpm dev` 后：

#### 终端输出示例：
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:1420/
➜  Network: use --host to expose

  ➜  Compiling a3 v0.1.0 (/path/to/A3/src-tauri)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in xx.xxs
     Running `target/debug/a3`
```

#### 桌面窗口：
- ✅ 打开一个桌面应用窗口
- ✅ 窗口标题：**"A3 客服知识库工具"**
- ✅ 窗口大小：1200x800 像素
- ✅ 窗口可调整大小
- ✅ 显示登录页面（白色背景，居中卡片）

#### 登录页面内容：
- ✅ 标题："A3 客服知识库工具"
- ✅ 描述："请选择您的角色登录"
- ✅ 角色选择下拉框（普通用户/管理员）
- ✅ "登录" 按钮

#### 浏览器控制台（如果打开 DevTools）：
- ✅ 无错误信息
- ✅ React 应用正常加载
- ✅ 可以看到 React 组件树

### 如果看到以上内容，说明初始化成功！✅

## 下一步

初始化成功后，您可以：
1. 测试登录功能（选择角色后点击登录）
2. 进入配置页面填写飞书凭证
3. 开始开发 Phase 1 的其他功能

## 故障排除

如果遇到问题，请检查：

1. **pnpm 未安装**：运行 `npm install -g pnpm`
2. **Rust 未安装**：Tauri CLI 会自动安装，或手动运行 `rustup update`
3. **端口被占用**：修改 `vite.config.ts` 中的端口号
4. **编译错误**：查看终端错误信息，通常是依赖问题

