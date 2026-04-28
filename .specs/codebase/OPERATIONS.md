# Operations

**Analyzed:** 2026-04-27

## Prerequisites

- Windows with PowerShell or CMD.
- .NET SDK 8.
- Python with `http.server`.
- PostgreSQL for full manual development.
- Node.js 18+ for frontend smoke tooling.
- User Secrets or environment variables for Development backend secrets.

## Default Ports

- Frontend: `5500`
- API: `5298`
- PostgreSQL: `5432`

## Local Backend Configuration

Versioned `Weddingifts.Api/appsettings.json` uses placeholders for secrets. Development requires:

- `ConnectionStrings:DefaultConnection`
- `Jwt:Key`

Recommended User Secrets:

```powershell
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=weddingifts;Username=SEU_USUARIO;Password=SUA_SENHA" --project Weddingifts.Api/Weddingifts.Api.csproj
dotnet user-secrets set "Jwt:Key" "SUA_CHAVE_JWT_ALEATORIA_COM_PELO_MENOS_32_BYTES" --project Weddingifts.Api/Weddingifts.Api.csproj
```

Validate:

```powershell
dotnet user-secrets list --project Weddingifts.Api/Weddingifts.Api.csproj
```

Configuration precedence in Development:

1. `Weddingifts.Api/appsettings.json`
2. `Weddingifts.Api/appsettings.Development.json`
3. User Secrets
4. Environment variables

## Restore, Build, Test

```powershell
dotnet restore Weddingifts.Api/Weddingifts.Api.sln --configfile Weddingifts.Api/NuGet.Config
dotnet build Weddingifts.Api/Weddingifts.Api.sln
dotnet test Weddingifts.Api/Weddingifts.Api.sln
```

## Run Locally

Backend:

```powershell
cd Weddingifts.Api
dotnet run
```

API:

- `http://localhost:5298`
- Swagger in Development: `http://localhost:5298/swagger`

Frontend:

```powershell
cd Weddingifts-web
py -m http.server 5500
```

Frontend URL:

- `http://localhost:5500`

## Repository Shortcuts

### `run.bat`

- Stops old listeners on `5298` and `5500`.
- Starts backend and frontend locally.
- Opens browser at `http://localhost:5500`.

### `start-dev.ps1`

- Starts backend on `0.0.0.0:5298`.
- Starts frontend on `0.0.0.0:5500`.
- Supports testing from a phone on the same LAN.

Usage:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-dev.ps1
```

## Frontend Smoke

Initial setup:

```powershell
cmd /c npm install
cmd /c npx playwright install chromium
```

Standard run:

```powershell
dotnet restore Weddingifts.Api/Weddingifts.Api.sln --configfile Weddingifts.Api/NuGet.Config
dotnet build Weddingifts.Api/Weddingifts.Api.csproj /p:UseAppHost=false
cmd /c npm run test:frontend-smoke
```

Headed run:

```powershell
cmd /c npm run test:frontend-smoke:headed
```

The smoke suite can manage its own backend in `FrontendSmoke`, use SQLite, serve frontend on `127.0.0.1:5500`, and shut processes down at the end.

## Smoke Against Existing Servers

```powershell
$env:WG_FRONTEND_BASE_URL="http://127.0.0.1:5500"
$env:WG_API_BASE_URL="http://127.0.0.1:5298"
$env:WG_DISABLE_MANAGED_SERVERS="1"
cmd /c npm run test:frontend-smoke
```

## Mobile LAN Testing

1. Ensure phone and PC are on the same Wi-Fi.
2. Start:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-dev.ps1
```

3. Find PC IP:

```powershell
ipconfig
```

4. Open on phone:

```text
http://SEU_IP:5500
```

5. Optional API check:

```text
http://SEU_IP:5298/swagger
```

Common blockers:

- Firewall blocks `5298` or `5500`.
- Phone and PC are on different networks.
- VPN interference.
- Browser cache.
- Missing Development secrets.

## Documentation Operations

- `.specs/` is the living documentation root.
- `old/` is historical archive only.
- Do not update archived docs as source of truth.
- For new features, create `.specs/features/<feature>/spec.md` and add `design.md`/`tasks.md` when complexity requires.
