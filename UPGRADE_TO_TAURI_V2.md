# Tauri v2 升级指南

## 1. 创建项目的命令（逐行执行）

```bash
# 1. 确保已安装 pnpm（如果未安装）
npm install -g pnpm

# 2. 删除旧的 node_modules 和 lock 文件（如果存在）
rm -rf node_modules package-lock.json pnpm-lock.yaml

# 3. 安装 Tauri v2 CLI
pnpm add -D @tauri-apps/cli@latest

# 4. 安装依赖
pnpm install

# 5. 更新 Tauri 前端 API
pnpm add @tauri-apps/api@latest

# 6. 开发运行
pnpm dev
```

## 2. 需要新增/修改的关键文件

### package.json
```json
{
  "name": "a3",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "tauri": "tauri"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@tauri-apps/api": "^2.0.0",
    "react-router-dom": "^6.20.0",
    "lucide-react": "^0.294.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.1.0"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.3.0",
    "tailwindcss-animate": "^1.0.7",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32"
  }
}
```

### src-tauri/Cargo.toml
```toml
[package]
name = "a3"
version = "0.1.0"
description = "A3 客服知识库工具"
authors = ["you"]
license = ""
repository = ""
edition = "2021"

[build-dependencies]
tauri-build = { version = "2.0", features = [] }

[dependencies]
tauri = { version = "2.0", features = ["devtools"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
reqwest = { version = "0.11", features = ["json"] }
tokio = { version = "1", features = ["full"] }

[features]
# This feature is used for production builds or when `devPath` points to the filesystem
# DO NOT REMOVE!!
custom-protocol = ["tauri/custom-protocol"]
```

### src-tauri/tauri.conf.json
```json
{
  "productName": "A3",
  "version": "0.1.0",
  "identifier": "com.a3.app",
  "build": {
    "beforeDevCommand": "pnpm dev",
    "beforeBuildCommand": "pnpm build",
    "devUrl": "http://localhost:1420",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "A3 客服知识库工具",
        "width": 1200,
        "height": 800,
        "resizable": true,
        "fullscreen": false
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  },
  "plugins": {}
}
```

### vite.config.ts
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: ["es2021", "chrome100", "safari13"],
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});
```

## 3. 验证方式

运行 `pnpm dev` 后，您应该看到：

1. **终端输出**：
   - Vite 开发服务器启动在 `http://localhost:1420`
   - Tauri 编译过程（首次运行会较慢）
   - 最终显示 "App ready" 或类似消息

2. **桌面窗口**：
   - 打开一个桌面应用窗口
   - 标题栏显示 "A3 客服知识库工具"
   - 窗口大小 1200x800
   - 显示登录页面（如果路由配置正确）

3. **浏览器控制台**（如果打开了 DevTools）：
   - 无错误信息
   - React 应用正常加载

## 注意事项

- Tauri v2 不再需要 `build.rs` 文件（可以删除）
- API 调用方式基本不变，但建议查看 v2 迁移文档
- 如果遇到问题，检查 Rust 工具链是否最新：`rustup update`

