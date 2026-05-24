@echo off
setlocal

cd /d "%~dp0"

set "__SETUP_REQUIRED=0"

if not exist "%~dp0.env" set "__SETUP_REQUIRED=1"
if not exist "%~dp0node_modules" set "__SETUP_REQUIRED=1"

where node >nul 2>nul
if errorlevel 1 (
  set "__SETUP_REQUIRED=1"
)

where npm >nul 2>nul
if errorlevel 1 (
  set "__SETUP_REQUIRED=1"
)

if "%__SETUP_REQUIRED%"=="1" goto RUN_SETUP

goto START_SERVER

:RUN_SETUP
set "__SETUP_PS1=%~dp0deploy\setup-windows.ps1"
set "__LOG_DIR=%~dp0log"
set "__SETUP_LOG=%__LOG_DIR%\setup-windows.log"
set "__SETUP_BAT_PATH=%~f0"
set "__BAT_PATH=%~dp0deploy\setup-windows.ps1"

echo ExamList is not configured yet. Running Windows setup first.
if not exist "%__LOG_DIR%" mkdir "%__LOG_DIR%"
echo ExamList setup launcher started: %DATE% %TIME%> "%__SETUP_LOG%"

if not exist "%~dp0deploy\setup-windows.ps1" (
  echo deploy\setup-windows.ps1 was not found.>> "%__SETUP_LOG%"
  echo deploy\setup-windows.ps1 was not found.
  echo.
  echo See the log file:
  echo   %__SETUP_LOG%
  pause
  exit /b 1
)

where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo powershell.exe was not found.>> "%__SETUP_LOG%"
  echo powershell.exe was not found.
  echo.
  echo See the log file:
  echo   %__SETUP_LOG%
  pause
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy\setup-windows.ps1"
set "__SETUP_EXIT=%ERRORLEVEL%"

if not "%__SETUP_EXIT%"=="0" (
  echo.
  echo ExamList setup failed. See the log file:
  echo   %__SETUP_LOG%
  echo.
  pause
  exit /b %__SETUP_EXIT%
)

exit /b 0

:START_SERVER
echo Starting ExamList server...
echo Press Ctrl+C to stop the server.
echo.
call npm start

echo.
echo Server process exited.
pause
