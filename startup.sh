#!/bin/sh
set -e
echo "Running database migrations..."
yarn prisma migrate deploy
echo "Starting server..."
exec node dist/main.js
