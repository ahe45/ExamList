@echo off
setlocal

cd /d "%~dp0"

set "__LOG_DIR=%~dp0log"
set "__UPDATE_LOG=%__LOG_DIR%\update-server.log"
set "__HAS_LOCAL_CHANGES=0"
set "__BRANCH="

if not exist "%__LOG_DIR%" mkdir "%__LOG_DIR%"
echo ExamList update started: %DATE% %TIME%> "%__UPDATE_LOG%"

echo Updating ExamList from GitHub.
echo If the server is running, stop it before applying this update.
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo git.exe was not found.>> "%__UPDATE_LOG%"
  echo git.exe was not found. Install Git for Windows first.
  echo.
  echo See the log file:
  echo   %__UPDATE_LOG%
  pause
  exit /b 1
)

if not exist "%~dp0.git" (
  echo This folder is not a Git clone.>> "%__UPDATE_LOG%"
  echo This folder is not a Git clone.
  echo Use this update script only in a folder installed with git clone.
  echo.
  echo See the log file:
  echo   %__UPDATE_LOG%
  pause
  exit /b 1
)

for /f "delims=" %%B in ('git branch --show-current 2^>nul') do set "__BRANCH=%%B"
if "%__BRANCH%"=="" set "__BRANCH=master"

for /f "delims=" %%S in ('git status --porcelain 2^>nul') do set "__HAS_LOCAL_CHANGES=1"
if "%__HAS_LOCAL_CHANGES%"=="1" (
  echo Local changes were found.>> "%__UPDATE_LOG%"
  echo Local changes were found. Update was stopped to avoid overwriting files.
  echo.
  git status --short
  echo.
  echo Commit, stash, or remove local changes before running this script again.
  pause
  exit /b 1
)

echo Current branch: %__BRANCH%
echo Fetching latest changes...
git fetch origin >> "%__UPDATE_LOG%" 2>>&1
if errorlevel 1 goto UPDATE_FAILED

echo Pulling latest changes...
git pull --ff-only origin "%__BRANCH%" >> "%__UPDATE_LOG%" 2>>&1
if errorlevel 1 goto UPDATE_FAILED

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found.>> "%__UPDATE_LOG%"
  echo npm was not found. Install Node.js first.
  echo.
  echo See the log file:
  echo   %__UPDATE_LOG%
  pause
  exit /b 1
)

echo Installing dependencies...
call npm install >> "%__UPDATE_LOG%" 2>>&1
if errorlevel 1 goto UPDATE_FAILED

echo Preparing database schema...
call npm run setup:db >> "%__UPDATE_LOG%" 2>>&1
if errorlevel 1 goto UPDATE_FAILED

echo.
echo ExamList update completed.
echo Start the server again with:
echo   start-server.bat
echo.
echo See the log file:
echo   %__UPDATE_LOG%
pause
exit /b 0

:UPDATE_FAILED
echo.
echo ExamList update failed. See the log file:
echo   %__UPDATE_LOG%
echo.
pause
exit /b 1
