#!/bin/sh
echo "========================================="
echo "=== ALL ENVIRONMENT VARIABLES ==="
echo "========================================="
env | sort
echo "========================================="
echo "=== DATABASE_URL CHECK ==="
if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL: NOT SET"
  echo "FATAL: Cannot start without DATABASE_URL"
  exit 1
else
  echo "DATABASE_URL: SET (length=${#DATABASE_URL})"
fi
echo "========================================="
echo "Running prisma db push..."
npx prisma db push --accept-data-loss
echo "Starting server..."
node dist/server.js
