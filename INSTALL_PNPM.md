# 安装 pnpm 的几种方式

## 方式 1: 使用 npx（推荐，无需全局安装）

直接使用 `npx pnpm` 运行命令，无需安装：

```bash
# 安装依赖
npx pnpm install

# 开发运行
npx pnpm dev

# 构建
npx pnpm build
```

## 方式 2: 使用 npm（已配置）

项目已配置为同时支持 npm，可以直接使用：

```bash
# 安装依赖
npm install

# 开发运行
npm run dev

# 构建
npm run build
```

## 方式 3: 全局安装 pnpm（需要权限）

如果需要全局安装 pnpm，可以使用以下方式之一：

### 使用 Homebrew（macOS）
```bash
brew install pnpm
```

### 使用 npm（需要 sudo）
```bash
sudo npm install -g pnpm
```

### 使用独立安装脚本
```bash
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

安装后需要重启终端或运行：
```bash
source ~/.zshrc
```

## 当前项目配置

项目已配置为使用 npm，`tauri.conf.json` 中的命令已更新为 `npm run dev` 和 `npm run build`。

您可以直接使用 `npm` 命令，无需安装 pnpm。

