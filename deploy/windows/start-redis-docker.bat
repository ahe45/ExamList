@echo off
setlocal

where docker >nul 2>nul
if errorlevel 1 (
  echo Docker was not found. Install Docker Desktop first.
  exit /b 1
)

docker info >nul 2>nul
if errorlevel 1 (
  if exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" (
    echo Starting Docker Desktop...
    start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$deadline=(Get-Date).AddSeconds(120); while((Get-Date) -lt $deadline){ docker info *> $null; if($LASTEXITCODE -eq 0){ exit 0 }; Start-Sleep -Seconds 2 }; exit 1"
    if errorlevel 1 (
      echo Docker Desktop is not ready. Finish Docker Desktop first-run setup, then run this file again.
      exit /b 1
    )
  ) else (
    echo Docker Desktop is not running or not installed.
    exit /b 1
  )
)

docker ps -a --format "{{.Names}}" | findstr /x "examlist-redis" >nul 2>nul
if errorlevel 1 (
  docker run -d --name examlist-redis -p 6379:6379 --restart unless-stopped redis:7-alpine
  exit /b %ERRORLEVEL%
)

docker start examlist-redis
exit /b %ERRORLEVEL%
