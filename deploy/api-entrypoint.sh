#!/bin/sh
set -eu

mkdir -p /app/apps/shop-backend/uploads

if [ -d /app/seed-uploads ]; then
  cp -n /app/seed-uploads/* /app/apps/shop-backend/uploads/ 2>/dev/null || true
fi

exec "$@"
