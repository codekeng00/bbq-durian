$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "DealMaker run mode"
Write-Host "1. Demo mode       - Local Worker, local D1, no cloud credentials required"
Write-Host "2. Cloudflare mode - Remote D1/Vectorize and public Cloudflare deployment"
Write-Host ""

$choice = Read-Host "Choose 1 or 2"

switch ($choice) {
  "1" {
    & "$PSScriptRoot\run-demo.ps1"
  }
  "2" {
    & "$PSScriptRoot\run-cloudflare.ps1"
  }
  default {
    Write-Error "Invalid choice. Run npm start again and choose 1 or 2."
  }
}
