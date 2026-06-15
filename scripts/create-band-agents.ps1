param(
  [string]$UserKeyPath = "band-user-key.local.txt",
  [string]$OutputPath = "band-agents.local.json",
  [switch]$ConfigureCloudflare
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

$keyFile = Join-Path $projectRoot $UserKeyPath
if (-not (Test-Path $keyFile)) {
  Write-Error "Band user API key file not found: $keyFile"
}

$userApiKey = (Get-Content $keyFile -Raw).Trim()
if (
  [string]::IsNullOrWhiteSpace($userApiKey) -or
  $userApiKey -eq "PASTE_YOUR_BAND_USER_API_KEY_HERE"
) {
  Write-Error @"
Add your Band user API key to $UserKeyPath.

Create or copy it from:
  https://app.band.ai/users/settings

It should be a user key, normally beginning with thnv_u_.
"@
}

$definitions = [ordered]@{
  sales_parser = @{
    name = "Sales Parsing Agent"
    handle = "sales.parser"
    description = "Extracts customer intent, deal facts, requirements, quantities, dates, value, and decision makers from sales conversations."
  }
  sales_enrichment = @{
    name = "Sales Enrichment Agent"
    handle = "sales.enrichment"
    description = "Retrieves product, pricing, inventory, and commercial policy context for a parsed sales opportunity."
  }
  sales_construction = @{
    name = "Sales Construction Agent"
    handle = "sales.construction"
    description = "Constructs a tailored proposal email from structured deal facts and retrieved enterprise knowledge."
  }
  sales_validation = @{
    name = "Sales Validation Agent"
    handle = "sales.validation"
    description = "Reviews proposal drafts for completeness, formatting, policy compliance, sensitive data, and unsupported promises."
  }
  business_parser = @{
    name = "Business Parsing Agent"
    handle = "business.parser"
    description = "Transforms submitted proposal emails into structured commercial terms, clauses, obligations, and requested metrics."
  }
  business_evaluation = @{
    name = "Business Evaluation Agent"
    handle = "business.evaluation"
    description = "Uses enterprise policy and RAG context to score proposal risk, profitability, compliance, and priority."
  }
  business_judgment = @{
    name = "Business Judgment Agent"
    handle = "business.judgment"
    description = "Combines business evaluation scores into an explainable approve or reject recommendation for human review."
  }
}

$headers = @{
  "X-API-Key" = $userApiKey
  "Content-Type" = "application/json"
}

try {
  $profile = Invoke-RestMethod `
    -Uri "https://app.band.ai/api/v1/me/profile" `
    -Method Get `
    -Headers $headers
  Write-Host "Authenticated with Band."
} catch {
  Write-Error "Band rejected the user API key. Copy a current user key from https://app.band.ai/users/settings."
}

$output = [ordered]@{}
foreach ($entry in $definitions.GetEnumerator()) {
  $agentKey = $entry.Key
  $definition = $entry.Value
  Write-Host "Registering $($definition.name)..."

  $body = @{
    agent = @{
      name = $definition.name
      description = $definition.description
    }
  } | ConvertTo-Json -Depth 4

  try {
    $response = Invoke-RestMethod `
      -Uri "https://app.band.ai/api/v1/me/agents/register" `
      -Method Post `
      -Headers $headers `
      -Body $body
  } catch {
    Write-Error "Failed while registering $($definition.name): $($_.Exception.Message)"
  }

  $agent = $response.data.agent
  $apiKey = [string]$response.data.credentials.api_key
  if ([string]::IsNullOrWhiteSpace([string]$agent.id) -or [string]::IsNullOrWhiteSpace($apiKey)) {
    Write-Error "Band did not return credentials for $($definition.name). Stop now to avoid losing a one-time key."
  }

  $output[$agentKey] = [ordered]@{
    id = [string]$agent.id
    key = $apiKey
    name = [string]$agent.name
    handle = [string]$definition.handle
  }

  # Save after every registration because Band only returns each API key once.
  $output | ConvertTo-Json -Depth 6 | Set-Content `
    -LiteralPath (Join-Path $projectRoot $OutputPath) `
    -Encoding UTF8
}

Write-Host ""
Write-Host "Created all seven agents and saved their credentials to $OutputPath."

if ($ConfigureCloudflare) {
  & "$PSScriptRoot\configure-band.ps1" -ConfigPath $OutputPath
  exit $LASTEXITCODE
}

Write-Host "Next command:"
Write-Host "  npm run band:configure"
