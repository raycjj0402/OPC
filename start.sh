#!/bin/bash
# OPC平台一键启动脚本

set -e
echo "🚀 启动 OPC 一人公司服务平台..."

# 检查 Node.js
if ! command -v node &> /dev/null; then
  echo "❌ 请先安装 Node.js (https://nodejs.org)"
  exit 1
fi

# 检查 PostgreSQL
if ! command -v psql &> /dev/null; then
  echo "⚠️  未检测到 PostgreSQL，请确保数据库已启动"
fi

# ===== 后端 =====
echo ""
echo "📦 安装后端依赖..."
cd "$(dirname "$0")/backend"
npm install

echo ""
echo "🗄️  初始化数据库..."
npx prisma generate
npx prisma db push --accept-data-loss

echo ""
echo "🌱 填充初始数据..."
npx ts-node src/utils/seed.ts

echo ""
echo "▶️  启动后端服务 (端口 4000)..."
npm run dev &
BACKEND_PID=$!

# ===== 前端 =====
cd "$(dirname "$0")/frontend"
echo ""
echo "📦 安装前端依赖..."
npm install

echo ""
echo "▶️  启动前端服务 (端口 5173)..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "============================================"
echo "✅ OPC平台启动成功！"
echo ""
echo "  前端地址:  http://localhost:5173"
echo "  后端API:   http://localhost:4000"
echo "  健康检查:  http://localhost:4000/health"
echo ""
echo "  测试账号:"
echo "  管理员: admin@opc-platform.com / admin123456"
echo "  用户:   test@example.com / test123456"
echo "============================================"
echo ""
echo "按 Ctrl+C 停止所有服务"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo '服务已停止'" SIGINT SIGTERM
wait
