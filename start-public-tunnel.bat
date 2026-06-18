@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"
set "SCRIPT=%ROOT%start-public-tunnel.ps1"

if not exist "%SCRIPT%" (
  echo [ERRO] Script auxiliar nao encontrado: %SCRIPT%
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%"
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo [ERRO] O tunel publico terminou com erro. Codigo: %EXIT_CODE%
  pause
)

endlocal
exit /b %EXIT_CODE%
