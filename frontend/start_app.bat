@echo off
setlocal enabledelayedexpansion

echo ==========================================
echo   MemeManoranjan - Backend Setup & Run
echo ==========================================
echo.

cd backend

:: Check for Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in your PATH.
    echo Please install Python from https://www.python.org/
    pause
    exit /b
)

:: Create Virtual Environment if it doesn't exist
if not exist venv (
    echo [1/3] Creating Python Virtual Environment...
    python -m venv venv
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b
    )
)

:: Install/Update Dependencies
echo [2/3] Installing/Updating Dependencies...
call venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt
if !errorlevel! neq 0 (
    echo [ERROR] Failed to install dependencies. Check your internet connection.
    pause
    exit /b
)

:: Check for .env file
if not exist .env (
    echo [!] WARNING: .env file not found. Creating from example...
    copy .env.example .env
    echo [!] Please ensure backend/.env contains your MONGO_URI and GOOGLE_CLIENT_ID.
)

:: Start Flask Backend
echo [3/3] Starting Flask Backend...
echo.
echo ------------------------------------------
echo Backend will run on http://127.0.0.1:5000
echo Frontend is available at index.html (or via Live Server)
echo ------------------------------------------
echo.

python app.py

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Backend crashed or failed to start.
    echo Check the error message above for details.
)

pause
