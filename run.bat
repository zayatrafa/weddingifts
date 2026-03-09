@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"
set "API_DIR=%ROOT%Weddingifts.Api"
set "WEB_DIR=%ROOT%Weddingifts-web"
set "SLUG=62b74666"

if not exist "%API_DIR%" (
  echo [ERRO] Pasta da API nao encontrada: %API_DIR%
  pause
  exit /b 1
)

if not exist "%WEB_DIR%" (
  echo [ERRO] Pasta do front nao encontrada: %WEB_DIR%
  pause
  exit /b 1
)

echo Encerrando processos antigos...
taskkill /IM Weddingifts.Api.exe /F >nul 2>nul
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":5298" ^| findstr "LISTENING"') do (
  taskkill /PID %%P /F >nul 2>nul
)
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":5500" ^| findstr "LISTENING"') do (
  taskkill /PID %%P /F >nul 2>nul
)

echo Iniciando backend...
start "Weddingifts API" cmd /k "cd /d ""%API_DIR%"" && dotnet run"

echo Iniciando frontend estatico...
start "Weddingifts Web" cmd /k "cd /d ""%WEB_DIR%"" && py -m http.server 5500"

echo Aguardando servicos subirem...
timeout /t 6 /nobreak >nul

echo Abrindo navegador...
start "" "http://localhost:5500/?slug=%SLUG%"

echo.
echo Projeto iniciado.
echo - API: http://localhost:5298
echo - WEB: http://localhost:5500
echo - URL aberta: http://localhost:5500/?slug=%SLUG%
echo.
echo Para parar: feche as janelas "Weddingifts API" e "Weddingifts Web".

endlocal
