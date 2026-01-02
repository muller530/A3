#!/bin/bash

# 图标生成脚本
# 用法: ./generate-icons.sh <源图标文件>
# 示例: ./generate-icons.sh new-icon.png

set -e

# 检查参数
if [ $# -eq 0 ]; then
    echo "错误: 请提供源图标文件路径"
    echo "用法: $0 <源图标文件>"
    echo "示例: $0 new-icon.png"
    exit 1
fi

SOURCE_ICON="$1"

# 检查源文件是否存在
if [ ! -f "$SOURCE_ICON" ]; then
    echo "错误: 源图标文件 '$SOURCE_ICON' 不存在"
    exit 1
fi

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "开始生成图标文件..."
echo "源文件: $SOURCE_ICON"

# 1. 复制并重命名源图标为 icon.png（如果源文件不是 icon.png）
if [ "$SOURCE_ICON" != "icon.png" ]; then
    echo "1. 复制源图标为 icon.png..."
    cp "$SOURCE_ICON" icon.png
fi

# 2. 生成 macOS .icns 文件
echo "2. 生成 macOS .icns 文件..."
if command -v sips >/dev/null 2>&1 && command -v iconutil >/dev/null 2>&1; then
    # 清理旧的图标集目录
    rm -rf icon.iconset
    
    # 创建图标集目录
    mkdir -p icon.iconset
    
    # 生成各种尺寸的图标
    echo "   生成各种尺寸..."
    sips -z 16 16 icon.png --out icon.iconset/icon_16x16.png >/dev/null 2>&1
    sips -z 32 32 icon.png --out icon.iconset/icon_16x16@2x.png >/dev/null 2>&1
    sips -z 32 32 icon.png --out icon.iconset/icon_32x32.png >/dev/null 2>&1
    sips -z 64 64 icon.png --out icon.iconset/icon_32x32@2x.png >/dev/null 2>&1
    sips -z 128 128 icon.png --out icon.iconset/icon_128x128.png >/dev/null 2>&1
    sips -z 256 256 icon.png --out icon.iconset/icon_128x128@2x.png >/dev/null 2>&1
    sips -z 256 256 icon.png --out icon.iconset/icon_256x256.png >/dev/null 2>&1
    sips -z 512 512 icon.png --out icon.iconset/icon_256x256@2x.png >/dev/null 2>&1
    sips -z 512 512 icon.png --out icon.iconset/icon_512x512.png >/dev/null 2>&1
    sips -z 1024 1024 icon.png --out icon.iconset/icon_512x512@2x.png >/dev/null 2>&1
    
    # 生成 .icns 文件
    iconutil -c icns icon.iconset -o icon.icns
    
    # 清理临时目录
    rm -rf icon.iconset
    
    echo "   ✓ icon.icns 已生成"
else
    echo "   警告: 未找到 sips 或 iconutil 命令（macOS 工具）"
    echo "   请手动生成 icon.icns 文件，或使用在线工具"
fi

# 3. 生成 Windows .ico 文件
echo "3. 生成 Windows .ico 文件..."
if command -v magick >/dev/null 2>&1; then
    # 使用 ImageMagick
    magick convert icon.png -define icon:auto-resize=256,128,96,64,48,32,16 icon.ico
    echo "   ✓ icon.ico 已生成（使用 ImageMagick）"
elif command -v convert >/dev/null 2>&1; then
    # 使用 ImageMagick (旧版本)
    convert icon.png -define icon:auto-resize=256,128,96,64,48,32,16 icon.ico
    echo "   ✓ icon.ico 已生成（使用 ImageMagick）"
else
    echo "   提示: 未找到 ImageMagick，建议使用在线工具生成 .ico 文件"
    echo "   📌 推荐方法："
    echo "   1. 访问 https://convertio.co/png-ico/"
    echo "   2. 上传 icon.png"
    echo "   3. 下载生成的 icon.ico"
    echo "   4. 保存到当前目录 (src-tauri/icons/)"
    echo ""
    echo "   备选方法："
    echo "   - 安装 ImageMagick: brew install imagemagick"
    echo "   - 然后重新运行此脚本"
fi

echo ""
echo "图标生成完成！"
echo ""
echo "生成的文件:"
echo "  - icon.png (基础图标)"
if [ -f "icon.icns" ]; then
    echo "  - icon.icns (macOS)"
fi
if [ -f "icon.ico" ]; then
    echo "  - icon.ico (Windows)"
fi
echo ""
echo "下一步: 运行 'npm run tauri build' 验证图标是否正确"

