param(
  [switch]$Foreground
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

$existing = Get-CimInstance Win32_Process |
  Where-Object { $_.CommandLine -like "*scripts/band-runtime.mjs*" }

if ($existing) {
  Write-Host "Band agent runtime is already running."
  exit 0
}

if ($Foreground) {
  & node.exe scripts/band-runtime.mjs
  exit $LASTEXITCODE
}

$stdout = Join-Path $projectRoot ".band-runtime.stdout.log"
$stderr = Join-Path $projectRoot ".band-runtime.stderr.log"
Remove-Item $stdout, $stderr -ErrorAction SilentlyContinue

$process = Start-Process `
  -FilePath "node.exe" `
  -ArgumentList @("scripts/band-runtime.mjs") `
  -WorkingDirectory $projectRoot `
  -WindowStyle Hidden `
  -RedirectStandardOutput $stdout `
  -RedirectStandardError $stderr `
  -PassThru

Start-Sleep -Seconds 8
if ($process.HasExited) {
  Get-Content $stdout, $stderr -ErrorAction SilentlyContinue
  Write-Error "Band agent runtime failed to start."
}

Write-Host "Band agent runtime started in the background (PID $($process.Id))."
Write-Host "Logs: $stdout"
