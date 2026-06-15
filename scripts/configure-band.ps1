param(
  [string]$ConfigPath = "band-agents.local.json",
  [switch]$NoDeploy
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

$resolvedPath = Join-Path $projectRoot $ConfigPath
if (-not (Test-Path $resolvedPath)) {
  Write-Error "Band configuration file not found: $resolvedPath"
}

try {
  $config = Get-Content $resolvedPath -Raw | ConvertFrom-Json
} catch {
  Write-Error "Band configuration must contain valid JSON."
}

$requiredAgents = @(
  "sales_parser",
  "sales_enrichment",
  "sales_construction",
  "sales_validation",
  "business_parser",
  "business_evaluation",
  "business_judgment"
)

$errors = @()
foreach ($agentName in $requiredAgents) {
  $agent = $config.$agentName
  if ($null -eq $agent) {
    $errors += "$agentName is missing"
    continue
  }

  foreach ($field in @("id", "key", "name", "handle")) {
    $value = [string]$agent.$field
    if ([string]::IsNullOrWhiteSpace($value) -or $value.StartsWith("PASTE_")) {
      $errors += "$agentName.$field is empty"
    }
  }
}

if ($errors.Count -gt 0) {
  Write-Host "Complete these fields in ${ConfigPath}:"
  $errors | ForEach-Object { Write-Host "  - $_" }
  exit 1
}

$compactJson = $config | ConvertTo-Json -Depth 6 -Compress
Write-Host "Uploading BAND_AGENTS_JSON to Cloudflare Worker..."
$compactJson | npx.cmd wrangler secret put BAND_AGENTS_JSON
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not $NoDeploy) {
  Write-Host "Deploying dealmaker-web..."
  npx.cmd wrangler deploy
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "Band configuration uploaded successfully."
