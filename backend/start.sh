#!/usr/bin/env bash
# Exit on any failure
set -e

echo "==> Running database migrations..."
if [ -f "migrate_carpool.py" ]; then
    python migrate_carpool.py || echo "Migration script finished or columns already present."
fi

echo "==> Starting Safar FastAPI server on port ${PORT:-8000}..."
exec python main.py

