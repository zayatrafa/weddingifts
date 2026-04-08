param(
    [string]$Slug = "",
    [switch]$ForceRestart = $true
)

function Stop-ProcessByPort {
    param([int]$Port)

    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop
        foreach ($connection in $connections) {
            $pid = $connection.OwningProcess
            if ($pid -and $pid -ne $PID) {
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            }
        }
    } catch {
        # Port not in use or no permission to inspect; continue.
    }
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$apiPath = Join-Path $root "Weddingifts.Api"
$webPath = Join-Path $root "Weddingifts-web"

if (!(Test-Path $apiPath)) {
    Write-Error "Pasta da API nao encontrada: $apiPath"
    exit 1
}

if (!(Test-Path $webPath)) {
    Write-Error "Pasta do front nao encontrada: $webPath"
    exit 1
}

if ($ForceRestart) {
    Stop-ProcessByPort -Port 5298
    Stop-ProcessByPort -Port 5500
    Start-Sleep -Seconds 1
}

$apiCommand = "Set-Location '$apiPath'; dotnet run --urls http://0.0.0.0:5298"
$webCommand = "Set-Location '$webPath'; py -m http.server 5500 --bind 0.0.0.0"

$apiProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", $apiCommand -PassThru
$webProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", $webCommand -PassThru

Start-Sleep -Seconds 5

$url = "http://localhost:5500"
if ($Slug) {
    $escapedSlug = [System.Uri]::EscapeDataString($Slug)
    $url = "$url/?slug=$escapedSlug"
}

Start-Process $url

$lanIp = (
    Get-NetIPAddress -AddressFamily IPv4 -PrefixOrigin Dhcp -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notlike "169.254.*" } |
    Select-Object -First 1 -ExpandProperty IPAddress
)

if (-not $lanIp) {
    $lanIp = (
        Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object { $_.IPAddress -notlike "169.254.*" -and $_.IPAddress -ne "127.0.0.1" } |
        Select-Object -First 1 -ExpandProperty IPAddress
    )
}

Write-Host "API PID: $($apiProcess.Id)"
Write-Host "WEB PID: $($webProcess.Id)"
Write-Host "Navegador aberto em: $url"
if ($lanIp) {
    Write-Host "Acesso pelo celular (mesma rede Wi-Fi): http://$lanIp`:5500"
}
Write-Host "Para parar, feche as duas janelas do PowerShell que foram abertas."
