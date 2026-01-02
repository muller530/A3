# 如何更改软件图标

## 快速开始

### 方法一：混合方法（推荐，最简单）

1. **准备新图标**
   - 准备一个 **1024x1024 像素** 的 PNG 图片
   - 建议使用透明背景，图标内容居中

2. **生成 macOS 图标**
   ```bash
   cd src-tauri/icons
   ./generate-icons.sh your-new-icon.png
   ```
   脚本会自动生成 `icon.png` 和 `icon.icns`

3. **生成 Windows 图标（使用在线工具）**
   - 访问 https://convertio.co/png-ico/
   - 上传 `src-tauri/icons/icon.png`
   - 下载生成的 `icon.ico`
   - 保存到 `src-tauri/icons/` 目录

4. **验证**
   ```bash
   npm run tauri build
   ```

### 方法二：手动替换

#### 步骤 1: 替换基础图标
将你的新图标（1024x1024 PNG）复制到 `src-tauri/icons/icon.png`

#### 步骤 2: 生成 macOS 图标 (.icns)
```bash
cd src-tauri/icons
bash generate-icons.sh icon.png
```

#### 步骤 3: 生成 Windows 图标 (.ico)
**推荐：使用在线工具（最简单）**
1. 访问 https://convertio.co/png-ico/
2. 上传 `icon.png`
3. 下载生成的 `icon.ico`
4. 保存到 `src-tauri/icons/` 目录

**备选：使用 ImageMagick（如果已安装）**
```bash
magick convert icon.png -define icon:auto-resize=256,128,96,64,48,32,16 icon.ico
```

## 图标文件说明

| 文件 | 平台 | 必需 | 说明 |
|------|------|------|------|
| `icon.png` | 所有平台 | ✅ | 1024x1024 基础图标 |
| `icon.icns` | macOS | ✅ | macOS 应用程序图标 |
| `icon.ico` | Windows | ✅ | Windows 应用程序图标 |

## 配置文件

图标配置在 `src-tauri/tauri.conf.json`：

```json
{
  "bundle": {
    "icon": [
      "icons/icon.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

Tauri 会根据目标平台自动选择相应的图标文件。

## 注意事项

1. ✅ **文件命名**：必须使用 `icon.png`、`icon.icns`、`icon.ico` 这些文件名
2. ✅ **文件位置**：所有图标文件必须在 `src-tauri/icons/` 目录
3. ✅ **图标尺寸**：源图标建议 1024x1024 像素
4. ✅ **图标设计**：使用简洁设计，确保在小尺寸下清晰可见

## 验证

替换图标后，运行构建命令验证：

```bash
npm run tauri build
```

如果打包成功，说明图标配置正确。

## 详细文档

更多详细信息请查看：`src-tauri/icons/ICON_GUIDE.md`

