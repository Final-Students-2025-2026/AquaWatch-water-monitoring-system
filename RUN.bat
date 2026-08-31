@echo off
REM ============================================================
REM  AQUAWATCH - One-click launcher (Windows)
REM  Starts the whole system at http://localhost:8000
REM  Backend (Django) + built web dashboard in a single server.
REM ============================================================
setlocal enabledelayedexpansion

cd /d "%~dp0"
echo.
echo  ============================================
echo     AQUAWATCH - IoT Water Quality Monitor
echo  ============================================
echo.

REM ---------- 1. Python virtual environment ----------
if not exist Backend\venv (
  echo [1/4] Creating Python virtual environment...
  python -m venv Backend\venv
  if errorlevel 1 (
    echo ERROR: Could not create virtual environment. Is Python installed?
    pause
    exit /b 1
  )
)

call Backend\venv\Scripts\activate.bat

REM ---------- 2. Install dependencies ----------
echo [2/4] Installing backend dependencies...
python -m pip install --upgrade pip -q
pip install -r Backend\requirements.txt -q
if errorlevel 1 (
  echo WARNING: Dependency install had issues. Continuing anyway...
)

REM ---------- 3. Apply database migrations ----------
echo [3/4] Preparing database...
cd Backend
set SERVE_FRONTEND=1
python manage.py migrate
if errorlevel 1 (
  echo WARNING: Migration step reported an error. Continuing...
)

REM Create the admin user if it doesn't exist yet.
python manage.py create_admin 2>nul

cd ..

REM ---------- 4. Start the server ----------
echo [4/4] Starting AquaWatch...
echo.
echo  Open your browser at:  http://localhost:8000
echo  (Admin panel:          http://localhost:8000/admin  )
echo  Press Ctrl+C to stop.
echo.
cd Backend
set SERVE_FRONTEND=1
python manage.py runserver 0.0.0.0:8000

pause
