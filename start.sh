#!/bin/sh
echo "========================================="
echo "=== OPC Platform Starting ==="
echo "========================================="

# Fallback: if Railway didn't inject DATABASE_URL, use hardcoded value
if [ -z "$DATABASE_URL" ]; then
  echo "WARNING: DATABASE_URL not injected by Railway, using fallback..."
  export DATABASE_URL="postgresql://postgres:kHfnaCUyvJhJkTvFwMCArLNHbkuaplxn@postgres.railway.internal:5432/railway"
fi

if [ -z "$JWT_SECRET" ]; then
  export JWT_SECRET="opc-jwt-secret-2026-xyz"
fi

if [ -z "$NODE_ENV" ]; then
  export NODE_ENV="production"
fi

echo "DATABASE_URL: SET"
echo "NODE_ENV: $NODE_ENV"
echo "PORT: ${PORT:-4000}"

echo "========================================="
echo "Running prisma db push..."
npx prisma db push --accept-data-loss

echo "========================================="
echo "Starting server..."
node dist/server.js
