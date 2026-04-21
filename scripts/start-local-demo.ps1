$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$panel = Join-Path $root "panel"
$logs = Join-Path $root ".local-demo"

New-Item -ItemType Directory -Force -Path $logs | Out-Null

function Test-PortOpen {
  param([int]$Port)
  $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  return $null -ne $conn
}

function Start-DemoProcess {
  param(
    [string]$Name,
    [string]$WorkingDirectory,
    [string]$Command,
    [string]$LogName
  )

  $logPath = Join-Path $logs $LogName
  $quotedDir = $WorkingDirectory.Replace("'", "''")
  $quotedLog = $logPath.Replace("'", "''")
  $script = "Set-Location '$quotedDir'; $Command *>&1 | Tee-Object -FilePath '$quotedLog'"

  $process = Start-Process powershell `
    -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", $script `
    -PassThru

  Write-Host "$Name iniciado. PID: $($process.Id). Log: $logPath"
}

if (Test-PortOpen 3000) {
  Write-Host "Backend ya esta escuchando en http://localhost:3000"
} else {
  Start-DemoProcess -Name "Backend BotVentas" -WorkingDirectory $root -Command "npm run dev" -LogName "backend.log"
}

if (Test-PortOpen 3001) {
  Write-Host "Panel ya esta escuchando en http://localhost:3001"
} else {
  Start-DemoProcess -Name "Panel CRM" -WorkingDirectory $panel -Command "npm run build; npx next start -p 3001" -LogName "panel.log"
}

Write-Host ""
Write-Host "URLs locales:"
Write-Host "- Backend health: http://localhost:3000/crm/health"
Write-Host "- Panel CRM:      http://localhost:3001"
Write-Host "- Contactos:      http://localhost:3001/contactos"
Write-Host "- Conversaciones: http://localhost:3001/conversaciones"
Write-Host "- Configuracion:  http://localhost:3001/configuracion"
Write-Host ""
Write-Host "Cuando arranquen, prueba:"
Write-Host "node scripts/demo-crm-local.js"
