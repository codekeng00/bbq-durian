param(
  [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

if (-not (Test-Path "node_modules")) {
  Write-Host "Installing dependencies..."
  & npm.cmd install
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "Building DealMaker..."
& npm.cmd run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Preparing the local D1 database..."
& npx.cmd wrangler d1 migrations apply DB --local
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if ($CheckOnly) {
  Write-Host "Demo mode is ready."
  exit 0
}

Write-Host ""
Write-Host "Starting Demo mode at http://127.0.0.1:8787"
Write-Host "Press Ctrl+C to stop."
& npx.cmd wrangler dev --local --port 8787 `
  --var "DEV_AUTH_ENABLED:true"
exit $LASTEXITCODE
