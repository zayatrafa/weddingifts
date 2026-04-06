@echo off
setlocal EnableExtensions

set "OFFICIAL_ROOT=C:\Users\rafae\Documents\Projetos\Weddingifts"
set "API_DIR=%OFFICIAL_ROOT%\Weddingifts.Api"
set "WEB_DIR=%OFFICIAL_ROOT%\Weddingifts-web"

echo ==========================================
echo Weddingifts - Execucao Oficial
echo ROOT: %OFFICIAL_ROOT%
echo ==========================================

if not exist "%OFFICIAL_ROOT%\.git" (
  echo [ERRO] Repositorio nao encontrado em: %OFFICIAL_ROOT%
  pause
  exit /b 1
)

if not exist "%API_DIR%\Weddingifts.Api.csproj" (
  echo [ERRO] Projeto da API nao encontrado em: %API_DIR%
  pause
  exit /b 1
)

if not exist "%WEB_DIR%" (
  echo [ERRO] Pasta do frontend nao encontrada em: %WEB_DIR%
  pause
  exit /b 1
)

where dotnet >nul 2>nul
if errorlevel 1 (
  echo [ERRO] dotnet nao encontrado no PATH.
  pause
  exit /b 1
)

set "PY_CMD=py"
where py >nul 2>nul
if errorlevel 1 (
  where python >nul 2>nul
  if errorlevel 1 (
    echo [ERRO] Nem 'py' nem 'python' foram encontrados no PATH.
    pause
    exit /b 1
  )
  set "PY_CMD=python"
)

echo Encerrando processos antigos (portas 5298 e 5500)...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":5298" ^| findstr "LISTENING"') do taskkill /PID %%P /F >nul 2>nul
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":5500" ^| findstr "LISTENING"') do taskkill /PID %%P /F >nul 2>nul

echo Iniciando backend...
start "Weddingifts API (OFICIAL)" /D "%API_DIR%" cmd /k "dotnet run --project Weddingifts.Api.csproj --urls http://localhost:5298"

echo Iniciando frontend...
start "Weddingifts Web (OFICIAL)" /D "%WEB_DIR%" cmd /k "%PY_CMD% -m http.server 5500"

timeout /t 4 /nobreak >nul

echo Abrindo navegador...
start "" "http://localhost:5500"

echo.
echo OK. Se algo falhar, veja as duas janelas abertas:
echo - Weddingifts API (OFICIAL)
echo - Weddingifts Web (OFICIAL)
echo.
pause
endlocal
