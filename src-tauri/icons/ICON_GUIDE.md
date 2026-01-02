# 图标替换指南

本指南说明如何替换应用程序图标，同时确保各平台打包正常工作。

## 图标文件要求

### 1. 基础图标文件
- **icon.png**: 1024x1024 像素的 PNG 图片（推荐尺寸）
  - 这是源文件，用于生成其他格式
  - 建议使用透明背景
  - 图标内容应居中，四周留出 10-20% 的边距

### 2. 平台特定图标文件

#### macOS (.icns)
- **icon.icns**: macOS 应用程序图标
- 包含多个尺寸：16x16, 32x32, 128x128, 256x256, 512x512 及其 @2x 版本

#### Windows (.ico)
- **icon.ico**: Windows 应用程序图标
- 包含多个尺寸：16x16, 32x32, 48x48, 256x256

#### Linux (.png)
- 使用 **icon.png** 作为基础图标

## 替换步骤

### 方法一：使用提供的脚本（推荐）

1. **准备新图标**
   - 准备一个 1024x1024 像素的 PNG 图片
   - 命名为 `new-icon.png` 并放在 `src-tauri/icons/` 目录

2. **运行生成脚本**
   ```bash
   cd src-tauri/icons
   bash generate-icons.sh new-icon.png
   ```

3. **验证文件**
   确保以下文件已生成：
   - `icon.png` (1024x1024)
   - `icon.icns` (macOS)
   - `icon.ico` (Windows)

### 方法二：手动替换

#### macOS (.icns) 生成

在 macOS 系统上：

```bash
cd src-tauri/icons

# 1. 创建图标集目录
mkdir -p icon.iconset

# 2. 从源图标生成各种尺寸
sips -z 16 16 icon.png --out icon.iconset/icon_16x16.png
sips -z 32 32 icon.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32 icon.png --out icon.iconset/icon_32x32.png
sips -z 64 64 icon.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128 icon.png --out icon.iconset/icon_128x128.png
sips -z 256 256 icon.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256 icon.png --out icon.iconset/icon_256x256.png
sips -z 512 512 icon.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512 icon.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 icon.png --out icon.iconset/icon_512x512@2x.png

# 3. 生成 .icns 文件
iconutil -c icns icon.iconset -o icon.icns

# 4. 清理临时目录
rm -rf icon.iconset
```

#### Windows (.ico) 生成

**推荐方法：使用在线工具（最简单，推荐）**
- 访问 https://convertio.co/png-ico/
- 上传 `icon.png`
- 下载生成的 `icon.ico`
- 保存到 `src-tauri/icons/` 目录

**优点：**
- ✅ 无需安装额外软件
- ✅ 操作简单，只需几步
- ✅ 生成的图标质量好
- ✅ 支持多种尺寸自动优化

**备选方法：使用 ImageMagick（如果已安装）**
```bash
magick convert icon.png -define icon:auto-resize=256,128,96,64,48,32,16 icon.ico
```

#### Linux (.png)

直接使用 `icon.png` 文件即可。

## 验证图标

替换图标后，运行以下命令验证：

```bash
npm run tauri build
```

如果打包成功，说明图标配置正确。

## 注意事项

1. **文件命名**：确保文件名与 `tauri.conf.json` 中的配置一致
2. **文件路径**：所有图标文件必须位于 `src-tauri/icons/` 目录
3. **图标尺寸**：建议源图标为 1024x1024 像素，确保在高分辨率显示器上清晰
4. **图标设计**：
   - 使用简洁、易识别的设计
   - 避免过多细节（在小尺寸下会模糊）
   - 确保在深色和浅色背景下都清晰可见
5. **透明度**：PNG 和 ICO 格式支持透明度，ICNS 也支持

## 故障排除

### 问题：打包时提示图标文件不存在
- **解决**：检查 `tauri.conf.json` 中的路径是否正确
- **解决**：确保所有图标文件都在 `src-tauri/icons/` 目录

### 问题：macOS 图标显示不正确
- **解决**：确保 `.icns` 文件包含所有必需的尺寸
- **解决**：重新生成 `.icns` 文件

### 问题：Windows 图标显示不正确
- **解决**：确保 `.ico` 文件包含多个尺寸（16, 32, 48, 256）
- **解决**：使用专业的图标转换工具重新生成

## 配置文件位置

图标配置在 `src-tauri/tauri.conf.json` 的 `bundle.icon` 字段：

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

Tauri 会自动根据目标平台选择相应的图标文件。

