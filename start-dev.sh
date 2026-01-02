#!/bin/bash

# 开发服务器启动脚本
# 自动清理端口占用并启动开发服务器

echo "正在清理端口占用..."

# 清理端口 1420 的所有进程
lsof -ti:1420 2>/dev/null | xargs kill -9 2>/dev/null

# 清理所有 vite 和 tauri 相关进程
pkill -9 -f "vite" 2>/dev/null
pkill -9 -f "tauri dev" 2>/dev/null

# 等待端口释放
sleep 2

# 检查端口是否已释放
if lsof -ti:1420 2>/dev/null; then
    echo "⚠️  警告: 端口 1420 仍被占用，尝试强制清理..."
    lsof -ti:1420 2>/dev/null | xargs kill -9 2>/dev/null
    sleep 2
fi

# 确认端口状态
if lsof -ti:1420 2>/dev/null; then
    echo "❌ 错误: 无法释放端口 1420"
    echo "请手动检查并关闭占用端口的进程:"
    echo "  lsof -ti:1420 | xargs kill -9"
    exit 1
else
    echo "✓ 端口 1420 已释放"
fi

echo ""
echo "正在启动开发服务器..."
echo ""

# 启动开发服务器
cd "$(dirname "$0")"
npm run tauri dev

