@echo off
setlocal

net session >nul 2>nul
if errorlevel 1 (
  echo Requesting Administrator permission...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b 0
)

set SCRIPT_DIR=%~dp0
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%install-prerequisites.ps1"
set EXIT_CODE=%ERRORLEVEL%

echo.
if %EXIT_CODE% EQU 0 (
  echo Prerequisite installation finished.
) else (
  echo Prerequisite installation failed with exit code %EXIT_CODE%.
)

pause
exit /b %EXIT_CODE%
