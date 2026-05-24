@echo off
setlocal

set "__SETUP_PS1=%~dp0setup-windows.ps1"
set "__PROJECT_ROOT=%~dp0.."
set "__LOG_DIR=%__PROJECT_ROOT%\log"
set "__SETUP_LOG=%__LOG_DIR%\setup-windows.log"
set "__SETUP_BAT_PATH=%~f0"
set "__BAT_PATH=%__SETUP_PS1%"

if not exist "%__LOG_DIR%" mkdir "%__LOG_DIR%"
echo ExamList setup launcher started: %DATE% %TIME%> "%__SETUP_LOG%"

if not exist "%__SETUP_PS1%" (
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

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%__SETUP_PS1%"
set "__SETUP_EXIT=%ERRORLEVEL%"

if not "%__SETUP_EXIT%"=="0" (
  echo.
  echo ExamList setup failed. See the log file:
  echo   %__SETUP_LOG%
  echo.
  pause
)

exit /b %__SETUP_EXIT%
