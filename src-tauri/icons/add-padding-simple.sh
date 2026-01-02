#!/bin/bash

# 为图标添加边距的简单方法
# 确保图标内容居中，四周留出边距，这样 macOS 系统添加圆角时效果更好

cd "$(dirname "$0")"

if [ ! -f "icon.png" ]; then
    echo "错误: 找不到 icon.png 文件"
    exit 1
fi

# 备份原文件
cp icon.png icon_backup_$(date +%Y%m%d_%H%M%S).png
echo "✓ 已备份原文件"

# 获取图标尺寸
WIDTH=$(magick identify -format "%w" icon.png)
HEIGHT=$(magick identify -format "%h" icon.png)

# 计算边距（15%）
PADDING=$(echo "scale=0; $WIDTH * 15 / 100" | bc)

# 计算内容区域大小
CONTENT_WIDTH=$(($WIDTH - $PADDING * 2))
CONTENT_HEIGHT=$(($HEIGHT - $PADDING * 2))

echo "原始尺寸: ${WIDTH}x${HEIGHT}"
echo "边距: ${PADDING}px (15%)"
echo "内容区域: ${CONTENT_WIDTH}x${CONTENT_HEIGHT}"

# 方法：先缩小图标内容，然后居中放置到原尺寸画布上
magick icon.png \
    -resize ${CONTENT_WIDTH}x${CONTENT_HEIGHT} \
    -gravity center \
    -background transparent \
    -extent ${WIDTH}x${HEIGHT} \
    icon.png

echo "✓ 已添加边距"
echo ""
echo "提示: macOS 系统会自动为图标添加圆角效果"
echo "下一步: 重新生成 .icns 文件"
echo "  bash generate-icons.sh icon.png"

