#!/usr/bin/env bash
# ============================================================
#  AQUAWATCH - One-click launcher (macOS / Linux)
#  Starts the whole system at http://localhost:8000
# ============================================================
set -e
cd "$(dirname "$0")"

echo "============================================"
echo "   AQUAWATCH - IoT Water Quality Monitor"
echo "============================================"

# 1. Python virtual environment
if [ ! -d "Backend/venv" ]; then
  echo "[1/4] Creating Python virtual environment..."
  python3 -m venv Backend/venv
fi
# shellcheck disable=SC1091
source Backend/venv/bin/activate

# 2. Install dependencies
echo "[2/4] Installing backend dependencies..."
python -m pip install --upgrade pip -q
pip install -r Backend/requirements.txt -q || true

# 3. Database migrations
echo "[3/4] Preparing database..."
export SERVE_FRONTEND=1
( cd Backend && python manage.py migrate ) || true
( cd Backend && python manage.py create_admin ) 2>/dev/null || true

# 4. Start server
echo "[4/4] Starting AquaWatch..."
echo
echo "  Open your browser at:  http://localhost:8000"
echo "  (Admin panel:          http://localhost:8000/admin)"
echo "  Press Ctrl+C to stop."
echo
export SERVE_FRONTEND=1
cd Backend
python manage.py runserver 0.0.0.0:8000
