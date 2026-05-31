$ErrorActionPreference = "Stop"

$script:transcriptStarted = $false
if ($env:__SETUP_LOG) {
  try {
    $setupLogDir = Split-Path -Parent $env:__SETUP_LOG
    if ($setupLogDir -and -not (Test-Path $setupLogDir)) {
      New-Item -ItemType Directory -Path $setupLogDir -Force | Out-Null
    }

    Start-Transcript -Path $env:__SETUP_LOG -Append | Out-Null
    $script:transcriptStarted = $true
  } catch {
    Write-Warning "Setup log could not be opened: $($_.Exception.Message)"
  }
}

trap {
  Write-Host ""
  Write-Host "ExamList setup failed." -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red

  if ($_.ScriptStackTrace) {
    Write-Host $_.ScriptStackTrace
  }

  if ($script:transcriptStarted) {
    try {
      Stop-Transcript | Out-Null
    } catch {
    }
  }

  exit 1
}

$scriptPath = if ($env:__BAT_PATH) { $env:__BAT_PATH } else { $PSCommandPath }
$scriptDir = Split-Path -Parent $scriptPath
$rootDir = Resolve-Path (Join-Path $scriptDir "..")
$envPath = Join-Path $rootDir ".env"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Write-Step($message) {
  Write-Host ""
  Write-Host "==> $message"
}

function Test-IsAdministrator() {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)

  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Restart-SelfAsAdministrator() {
  Write-Host "Administrator permission is required to install prerequisites."
  $batPath = $env:__SETUP_BAT_PATH

  if ($batPath -and (Test-Path $batPath)) {
    Start-Process -FilePath $batPath -Verb RunAs | Out-Null
  } else {
    Start-Process -FilePath "powershell.exe" -ArgumentList @(
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      $scriptPath
    ) -Verb RunAs | Out-Null
  }

  exit 0
}

function Test-Command($name) {
  return $null -ne (Get-Command $name -ErrorAction SilentlyContinue)
}

function Add-PathIfExists($pathValue) {
  if ($pathValue -and (Test-Path $pathValue) -and ($env:Path -notlike "*$pathValue*")) {
    $env:Path = "$pathValue;$env:Path"
  }
}

function Refresh-CommonToolPaths() {
  Add-PathIfExists (Join-Path $env:ProgramFiles "nodejs")
}

function Invoke-CommandChecked($file, [string[]] $arguments) {
  Write-Host "> $file $($arguments -join ' ')"
  & $file @arguments
  $exitCode = $LASTEXITCODE

  if ($exitCode -ne 0) {
    throw "$file failed with exit code $exitCode."
  }
}

function Install-WingetPackage($id, $label, $commandToCheck = "") {
  Write-Step "Checking $label"
  Refresh-CommonToolPaths

  if ($commandToCheck -and (Test-Command $commandToCheck)) {
    Write-Host "$label is already available: $(& $commandToCheck --version)"
    return
  }

  Write-Host "Installing $label with winget..."
  Invoke-CommandChecked "winget" @(
    "install",
    "-e",
    "--id",
    $id,
    "--accept-package-agreements",
    "--accept-source-agreements"
  )

  Refresh-CommonToolPaths
}

