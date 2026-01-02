# 图标文件位置说明

## 📁 图标文件存放位置

所有图标文件必须放在以下目录：

```
src-tauri/icons/
```

## 📋 需要的图标文件

| 文件名 | 格式 | 平台 | 必需 |
|--------|------|------|------|
| `icon.png` | PNG | 所有平台（基础图标） | ✅ |
| `icon.icns` | ICNS | macOS | ✅ |
| `icon.ico` | ICO | Windows | ✅ |

## 📂 完整路径示例

```
A3/
└── src-tauri/
    └── icons/
        ├── icon.png      ← 基础图标（1024x1024）
        ├── icon.icns     ← macOS 图标
        └── icon.ico      ← Windows 图标
```

## ⚠️ 重要提示

1. **文件必须命名为**：
   - `icon.png`（不是 `my-icon.png` 或其他名称）
   - `icon.icns`（不是 `app.icns` 或其他名称）
   - `icon.ico`（不是 `logo.ico` 或其他名称）

2. **路径是相对于 `src-tauri/` 目录的**：
   - 配置文件中写的是 `icons/icon.icns`
   - 实际文件路径是 `src-tauri/icons/icon.icns`

3. **如果文件不存在**：
   - Tauri 会尝试使用其他可用的图标文件
   - 但为了确保各平台正常打包，建议三个文件都准备好

## 🔍 如何检查文件位置

在项目根目录运行：

```bash
# 查看图标目录内容
ls -la src-tauri/icons/

# 检查特定文件是否存在
ls src-tauri/icons/icon.icns
ls src-tauri/icons/icon.ico
ls src-tauri/icons/icon.png
```

## 📝 配置文件参考

图标配置在 `src-tauri/tauri.conf.json` 中：

```json
{
  "bundle": {
    "icon": [
      "icons/icon.png",    ← 相对于 src-tauri/ 目录
      "icons/icon.icns",   ← 相对于 src-tauri/ 目录
      "icons/icon.ico"     ← 相对于 src-tauri/ 目录
    ]
  }
}
```

