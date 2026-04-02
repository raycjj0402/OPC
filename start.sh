#!/bin/sh
set -e

echo "=== OPC Platform Starting ==="
echo "PORT: ${PORT:-8080}"
echo "NODE_ENV: ${NODE_ENV:-production}"

# Fallback env vars if Railway didn't inject them
export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:kHfnaCUyvJhJkTvFwMCArLNHbkuaplxn@postgres.railway.internal:5432/railway}"
export JWT_SECRET="${JWT_SECRET:-opc-jwt-secret-2026-xyz}"
export NODE_ENV="${NODE_ENV:-production}"
export PORT="${PORT:-8080}"

echo "DATABASE_URL length: ${#DATABASE_URL}"

echo "Running prisma db push..."
npx prisma db push --accept-data-loss

echo "=== Starting server on port $PORT ==="
exec node dist/server.js