function Ensure-Prerequisites() {
  Write-Step "Checking prerequisites"
  Refresh-CommonToolPaths

  $nodeReady = (Test-Command "node") -and (Test-Command "npm")

  if ($nodeReady) {
    Write-Host "Node.js is already available."
    return
  }

  if (-not (Test-IsAdministrator)) {
    Restart-SelfAsAdministrator
  }

  if (-not (Test-Command "winget")) {
    throw "winget was not found. Install 'App Installer' from Microsoft Store, then run this file again."
  }

  Write-Host "winget: $(winget --version)"

  Install-WingetPackage "OpenJS.NodeJS.LTS" "Node.js LTS" "node"
  Refresh-CommonToolPaths
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

function Read-RequiredTextWithDefault($label, $currentValue) {
  while ($true) {
    $value = Read-TextWithDefault $label $currentValue

    if (-not [string]::IsNullOrWhiteSpace($value)) {
      return $value.Trim()
    }

    Write-Warning "Value cannot be empty."
  }
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

function Read-RequiredPasswordWithDefault($label, $currentValue) {
  $currentText = [string] $currentValue

  while ($true) {
    $password = Read-PasswordWithDefault $label $currentText

    if (-not [string]::IsNullOrWhiteSpace($password)) {
      return $password
    }

    Write-Warning "Password cannot be empty."
  }
}

function New-DefaultEnvContent() {
  $sessionSecret = New-RandomHex 32

  return @"
NODE_ENV=production

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=examlist_app
DB_PASSWORD=change-this-db-password
DB_NAME=examlist
DB_CONNECTION_LIMIT=10

EXAMLIST_AUTH_ENABLED=true
EXAMLIST_SESSION_SECRET=$sessionSecret
EXAMLIST_SESSION_TTL_HOURS=8
EXAMLIST_SESSION_COOKIE_SECURE=false
EXAMLIST_USERS_JSON=[]

PDF_BROWSER_PATH=

PDF_QUEUE_DRIVER=memory
PDF_QUEUE_MAX_ATTEMPTS=2
PDF_QUEUE_RETRY_DELAY_MS=5000
PDF_GENERATION_CHUNK_SIZE=500
PDF_RETENTION_DAYS=30
"@
}

function Configure-ServerEnvironment() {
  Write-Step "Configuring server access"
  Write-Host "By default, ExamList uses HTTP port 80 so users can open http://<server-ip> without typing a port."

  $useCustomPort = Read-Host "Q1. 서버 포트번호를 별도로 설정하시겠습니까? (예: Y / 아니오: N)"

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
    $serverPort = Read-TextWithDefault "Q1-1. 포트번호를 설정하세요" $currentPort
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

function Configure-DatabaseEnvironment() {
  Write-Step "Configuring database connection"
  Write-Host "DB_HOST is set automatically to '127.0.0.1'."
  Write-Host "DB_PORT is set automatically to '3306'."
  Write-Host "DB_NAME is set automatically to 'examlist'."

  $dbHost = "127.0.0.1"
  $dbPort = "3306"
  $dbUser = Read-RequiredTextWithDefault "Q2. DB USER ID를 설정하세요" (Read-EnvValue "DB_USER")
  $currentPassword = Read-EnvValue "DB_PASSWORD"

  if ($currentPassword -eq "change-this-db-password") {
    $currentPassword = ""
  }

  $dbPassword = Read-RequiredPasswordWithDefault "Q3. DB USER PASSWORD를 설정하세요" $currentPassword

  Set-EnvValue "DB_HOST" $dbHost
  Set-EnvValue "DB_PORT" $dbPort
  Set-EnvValue "DB_NAME" "examlist"
  Set-EnvValue "DB_USER" $dbUser
  Set-EnvValue "DB_PASSWORD" $dbPassword

  Write-Host "DB connection saved to .env."
  Write-Host "DB_HOST=$dbHost"
  Write-Host "DB_PORT=$dbPort"
  Write-Host "DB_NAME=examlist"
  Write-Host "DB_USER=$dbUser"
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

Ensure-Prerequisites

Write-Step "Checking required commands"

if (-not (Test-Command "node")) {
  throw "Node.js is not installed or node.exe is not in PATH."
}

if (-not (Test-Command "npm")) {
  throw "npm is not installed or npm.cmd is not in PATH."
}

Write-Host "Node: $(node -v)"
Write-Host "npm : $(npm -v)"

Write-Step "Preparing .env"

if (-not (Test-Path $envPath)) {
  Write-TextUtf8NoBom $envPath (New-DefaultEnvContent)
  Write-Host "Created .env."
} else {
  Write-Host ".env already exists. It will not be overwritten."
}

Configure-ServerEnvironment
Configure-DatabaseEnvironment

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

Write-Step "Configuring PDF queue mode"
Set-EnvValue "PDF_QUEUE_DRIVER" "memory"
Remove-EnvValue "REDIS_URL"
Remove-EnvValue "PDF_QUEUE_NAME"
Remove-EnvValue "PDF_QUEUE_CONCURRENCY"
Remove-EnvValue "PDF_QUEUE_PROCESS_IN_WEB"
Write-Host "PDF_QUEUE_DRIVER=memory was saved to .env. External queue settings were removed."

Write-Step "Preparing database schema"
Write-Host "Running npm run setup:db automatically. DB server and .env DB_* values must be ready."
Invoke-Checked "npm.cmd" "run setup:db"

Write-Step "Setup complete"
$serverPort = Resolve-ConfiguredServerPort
Write-Host "Local URL: $(Format-HttpUrl "localhost" $serverPort)"
Write-Host "Same-network URL: $(Format-HttpUrl "<server-ip>" $serverPort)"
Write-Host ""
Write-Host "Initial login account: admin / 1234"
Write-Host "Change this password after the first login."

Write-Host "Starting ExamList automatically. Press Ctrl+C in this window to stop it."
Push-Location $rootDir
try {
  & node server.js
} finally {
  Pop-Location
}

if ($script:transcriptStarted) {
  try {
    Stop-Transcript | Out-Null
  } catch {
  }
}
