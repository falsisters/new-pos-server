#!/bin/bash
# ============================================================
# DB Migration: Supabase → Railway PostgreSQL 16
# ============================================================
# Prerequisites:
#   - pg_dump and psql installed (PostgreSQL client tools)
#   - Both DBs accessible from your machine
#
# Usage:
#   Set these env vars first, then run:
#   bash scripts/migrate-db.sh
#
# Required env vars:
#   SOURCE_DB_URL   - Supabase PG connection (session mode, port 5432)
#   TARGET_DB_URL   - Railway PG connection
# ============================================================
set -e

if [ -z "$SOURCE_DB_URL" ] || [ -z "$TARGET_DB_URL" ]; then
  echo "ERROR: Set SOURCE_DB_URL and TARGET_DB_URL environment variables."
  echo ""
  echo "Example:"
  echo "  export SOURCE_DB_URL='postgresql://postgres.xxx:pass@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres'"
  echo "  export TARGET_DB_URL='postgresql://user:pass@host.railway.internal:5432/railway'"
  exit 1
fi

DUMP_FILE="supabase_dump_$(date +%Y%m%d_%H%M%S).sql"

echo "=== Dumping Supabase database ==="
pg_dump "$SOURCE_DB_URL" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  --format=p \
  --file="$DUMP_FILE"

echo "=== Dump saved to $DUMP_FILE ==="
echo "=== Restoring to Railway PostgreSQL ==="

psql "$TARGET_DB_URL" -f "$DUMP_FILE"

echo "=== Migration complete ==="
echo "Dump file preserved: $DUMP_FILE"
