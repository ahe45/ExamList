@echo off
setlocal

cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Install Node.js first, then run this file again.
  pause
  exit /b 1
)

echo Starting ExamList server...
echo Press Ctrl+C to stop the server.
echo.
call npm start

echo.
echo Server process exited.
pause
