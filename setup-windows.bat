@echo off
setlocal

cd /d "%~dp0"

if not exist "%~dp0deploy\setup-windows.bat" (
  echo deploy\setup-windows.bat was not found.
  pause
  exit /b 1
)

call "%~dp0deploy\setup-windows.bat"
exit /b %ERRORLEVEL%
