@echo off
echo.
echo  DC_GalaxySpinBot2 - Starting...
echo.

echo [1/2] Starting ngrok on port 8000...
start "ngrok" cmd /k "ngrok http 8000"

echo Waiting for ngrok...
timeout /t 4 /nobreak >nul

echo [2/2] Starting backend server...
echo.
echo  IMPORTANT: Copy HTTPS URL from the ngrok window
echo  and paste it into frontend\js\config.js, then git push.
echo.

cd /d "%~dp0backend"
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
