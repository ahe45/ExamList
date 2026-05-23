@echo off
setlocal

net session >nul 2>nul
if errorlevel 1 (
  echo Run this file as Administrator.
  exit /b 1
)

set ROOT_DIR=%~dp0..\..
for %%I in ("%ROOT_DIR%") do set ROOT_DIR=%%~fI

set NSSM_EXE=
if exist "%~dp0nssm.exe" set NSSM_EXE=%~dp0nssm.exe

if not defined NSSM_EXE (
  for /f "delims=" %%I in ('where nssm 2^>nul') do (
    if not defined NSSM_EXE set NSSM_EXE=%%I
  )
)

if not defined NSSM_EXE (
  echo nssm.exe was not found.
  echo Put nssm.exe in deploy\windows or add it to PATH, then run this file again.
  exit /b 1
)

set NODE_EXE=
for /f "delims=" %%I in ('where node 2^>nul') do (
  if not defined NODE_EXE set NODE_EXE=%%I
)

if not defined NODE_EXE (
  echo node.exe was not found. Install Node.js first.
  exit /b 1
)

if not exist "%ROOT_DIR%\.env" (
  echo .env was not found. Run deploy\windows\setup-windows.bat first.
  exit /b 1
)

if not exist "%ROOT_DIR%\logs" mkdir "%ROOT_DIR%\logs"

sc query ExamList >nul 2>nul
if errorlevel 1 (
  "%NSSM_EXE%" install ExamList "%NODE_EXE%"
)

"%NSSM_EXE%" set ExamList AppDirectory "%ROOT_DIR%"
"%NSSM_EXE%" set ExamList AppParameters "server.js"
"%NSSM_EXE%" set ExamList AppStdout "%ROOT_DIR%\logs\examlist.out.log"
"%NSSM_EXE%" set ExamList AppStderr "%ROOT_DIR%\logs\examlist.err.log"
"%NSSM_EXE%" set ExamList AppRotateFiles 1
"%NSSM_EXE%" set ExamList AppRotateOnline 1
"%NSSM_EXE%" set ExamList AppRotateBytes 10485760
"%NSSM_EXE%" set ExamList Start SERVICE_AUTO_START

"%NSSM_EXE%" start ExamList

echo ExamList service installed and started.
echo Logs:
echo   %ROOT_DIR%\logs\examlist.out.log
echo   %ROOT_DIR%\logs\examlist.err.log
