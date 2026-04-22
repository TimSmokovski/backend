@echo off
echo Stopping server and ngrok...
taskkill /F /IM ngrok.exe /T >nul 2>&1
taskkill /F /IM python.exe /T >nul 2>&1
echo Done.
pause
