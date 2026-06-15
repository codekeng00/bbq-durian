param(
  [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

$wranglerConfig = Get-Content "wrangler.jsonc" -Raw
if ($wranglerConfig.Contains("REPLACE_WITH_D1_DATABASE_ID")) {
  Write-Error @"
Cloudflare mode is not configured yet.

Run:
  npx wrangler login
  npx wrangler d1 create dealmaker
  npx wrangler vectorize create dealmaker-knowledge --dimensions=384 --metric=cosine

Then replace REPLACE_WITH_D1_DATABASE_ID in wrangler.jsonc with the returned D1 ID.
See README.md for secrets and Band agent setup.
"@
}

Write-Host "Checking Cloudflare authentication..."
& npx.cmd wrangler whoami
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if ($CheckOnly) {
  Write-Host "Cloudflare mode configuration is ready."
  exit 0
}

Write-Host "Building DealMaker..."
& npm.cmd run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Applying remote D1 migrations..."
& npx.cmd wrangler d1 migrations apply DB --remote
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Deploying DealMaker to Cloudflare..."
& npx.cmd wrangler deploy
exit $LASTEXITCODE
