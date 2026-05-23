$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Resolve-Path (Join-Path $scriptDir "..\..")
$envPath = Join-Path $rootDir ".env"
$envExamplePath = Join-Path $scriptDir "env.windows.example"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Write-Step($message) {
  Write-Host ""
  Write-Host "==> $message"
}

function Test-Command($name) {
  return $null -ne (Get-Command $name -ErrorAction SilentlyContinue)
}

function New-RandomHex($byteCount) {
  $bytes = New-Object byte[] $byteCount
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  return ([System.BitConverter]::ToString($bytes)).Replace("-", "").ToLowerInvariant()
}

function Write-TextUtf8NoBom($path, $content) {
  [System.IO.File]::WriteAllText($path, [string] $content, $utf8NoBom)
}

function Write-LinesUtf8NoBom($path, $lines) {
  [System.IO.File]::WriteAllLines($path, [string[]] $lines, $utf8NoBom)
}

function Read-EnvValue($name) {
  if (-not (Test-Path $envPath)) {
    return ""
  }

  $line = Get-Content $envPath | Where-Object {
    $_ -match "^\s*$([Regex]::Escape($name))\s*="
  } | Select-Object -First 1

  if (-not $line) {
    return ""
  }

  $rawValue = ($line -replace "^\s*$([Regex]::Escape($name))\s*=\s*", "").Trim()

  if ($rawValue.Length -ge 2 -and $rawValue.StartsWith('"') -and $rawValue.EndsWith('"')) {
    $innerValue = $rawValue.Substring(1, $rawValue.Length - 2)

    return $innerValue.Replace('\n', "`n").Replace('\r', "`r").Replace('\"', '"').Replace('\\', '\')
  }

  if ($rawValue.Length -ge 2 -and $rawValue.StartsWith("'") -and $rawValue.EndsWith("'")) {
    return $rawValue.Substring(1, $rawValue.Length - 2)
  }

  return $rawValue
}

function ConvertTo-EnvFileValue($value) {
  $text = [string] $value

  if ($text -match '^[A-Za-z0-9_.:/@%+\-]*$') {
    return $text
  }

  return '"' + $text.Replace('\', '\\').Replace('"', '\"').Replace("`r", '\r').Replace("`n", '\n') + '"'
}

function Set-EnvValue($name, $value) {
  $lineValue = "$name=$(ConvertTo-EnvFileValue $value)"

  if (-not (Test-Path $envPath)) {
    Write-TextUtf8NoBom $envPath $lineValue
    return
  }

  $lines = @(Get-Content $envPath)
  $pattern = "^\s*$([Regex]::Escape($name))\s*="
  $updated = $false

  for ($index = 0; $index -lt $lines.Count; $index += 1) {
    if ($lines[$index] -match $pattern) {
      $lines[$index] = $lineValue
      $updated = $true
      break
    }
  }

  if (-not $updated) {
    $lines += $lineValue
  }

  Write-LinesUtf8NoBom $envPath $lines
}

function Remove-EnvValue($name) {
  if (-not (Test-Path $envPath)) {
    return
  }

  $pattern = "^\s*$([Regex]::Escape($name))\s*="
  $lines = @(Get-Content $envPath | Where-Object { $_ -notmatch $pattern })
  Write-LinesUtf8NoBom $envPath $lines
}

function Read-TextWithDefault($label, $currentValue) {
  $currentText = [string] $currentValue
  $prompt = if ($currentText) { "$label [$currentText]" } else { $label }
  $value = Read-Host $prompt

  if ([string]::IsNullOrWhiteSpace($value)) {
    return $currentText
  }

  return $value.Trim()
}

function Read-PasswordWithDefault($label, $currentValue) {
  $currentText = [string] $currentValue
  $prompt = if ($currentText) { "$label [already set, press Enter to keep]" } else { $label }
  $secureValue = Read-Host $prompt -AsSecureString

  if ($secureValue.Length -eq 0) {
    return $currentText
  }

  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)

  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

function Configure-DatabaseEnvironment() {
  Write-Step "Configuring database connection"
  Write-Host "Enter the MariaDB/MySQL account that ExamList will use."
  Write-Host "The account must be able to connect, create the database if needed, and create/alter tables."

  $configureDb = Read-Host "Configure DB connection now? [Y/n]"

  if ($configureDb.Trim().ToLowerInvariant() -eq "n") {
    Write-Host "Skipped DB connection input. Current .env DB_* values will be used."
    return
  }

  $dbHost = Read-TextWithDefault "DB host" (Read-EnvValue "DB_HOST")
  $dbPort = Read-TextWithDefault "DB port" (Read-EnvValue "DB_PORT")
  $dbName = Read-TextWithDefault "DB name" (Read-EnvValue "DB_NAME")
  $dbUser = Read-TextWithDefault "DB user" (Read-EnvValue "DB_USER")
  $dbPassword = Read-PasswordWithDefault "DB password" (Read-EnvValue "DB_PASSWORD")

  Set-EnvValue "DB_HOST" $dbHost
  Set-EnvValue "DB_PORT" $dbPort
  Set-EnvValue "DB_NAME" $dbName
  Set-EnvValue "DB_USER" $dbUser
  Set-EnvValue "DB_PASSWORD" $dbPassword

  Write-Host "DB connection saved to .env."
  Write-Host "DB_HOST=$dbHost"
  Write-Host "DB_PORT=$dbPort"
  Write-Host "DB_NAME=$dbName"
  Write-Host "DB_USER=$dbUser"
}

function Configure-ServerEnvironment() {
  Write-Step "Configuring server access"
  Write-Host "By default, ExamList uses HTTP port 80 so users can open http://<server-ip> without typing a port."

  $useCustomPort = Read-Host "Use a custom port instead of default HTTP port 80? [y/N]"

  if ($useCustomPort.Trim().ToLowerInvariant() -ne "y") {
    Remove-EnvValue "PORT"
    Write-Host "PORT was removed from .env. ExamList will listen on http://localhost and http://<server-ip>."
    return
  }

  $currentPort = Read-EnvValue "PORT"

  if (-not $currentPort) {
    $currentPort = "3002"
  }

  while ($true) {
    $serverPort = Read-TextWithDefault "Server port" $currentPort
    $parsedPort = 0

    if (
      [int]::TryParse($serverPort, [ref] $parsedPort) -and
      $parsedPort -ge 1 -and
      $parsedPort -le 65535
    ) {
      Set-EnvValue "PORT" ([string] $parsedPort)
      Write-Host "Server port saved to .env: PORT=$parsedPort"
      return
    }

    Write-Warning "Enter a valid TCP port between 1 and 65535."
  }
}

function Resolve-ConfiguredServerPort() {
  $configuredPort = Read-EnvValue "PORT"
  $parsedPort = 0

  if ([int]::TryParse($configuredPort, [ref] $parsedPort) -and $parsedPort -ge 1 -and $parsedPort -le 65535) {
    return $parsedPort
  }

  return 80
}

function Format-HttpUrl($hostName, $serverPort) {
  if ($serverPort -eq 80) {
    return "http://$hostName"
  }

  return "http://$hostName`:$serverPort"
}

function Invoke-Checked($file, $arguments) {
  Write-Host "> $file $arguments"
  $process = Start-Process -FilePath $file -ArgumentList $arguments -WorkingDirectory $rootDir -Wait -NoNewWindow -PassThru

  if ($process.ExitCode -ne 0) {
    throw "$file failed with exit code $($process.ExitCode)."
  }
}

function Test-TcpPort($hostName, $port) {
  try {
    return Test-NetConnection -ComputerName $hostName -Port $port -InformationLevel Quiet
  } catch {
    return $false
  }
}

function Wait-TcpPort($hostName, $port, $timeoutSeconds) {
  $deadline = (Get-Date).AddSeconds($timeoutSeconds)

  while ((Get-Date) -lt $deadline) {
    if (Test-TcpPort $hostName $port) {
      return $true
    }

    Start-Sleep -Seconds 1
  }

  return $false
}

function Test-DockerDaemon() {
  if (-not (Test-Command "docker")) {
    return $false
  }

  & docker info > $null 2>&1
  return $LASTEXITCODE -eq 0
}

function Wait-DockerDaemon($timeoutSeconds) {
  $deadline = (Get-Date).AddSeconds($timeoutSeconds)

  while ((Get-Date) -lt $deadline) {
    if (Test-DockerDaemon) {
      return $true
    }

    Start-Sleep -Seconds 2
  }

  return $false
}

function Ensure-DockerDaemon() {
  if (Test-DockerDaemon) {
    Write-Host "Docker daemon is ready."
    return
  }

  $dockerDesktopPath = Join-Path $env:ProgramFiles "Docker\Docker\Docker Desktop.exe"

  if (Test-Path $dockerDesktopPath) {
    Write-Host "Starting Docker Desktop..."
    Start-Process -FilePath $dockerDesktopPath | Out-Null

    if (Wait-DockerDaemon 120) {
      Write-Host "Docker daemon is ready."
      return
    }
  }

  throw "Docker Desktop is installed but not ready. Start Docker Desktop manually, finish any first-run prompts, then run this file again."
}

function Ensure-DockerRedis() {
  if (Test-TcpPort "127.0.0.1" 6379) {
    Write-Host "Redis port 6379 is reachable."
    return
  }

  if (-not (Test-Command "docker")) {
    throw "Redis is required for the recommended BullMQ mode. Run deploy\windows\install-prerequisites.bat, then start Docker Desktop."
  }

  Ensure-DockerDaemon

  Write-Host "Redis is not reachable. Starting Docker Redis container..."
  Invoke-Checked "cmd.exe" "/c deploy\windows\start-redis-docker.bat"

  if (-not (Wait-TcpPort "127.0.0.1" 6379 30)) {
    throw "Docker Redis started command finished, but port 6379 is still not reachable. Check Docker Desktop status."
  }

  Write-Host "Redis is ready on 127.0.0.1:6379."
}

Write-Step "Checking required commands"

if (-not (Test-Command "node")) {
  throw "Node.js is not installed or node.exe is not in PATH. Run deploy\windows\install-prerequisites.bat first."
}

if (-not (Test-Command "npm")) {
  throw "npm is not installed or npm.cmd is not in PATH. Run deploy\windows\install-prerequisites.bat first."
}

Write-Host "Node: $(node -v)"
Write-Host "npm : $(npm -v)"

Write-Step "Preparing .env"

if (-not (Test-Path $envPath)) {
  if (-not (Test-Path $envExamplePath)) {
    throw "Missing template: $envExamplePath"
  }

  $sessionSecret = New-RandomHex 32
  $envContent = Get-Content $envExamplePath -Raw
  $envContent = $envContent.Replace("change-this-long-random-session-secret", $sessionSecret)
  Write-TextUtf8NoBom $envPath $envContent
  Write-Host "Created .env from deploy\windows\env.windows.example."
} else {
  Write-Host ".env already exists. It will not be overwritten."
}

Configure-ServerEnvironment
Configure-DatabaseEnvironment

$openEnv = Read-Host "Open .env for initial login account or advanced settings? [Y/n]"
if ($openEnv.Trim().ToLowerInvariant() -ne "n") {
  Start-Process notepad.exe $envPath
  Read-Host "Press Enter after closing/saving .env"
}

Write-Step "Installing Node dependencies"

if (Test-Path (Join-Path $rootDir "package-lock.json")) {
  Invoke-Checked "npm.cmd" "ci"
} else {
  Invoke-Checked "npm.cmd" "install"
}

Write-Step "Checking PDF browser"

$browserPathFromEnv = Read-EnvValue "PDF_BROWSER_PATH"
$browserCandidates = @()

if ($browserPathFromEnv) {
  $browserCandidates += $browserPathFromEnv
}

$programFilesX86 = [Environment]::GetEnvironmentVariable("ProgramFiles(x86)")
$browserCandidates += @(
  (Join-Path $env:ProgramFiles "Microsoft\Edge\Application\msedge.exe"),
  (Join-Path $env:ProgramFiles "Google\Chrome\Application\chrome.exe")
)

if ($programFilesX86) {
  $browserCandidates += @(
    (Join-Path $programFilesX86 "Microsoft\Edge\Application\msedge.exe"),
    (Join-Path $programFilesX86 "Google\Chrome\Application\chrome.exe")
  )
}

$browserFound = $browserCandidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

if ($browserFound) {
  Write-Host "PDF browser found: $browserFound"
} else {
  Write-Warning "Edge or Chrome was not found in the default path. Install one, or set PDF_BROWSER_PATH in .env."
}

Write-Step "Checking PDF queue mode"

$queueDriver = (Read-EnvValue "PDF_QUEUE_DRIVER").ToLowerInvariant()

if (-not $queueDriver) {
  $queueDriver = "bullmq"
}

if ($queueDriver -eq "bullmq") {
  $redisUrl = Read-EnvValue "REDIS_URL"
  Write-Host "BullMQ mode is enabled. REDIS_URL=$redisUrl"
  Ensure-DockerRedis
} else {
  Write-Warning "Memory queue mode is enabled. Redis will not be used, and queued PDF jobs can be lost when the app restarts."
}

Write-Step "Preparing database schema"

$runDbSetup = Read-Host "Run npm run setup:db now? DB server and .env DB_* values must be ready. [Y/n]"
if ($runDbSetup.Trim().ToLowerInvariant() -ne "n") {
  Invoke-Checked "npm.cmd" "run setup:db"
} else {
  Write-Host "Skipped database schema setup."
}

Write-Step "Setup complete"
$serverPort = Resolve-ConfiguredServerPort
Write-Host "Local URL: $(Format-HttpUrl "localhost" $serverPort)"
Write-Host "Same-network URL: $(Format-HttpUrl "<server-ip>" $serverPort)"

$startApp = Read-Host "Start ExamList now? [Y/n]"
if ($startApp.Trim().ToLowerInvariant() -ne "n") {
  Write-Host "Starting ExamList. Press Ctrl+C in this window to stop it."
  & (Join-Path $scriptDir "start-examlist.bat")
} else {
  Write-Host "Start it later with: deploy\windows\start-examlist.bat"
}
