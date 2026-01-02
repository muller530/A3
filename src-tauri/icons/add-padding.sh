#!/bin/bash

# 为图标添加边距，确保 macOS 圆角效果正常显示
# 用法: ./add-padding.sh [边距百分比，默认 15%]

PADDING_PERCENT=${1:-15}

echo "正在为图标添加 ${PADDING_PERCENT}% 的边距..."

cd "$(dirname "$0")"

if [ ! -f "icon.png" ]; then
    echo "错误: 找不到 icon.png 文件"
    exit 1
fi

# 备份原文件
cp icon.png icon_original.png
echo "✓ 已备份原文件为 icon_original.png"

# 计算新尺寸（保持原始尺寸，但内容会缩小）
# 例如：2048x2048，15% 边距 = 内容区域 1740x1740，边距各 154px

# 使用 ImageMagick 添加透明边距
magick icon.png \
    -gravity center \
    -extent 100% \
    -background transparent \
    -gravity center \
    \( +clone -background transparent -extent $(echo "scale=0; 100 - $PADDING_PERCENT * 2" | bc)% \) \
    -composite \
    icon_padded.png 2>/dev/null

# 如果上面的命令失败，使用更简单的方法
if [ ! -f "icon_padded.png" ]; then
    echo "使用备用方法..."
    # 计算内容区域大小
    WIDTH=$(magick identify -format "%w" icon.png)
    HEIGHT=$(magick identify -format "%h" icon.png)
    
    # 计算边距（像素）
    PADDING=$(echo "scale=0; $WIDTH * $PADDING_PERCENT / 100" | bc)
    
    # 创建带边距的图标
    magick icon.png \
        -gravity center \
        -background transparent \
        -extent ${WIDTH}x${HEIGHT} \
        \( +clone -background transparent -extent $(($WIDTH - $PADDING * 2))x$(($HEIGHT - $PADDING * 2)) \) \
        -composite \
        icon_padded.png
fi

if [ -f "icon_padded.png" ]; then
    mv icon_padded.png icon.png
    echo "✓ 已添加边距"
    echo ""
    echo "下一步：重新生成 .icns 文件"
    echo "  bash generate-icons.sh icon.png"
else
    echo "错误: 无法添加边距，请检查 ImageMagick 是否正确安装"
    exit 1
fi

