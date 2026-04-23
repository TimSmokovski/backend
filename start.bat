@echo off
echo.
echo  LkStars - Starting...
echo.

echo [1/2] Starting ngrok on port 8000...
start "ngrok" cmd /k "ngrok http --domain=flirt-spoiler-unpainted.ngrok-free.dev 8000"

echo Waiting for ngrok...
timeout /t 4 /nobreak >nul

echo [2/2] Starting backend server...
echo.

cd /d "%~dp0backend"
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
