$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$apiPath = Join-Path $root "Weddingifts.Api"
$webPath = Join-Path $root "Weddingifts-web"
$apiConfigPath = Join-Path $webPath "js\api-config.js"
$apiDllPath = Join-Path $apiPath "bin\Debug\net8.0\Weddingifts.Api.dll"
$tmpPath = Join-Path $root ".codex_tmp_tunnel"

$backendPort = 5498
$frontendPort = 5700
$launched = New-Object System.Collections.Generic.List[System.Diagnostics.Process]
$exitCode = 0

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Assert-Command {
    param([string]$CommandName, [string]$InstallHint)

    if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
        throw "$CommandName nao encontrado no PATH. $InstallHint"
    }
}

function Resolve-PythonCommand {
    if (Get-Command py -ErrorAction SilentlyContinue) {
        return @{ FileName = "py"; Arguments = @("-m", "http.server", "$frontendPort") }
    }

    if (Get-Command python -ErrorAction SilentlyContinue) {
        return @{ FileName = "python"; Arguments = @("-m", "http.server", "$frontendPort") }
    }

    throw "Nem 'py' nem 'python' foram encontrados no PATH."
}

function Stop-ProcessByPort {
    param([int]$Port)

    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop
        foreach ($connection in $connections) {
            $processId = $connection.OwningProcess
            if ($processId -and $processId -ne $PID) {
                Write-Host "Encerrando processo antigo na porta $Port (PID $processId)..."
                Stop-ProcessTree -ProcessId $processId
            }
        }
    } catch {
        # Porta livre ou sem permissao para inspecionar.
    }
}

function Stop-ProcessTree {
    param([int]$ProcessId)

    if (-not $ProcessId -or $ProcessId -eq $PID) {
        return
    }

    try {
        & taskkill.exe /PID $ProcessId /T /F | Out-Null
    } catch {
        Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
    }
}

function Write-LocalApiConfig {
    Set-Content -Path $apiConfigPath -Encoding UTF8 -Value @'
if (typeof window !== "undefined") {
  window.WEDDINGIFTS_API_BASE_URL = "";
}
'@
}

function Write-TunnelApiConfig {
    param([string]$BackendUrl)

    Set-Content -Path $apiConfigPath -Encoding UTF8 -Value @"
if (typeof window !== "undefined") {
  window.WEDDINGIFTS_API_BASE_URL = "$BackendUrl";
}
"@
}

function Start-LoggedProcess {
    param(
        [string]$Name,
        [string]$FileName,
        [string[]]$Arguments,
        [string]$WorkingDirectory,
        [hashtable]$Environment = @{}
    )

    $stdout = Join-Path $tmpPath "$Name.out.log"
    $stderr = Join-Path $tmpPath "$Name.err.log"
    Remove-Item -LiteralPath $stdout, $stderr -Force -ErrorAction SilentlyContinue

    $envPrefix = ""
    foreach ($key in $Environment.Keys) {
        $value = [string]$Environment[$key]
        $envPrefix += "`$env:$key = '$($value.Replace("'", "''"))'; "
    }

    $command = $envPrefix + "& " + (ConvertTo-PowerShellArgument $FileName)
    foreach ($argument in $Arguments) {
        $command += " " + (ConvertTo-PowerShellArgument $argument)
    }

    $process = Start-Process `
        -FilePath "powershell" `
        -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $command) `
        -WorkingDirectory $WorkingDirectory `
        -RedirectStandardOutput $stdout `
        -RedirectStandardError $stderr `
        -WindowStyle Hidden `
        -PassThru

    $process | Add-Member -NotePropertyName TunnelName -NotePropertyValue $Name
    $process | Add-Member -NotePropertyName StdoutLog -NotePropertyValue $stdout
    $process | Add-Member -NotePropertyName StderrLog -NotePropertyValue $stderr
    [void]$launched.Add($process)

    return $process
}

function ConvertTo-PowerShellArgument {
    param([string]$Argument)

    if ($null -eq $Argument) {
        return '""'
    }

    return "'" + $Argument.Replace("'", "''") + "'"
}

function Get-CombinedLog {
    param([System.Diagnostics.Process]$Process)

    $parts = @()
    if (Test-Path $Process.StdoutLog) {
        $parts += Get-Content -Raw -LiteralPath $Process.StdoutLog
    }
    if (Test-Path $Process.StderrLog) {
        $parts += Get-Content -Raw -LiteralPath $Process.StderrLog
    }
    return ($parts -join "`n")
}

function Wait-ForHttpOk {
    param([string]$Url, [string]$Name, [System.Diagnostics.Process]$Process, [int]$TimeoutSeconds = 90)

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if ($Process.HasExited) {
            throw "$Name encerrou antes de ficar pronto.`n$(Get-CombinedLog $Process)"
        }

        try {
            $response = Invoke-WebRequest $Url -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
                Write-Host "$Name pronto: $Url" -ForegroundColor Green
                return
            }
        } catch {
            Start-Sleep -Seconds 1
        }
    }

    throw "Tempo esgotado aguardando $Name em $Url.`n$(Get-CombinedLog $Process)"
}

function Wait-ForTunnelUrl {
    param([System.Diagnostics.Process]$Process, [string]$Name, [int]$TimeoutSeconds = 90)

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    $pattern = 'https://[a-z0-9-]+\.trycloudflare\.com'

    while ((Get-Date) -lt $deadline) {
        if ($Process.HasExited) {
            throw "$Name encerrou antes de gerar URL.`n$(Get-CombinedLog $Process)"
        }

        $log = Get-CombinedLog $Process
        $match = [regex]::Match($log, $pattern)
        if ($match.Success) {
            Write-Host "$Name URL: $($match.Value)" -ForegroundColor Green
            return $match.Value
        }

        Start-Sleep -Seconds 1
    }

    throw "Tempo esgotado aguardando URL do $Name.`n$(Get-CombinedLog $Process)"
}

