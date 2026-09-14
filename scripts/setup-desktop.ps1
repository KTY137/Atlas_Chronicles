param(
  [switch]$SkipInstall,
  [switch]$SkipRuntime
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $root

function Test-ProjectRoot {
  if (-not (Test-Path (Join-Path $root "package.json"))) {
    throw "This script must be run from the Atlas_Chronicles repository root."
  }
}

function Invoke-CommandLine {
  param(
    [string]$Label,
    [string]$Exe,
    [string[]]$Arguments
  )
  Write-Host ""
  Write-Host "==> $Label" -ForegroundColor Cyan
  $command = Get-Command $Exe -ErrorAction Stop
  $proc = Start-Process -FilePath $command.Source -ArgumentList $Arguments -NoNewWindow -PassThru -Wait
  if ($proc.ExitCode -ne 0) {
    throw "$Label failed with exit code $($proc.ExitCode)."
  }
}

$runtimeDir = Join-Path $root ".local\desktop-runtime"
$archive = "postgresql-17.11-1-windows-x64-binaries.zip"
$archivePath = Join-Path $runtimeDir $archive
$expectedHash = "6eabdf00d2893713b75db4336a23c3fdf505f056e217ec6e2e95d901750cfea3"
$archiveUrl = "https://get.enterprisedb.com/postgresql/$archive"

function Ensure-RuntimeArchive {
  if (-not (Test-Path $runtimeDir)) {
    New-Item -ItemType Directory -Path $runtimeDir | Out-Null
  }

  Write-Host ""
  Write-Host "==> Prepare PostgreSQL runtime archive" -ForegroundColor Cyan
  if (-not (Test-Path $archivePath)) {
    Write-Host "Downloading $archive..."
    Invoke-WebRequest -Uri $archiveUrl -OutFile $archivePath
  }

  $actualHash = (Get-FileHash -Path $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actualHash -ne $expectedHash) {
    throw "SHA256 mismatch for PostgreSQL archive. Expected $expectedHash, got $actualHash."
  }

  $pgsql = Join-Path $runtimeDir "pgsql"
  if (Test-Path $pgsql) {
    Remove-Item -Recurse -Force $pgsql
  }
  New-Item -ItemType Directory -Path $pgsql | Out-Null

  Write-Host "Extracting archive into .local\desktop-runtime..."
  Expand-Archive -Path $archivePath -DestinationPath $runtimeDir -Force
  if (-not (Test-Path $pgsql)) {
    throw "Could not extract PostgreSQL runtime folder to $pgsql."
  }
}

try {
  Test-ProjectRoot

  if (-not $SkipInstall) {
    Invoke-CommandLine "Install dependencies (npm install)" "npm.cmd" @("install")
  }

  Invoke-CommandLine "Install Electron binary (node_modules/electron/install.js)" "node" @("node_modules/electron/install.js")

  if (-not $SkipRuntime) {
    Ensure-RuntimeArchive
    Invoke-CommandLine "Prepare runtime manifest" "node" @("packages/desktop/tools/prepare-runtime.mjs")
  }

  Invoke-CommandLine "Build client bundle" "npm.cmd" @("run","build")
  Invoke-CommandLine "Build desktop package" "npm.cmd" @("run","desktop:build")
  Invoke-CommandLine "Package unpacked desktop app" "node" @("packages/desktop/tools/package.mjs")
  Invoke-CommandLine "Create unsigned installer" "node" @("packages/desktop/tools/installer.mjs")

  Write-Host ""
  $artifacts = Join-Path $root ".local\desktop-artifacts"
  $latest = Get-ChildItem $artifacts -Directory | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($null -ne $latest) {
    $installer = Join-Path $latest.FullName "installer\Atlas-Chronicles-Setup.exe"
    if (Test-Path $installer) {
      Write-Host "Setup created: $installer" -ForegroundColor Green
    } else {
      Write-Host "No installer file found in latest artifact folder: $($latest.FullName)\installer" -ForegroundColor Yellow
    }
  } else {
    Write-Host "Could not find .local\desktop-artifacts folder." -ForegroundColor Yellow
  }
}
catch {
  Write-Host ""
  Write-Host "Setup failed: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
