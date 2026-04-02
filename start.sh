#!/bin/sh
echo "========================================="
echo "=== OPC Platform Starting ==="
echo "========================================="

# Fallback: if Railway didn't inject DATABASE_URL, use hardcoded value
if [ -z "$DATABASE_URL" ]; then
  echo "WARNING: DATABASE_URL not injected, using fallback..."
  export DATABASE_URL="postgresql://postgres:kHfnaCUyvJhJkTvFwMCArLNHbkuaplxn@postgres.railway.internal:5432/railway"
fi

if [ -z "$JWT_SECRET" ]; then
  export JWT_SECRET="opc-jwt-secret-2026-xyz"
fi

if [ -z "$NODE_ENV" ]; then
  export NODE_ENV="production"
fi

# Railway sets PORT via system variable - use it or default to 8080
LISTEN_PORT="${PORT:-8080}"

echo "DATABASE_URL: SET (${#DATABASE_URL} chars)"
echo "NODE_ENV: $NODE_ENV"
echo "PORT: $LISTEN_PORT"
echo "========================================="

echo "Running prisma db push..."
npx prisma db push --accept-data-loss
PRISMA_EXIT=$?

if [ $PRISMA_EXIT -ne 0 ]; then
  echo "ERROR: prisma db push failed with exit code $PRISMA_EXIT"
  echo "Trying public network URL as fallback..."
  export DATABASE_URL="postgresql://postgres:kHfnaCUyvJhJkTvFwMCArLNHbkuaplxn@interchange.proxy.rlwy.net:22430/railway"
  npx prisma db push --accept-data-loss
fi

echo "========================================="
echo "Starting server on port $LISTEN_PORT..."
node dist/server.js
