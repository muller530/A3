# 初始化步骤

## 1. 安装依赖

```bash
npm install
```

## 2. 安装 Tauri CLI（如果尚未安装）

```bash
npm install -g @tauri-apps/cli
```

或者使用 npx（推荐）：

```bash
npx @tauri-apps/cli --version
```

## 3. 开发运行

```bash
npm run tauri dev
```

首次运行会自动下载 Rust 工具链和 Tauri 依赖，可能需要一些时间。

## 4. 构建应用

```bash
npm run tauri build
```

## 注意事项

- 确保已安装 Rust 工具链（Tauri CLI 会自动安装）
- 首次运行可能需要下载大量依赖，请耐心等待
- 如果遇到网络问题，可以配置 Rust 镜像源

## Rust 镜像配置（可选）

在 `~/.cargo/config.toml` 中添加：

```toml
[source.crates-io]
replace-with = 'ustc'

[source.ustc]
registry = "https://mirrors.ustc.edu.cn/crates.io-index"
```

