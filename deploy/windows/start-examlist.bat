@echo off
setlocal

set ROOT_DIR=%~dp0..\..
for %%I in ("%ROOT_DIR%") do set ROOT_DIR=%%~fI

cd /d "%ROOT_DIR%"

if not exist ".env" (
  echo .env was not found.
  echo Run deploy\windows\setup-windows.bat first.
  exit /b 1
)

node server.js
