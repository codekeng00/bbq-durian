$ErrorActionPreference = "Stop"

$processes = Get-CimInstance Win32_Process |
  Where-Object { $_.CommandLine -like "*scripts/band-runtime.mjs*" }

if (-not $processes) {
  Write-Host "Band agent runtime is not running."
  exit 0
}

foreach ($process in $processes) {
  Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
}

Write-Host "Band agent runtime stopped."
