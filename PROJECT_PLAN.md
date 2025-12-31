# A3 项目规划文档

## 项目目录结构

```
A3/
├── src-tauri/                 # Tauri 后端
│   ├── src/
│   │   ├── main.rs           # Tauri 入口
│   │   ├── commands.rs       # Tauri 命令（飞书 API 调用）
│   │   └── lib.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                       # React 前端
│   ├── components/
│   │   ├── ui/               # shadcn/ui 组件
│   │   ├── Login.tsx         # 登录页（假登录）
│   │   ├── Config.tsx        # 飞书凭证配置
│   │   ├── AnswerList.tsx    # 答案列表
│   │   └── AnswerDetail.tsx  # 答案详情
│   ├── lib/
│   │   ├── utils.ts          # 工具函数
│   │   └── api.ts            # Tauri 命令调用封装
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── components.json            # shadcn/ui 配置
└── README.md
```

## 依赖清单

### 前端依赖 (package.json)
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@tauri-apps/api": "^1.5.0",
    "@tauri-apps/plugin-shell": "^1.0.0",
    "react-router-dom": "^6.20.0",
    "lucide-react": "^0.294.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.1.0"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^1.5.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32"
  }
}
```

### 后端依赖 (Cargo.toml)
```toml
[dependencies]
tauri = { version = "1.5", features = ["shell-open"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
reqwest = { version = "0.11", features = ["json"] }
tokio = { version = "1", features = ["full"] }
```

## 初始化命令

```bash
# 1. 创建 Tauri 项目
npm create tauri-app@latest . --yes --template react-ts

# 2. 安装 shadcn/ui
npx shadcn-ui@latest init -y

# 3. 安装必要组件
npx shadcn-ui@latest add button input card table dialog select

# 4. 安装路由
npm install react-router-dom

# 5. 安装图标库
npm install lucide-react

# 6. 添加后端依赖（手动编辑 Cargo.toml）
```

## Phase 1 实现计划

### 1. 项目初始化
- [x] 创建 Tauri + React + TypeScript 项目结构
- [ ] 配置 Tailwind CSS
- [ ] 配置 shadcn/ui
- [ ] 配置路由（React Router）

### 2. 飞书 API 集成（Tauri 后端）
- [ ] 实现飞书凭证配置命令（app_id, app_secret）
- [ ] 实现获取 access_token 命令
- [ ] 实现获取 Bitable 数据表命令
- [ ] 实现获取 Answers 表数据命令

### 3. 前端页面开发
- [ ] 假登录页面（选择 user/admin 角色）
- [ ] 飞书凭证配置页面
- [ ] 答案列表页面（表格展示）
- [ ] 答案详情页面（模态框或独立页面）
- [ ] 搜索过滤功能（状态=启用）

### 4. 状态管理
- [ ] 用户角色状态（Context/本地存储）
- [ ] 飞书凭证状态（本地存储）
- [ ] 答案列表状态

### 5. UI 组件
- [ ] 使用 shadcn/ui 组件库
- [ ] 响应式布局
- [ ] 加载状态
- [ ] 错误处理

### 6. 测试与优化
- [ ] 端到端功能测试
- [ ] 错误处理完善
- [ ] UI 优化

