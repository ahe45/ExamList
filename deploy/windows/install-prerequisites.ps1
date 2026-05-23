$ErrorActionPreference = "Stop"

$script:rebootRequired = $false

function Write-Step($message) {
  Write-Host ""
  Write-Host "==> $message"
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
  Add-PathIfExists (Join-Path $env:ProgramFiles "Docker\Docker\resources\bin")
}

function Invoke-CommandChecked($file, [string[]] $arguments) {
  Write-Host "> $file $($arguments -join ' ')"
  & $file @arguments
  $exitCode = $LASTEXITCODE

  if ($exitCode -ne 0) {
    throw "$file failed with exit code $exitCode."
  }
}

function Enable-FeatureIfNeeded($featureName, $label) {
  Write-Step "Checking Windows feature: $label"

  $feature = Get-WindowsOptionalFeature -Online -FeatureName $featureName -ErrorAction SilentlyContinue

  if (-not $feature) {
    Write-Warning "Windows feature was not found: $featureName"
    return
  }

  if ($feature.State -eq "Enabled") {
    Write-Host "$label is already enabled."
    return
  }

  $result = Enable-WindowsOptionalFeature -Online -FeatureName $featureName -All -NoRestart -ErrorAction Stop
  Write-Host "$label was enabled."

  if ($result.RestartNeeded) {
    $script:rebootRequired = $true
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

function Test-DockerDesktopInstalled() {
  $desktopPath = Join-Path $env:ProgramFiles "Docker\Docker\Docker Desktop.exe"
  $dockerCliPath = Join-Path $env:ProgramFiles "Docker\Docker\resources\bin\docker.exe"

  return (Test-Path $desktopPath) -or (Test-Path $dockerCliPath) -or (Test-Command "docker")
}

function Install-DockerDesktop() {
  Write-Step "Checking Docker Desktop"
  Refresh-CommonToolPaths

  if (Test-DockerDesktopInstalled) {
    Write-Host "Docker Desktop is already installed."
    return
  }

  Write-Host "Installing Docker Desktop with winget..."
  Invoke-CommandChecked "winget" @(
    "install",
    "-e",
    "--id",
    "Docker.DockerDesktop",
    "--accept-package-agreements",
    "--accept-source-agreements"
  )

  Refresh-CommonToolPaths
}

function Try-UpdateWsl() {
  Write-Step "Checking WSL"

  if (-not (Test-Command "wsl")) {
    Write-Warning "wsl.exe was not found. Docker Desktop may finish WSL setup on first launch."
    return
  }

  try {
    & wsl --update
    if ($LASTEXITCODE -eq 3010) {
      $script:rebootRequired = $true
    }
  } catch {
    Write-Warning "WSL update was skipped: $($_.Exception.Message)"
  }
}

function Start-DockerDesktopIfPossible() {
  Write-Step "Docker Desktop first launch"

  if ($script:rebootRequired) {
    Write-Host "A reboot is required before Docker Desktop can be started reliably."
    return
  }

  $desktopPath = Join-Path $env:ProgramFiles "Docker\Docker\Docker Desktop.exe"

  if (-not (Test-Path $desktopPath)) {
    Write-Warning "Docker Desktop executable was not found after installation."
    return
  }

  $startNow = Read-Host "Start Docker Desktop now? First launch may show a license or setup screen. [Y/n]"

  if ($startNow.Trim().ToLowerInvariant() -eq "n") {
    Write-Host "Start Docker Desktop manually before running setup-windows.bat."
    return
  }

  Start-Process -FilePath $desktopPath | Out-Null
  Write-Host "Docker Desktop is starting. Complete any first-run prompts in its window."
}

Write-Step "Checking winget"

if (-not (Test-Command "winget")) {
  throw "winget was not found. Install 'App Installer' from Microsoft Store, then run this file again."
}

Write-Host "winget: $(winget --version)"

Enable-FeatureIfNeeded "Microsoft-Windows-Subsystem-Linux" "Windows Subsystem for Linux"
Enable-FeatureIfNeeded "VirtualMachinePlatform" "Virtual Machine Platform"

Install-WingetPackage "OpenJS.NodeJS.LTS" "Node.js LTS" "node"
Install-DockerDesktop
Try-UpdateWsl
Start-DockerDesktopIfPossible

Write-Step "Result"
Refresh-CommonToolPaths

if (Test-Command "node") {
  Write-Host "Node.js: $(node -v)"
} else {
  Write-Warning "Node.js was installed, but node.exe is not visible in this terminal yet. Open a new terminal after reboot/sign-out."
}

if (Test-Command "npm") {
  Write-Host "npm: $(npm -v)"
} else {
  Write-Warning "npm is not visible in this terminal yet. Open a new terminal after reboot/sign-out."
}

if (Test-DockerDesktopInstalled) {
  Write-Host "Docker Desktop: installed"
} else {
  Write-Warning "Docker Desktop was not detected."
}

if ($script:rebootRequired) {
  Write-Host ""
  Write-Host "A Windows reboot is required. Reboot, start Docker Desktop once, then run deploy\windows\setup-windows.bat."
} else {
  Write-Host ""
  Write-Host "Next step: run deploy\windows\setup-windows.bat after DB installation/account setup."
}