function Stop-LaunchedProcesses {
    foreach ($process in @($launched.ToArray() | Sort-Object Id -Descending)) {
        if ($process -and -not $process.HasExited) {
            try {
                Write-Host "Encerrando $($process.TunnelName) (PID $($process.Id))..."
                Stop-ProcessTree -ProcessId $process.Id
            } catch {
                # Ignora falhas de encerramento.
            }
        }
    }
}

try {
    Write-Step "Validando dependencias"
    if (-not (Test-Path (Join-Path $apiPath "Weddingifts.Api.csproj"))) {
        throw "Projeto da API nao encontrado em $apiPath."
    }
    if (-not (Test-Path $apiConfigPath)) {
        throw "Arquivo api-config.js nao encontrado em $apiConfigPath."
    }

    Assert-Command "dotnet" "Instale o .NET SDK."
    Assert-Command "cloudflared" "Instale com: winget install --id Cloudflare.cloudflared"
    $python = Resolve-PythonCommand

    New-Item -ItemType Directory -Force -Path $tmpPath | Out-Null

    Write-Step "Limpando portas locais e resetando configuracao local"
    Stop-ProcessByPort -Port $backendPort
    Stop-ProcessByPort -Port $frontendPort
    Write-LocalApiConfig

    Write-Step "Compilando backend"
    & dotnet build (Join-Path $apiPath "Weddingifts.Api.csproj")
    if ($LASTEXITCODE -ne 0) {
        throw "dotnet build falhou com codigo $LASTEXITCODE."
    }

    Write-Step "Subindo backend local para gerar tunel da API"
    $backend = Start-LoggedProcess `
        -Name "backend" `
        -FileName "dotnet" `
        -Arguments @($apiDllPath, "--urls", "http://localhost:$backendPort") `
        -WorkingDirectory $apiPath `
        -Environment @{ ASPNETCORE_ENVIRONMENT = "Development" }

    Wait-ForHttpOk -Url "http://localhost:$backendPort/swagger/index.html" -Name "Backend" -Process $backend

    Write-Step "Abrindo tunel do backend"
    $backendTunnel = Start-LoggedProcess `
        -Name "backend-tunnel" `
        -FileName "cloudflared" `
        -Arguments @("tunnel", "--url", "http://localhost:$backendPort") `
        -WorkingDirectory $root

    $backendUrl = Wait-ForTunnelUrl -Process $backendTunnel -Name "Tunel do backend"
    Write-TunnelApiConfig -BackendUrl $backendUrl

    Write-Step "Subindo frontend local ja apontando para o backend publico"
    $frontend = Start-LoggedProcess `
        -Name "frontend" `
        -FileName $python.FileName `
        -Arguments $python.Arguments `
        -WorkingDirectory $webPath

    Wait-ForHttpOk -Url "http://localhost:$frontendPort/login.html" -Name "Frontend" -Process $frontend

    Write-Step "Abrindo tunel do frontend"
    $frontendTunnel = Start-LoggedProcess `
        -Name "frontend-tunnel" `
        -FileName "cloudflared" `
        -Arguments @("tunnel", "--url", "http://localhost:$frontendPort") `
        -WorkingDirectory $root

    $frontendUrl = Wait-ForTunnelUrl -Process $frontendTunnel -Name "Tunel do frontend"

    Write-Step "Reiniciando backend com CORS liberado para o frontend publico"
    if (-not $backend.HasExited) {
        Stop-ProcessTree -ProcessId $backend.Id
        Start-Sleep -Seconds 2
    }

    $allowedOrigins = "http://localhost:$frontendPort,http://127.0.0.1:$frontendPort,$frontendUrl"
    $backend = Start-LoggedProcess `
        -Name "backend-cors" `
        -FileName "dotnet" `
        -Arguments @($apiDllPath, "--urls", "http://localhost:$backendPort") `
        -WorkingDirectory $apiPath `
        -Environment @{
            ASPNETCORE_ENVIRONMENT = "Development"
            ALLOWED_ORIGINS = $allowedOrigins
        }

    Wait-ForHttpOk -Url "http://localhost:$backendPort/swagger/index.html" -Name "Backend com CORS" -Process $backend

    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host "LINK PUBLICO PARA COMPARTILHAR:" -ForegroundColor Green
    Write-Host $frontendUrl -ForegroundColor Yellow
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "URL publica do backend configurada localmente em api-config.js:"
    Write-Host $backendUrl -ForegroundColor DarkYellow
    Write-Host ""
    Write-Host "Mantenha esta janela aberta enquanto as pessoas estiverem testando."
    Write-Host "Quando terminar, pressione ENTER aqui para encerrar tudo e voltar api-config.js para local."
    Read-Host | Out-Null
}
catch {
    $exitCode = 1
    Write-Host ""
    Write-Host "[ERRO] Falha ao iniciar tunnel publico:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Logs em: $tmpPath"
    Write-Host ""
}
finally {
    Write-Step "Encerrando processos e voltando api-config.js para local"
    Stop-LaunchedProcesses
    if (Test-Path $apiConfigPath) {
        Write-LocalApiConfig
    }
}

exit $exitCode
