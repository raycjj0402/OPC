#!/bin/sh
set -e

# Fallback env vars if Railway didn't inject them
export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:kHfnaCUyvJhJkTvFwMCArLNHbkuaplxn@postgres.railway.internal:5432/railway}"
export JWT_SECRET="${JWT_SECRET:-opc-jwt-secret-2026-xyz}"
export NODE_ENV="${NODE_ENV:-production}"
export PORT="${PORT:-4000}"

echo "=== OPC Starting on port $PORT ==="

echo "=== Applying Prisma schema ==="
npx prisma db push

exec node dist/server.js
