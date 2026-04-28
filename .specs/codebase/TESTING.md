# Testing Infrastructure

**Analyzed:** 2026-04-27

## Test Frameworks

**Backend integration:** xUnit 2.7.0 with `Microsoft.AspNetCore.Mvc.Testing` 8.0.0.
**Frontend smoke:** Playwright 1.59.1.
**Coverage:** `coverlet.collector` is referenced, but no enforced coverage threshold is documented.

## Test Organization

**Backend location:** `Weddingifts.Api.IntegrationTests/`

Pattern:

- One integration test file per major domain area.
- Shared setup in `IntegrationTestWebApplicationFactory`.
- Shared helpers/contracts in `IntegrationTestBase`.
- Tests call real HTTP endpoints through `HttpClient`.
- Database reset is explicit through `ResetDatabaseAsync`.

**Frontend smoke location:** `frontend-smoke/`

Pattern:

- `weddingifts.smoke.spec.js` contains browser flows.
- `support/api-helpers.js` seeds data via the real API.
- `run-smoke.mjs` can manage backend/frontend processes.
- `playwright.config.js` uses one worker and disables full parallelism.

## Existing Backend Coverage

- User registration
- Login
- Change password
- Event creation, update, deletion, listing, and public loading
- Guest CRUD and CPF lookup
- RSVP read/confirm/update/reset behavior
- Gift creation/update/delete and owner authorization
- Reservation and cancellation by invited CPF
- Business-rule validation and `ProblemDetails` responses

## Existing Frontend Smoke Coverage

- Valid login redirects into private flow
- Event creation through UI, including invitation message and optional blank cover image URL
- My-events listing and primary actions
- Guest creation/editing including companion limit
- Public invitation link by slug and CPF lookup
- Guided public RSVP consultation and update
- Companion count limit and CPF conditional rule
- Declined RSVP clears companions
- Guided gift step search, filter, sort, reservation, cancellation, and no-gift skip
- Invitation completion, return menu, direct gift action, direct event-info action, and direct RSVP action

## Test Execution

Backend restore/build/test:

```powershell
dotnet restore Weddingifts.Api/Weddingifts.Api.sln --configfile Weddingifts.Api/NuGet.Config
dotnet build Weddingifts.Api/Weddingifts.Api.sln
dotnet test Weddingifts.Api/Weddingifts.Api.sln
```

Frontend smoke standard flow:

```powershell
dotnet restore Weddingifts.Api/Weddingifts.Api.sln --configfile Weddingifts.Api/NuGet.Config
dotnet build Weddingifts.Api/Weddingifts.Api.csproj /p:UseAppHost=false
cmd /c npm run test:frontend-smoke
```

Frontend smoke headed:

```powershell
cmd /c npm run test:frontend-smoke:headed
```

## Test Coverage Matrix

| Code Layer | Required Test Type | Location Pattern | Run Command |
| --- | --- | --- | --- |
| Controllers | Integration | `Weddingifts.Api.IntegrationTests/*IntegrationTests.cs` | `dotnet test Weddingifts.Api/Weddingifts.Api.sln` |
| Services/business rules | Integration | `Weddingifts.Api.IntegrationTests/*IntegrationTests.cs` | `dotnet test Weddingifts.Api/Weddingifts.Api.sln` |
| Entities/EF mappings | Integration + migration review | `Weddingifts.Api.IntegrationTests/*`, `Weddingifts.Api/Migrations/*` | `dotnet test Weddingifts.Api/Weddingifts.Api.sln` |
| Frontend private flows | Smoke + manual | `frontend-smoke/weddingifts.smoke.spec.js` | `npm run test:frontend-smoke` |
| Frontend public flows | Smoke + manual | `frontend-smoke/weddingifts.smoke.spec.js` | `npm run test:frontend-smoke` |
| Mobile layout | Manual | `.specs/codebase/MOBILE_TESTING.md` | Manual checklist |
| Documentation only | Review | `.specs/**` | Inventory/status only |

## Parallelism Assessment

| Test Type | Parallel-Safe? | Isolation Model | Evidence |
| --- | --- | --- | --- |
| Backend integration | No | Shared factory SQLite connection with explicit database reset | `IntegrationTestWebApplicationFactory` |
| Frontend smoke | No | `fullyParallel: false`, `workers: 1`, managed local servers | `playwright.config.js` |
| Manual mobile | N/A | Human-run checklist | `.specs/codebase/MOBILE_TESTING.md` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Documentation | Documentation-only changes | `rg --files -u -g '*.md'` and `git status --short` |
| Backend | Controllers/services/models/entities/auth/EF changes | `dotnet build Weddingifts.Api/Weddingifts.Api.sln` then `dotnet test Weddingifts.Api/Weddingifts.Api.sln` |
| Frontend smoke | Shared frontend, auth/session, public/private critical flow changes | `cmd /c npm run test:frontend-smoke` |
| Full | Cross-stack feature changes | Backend build/test plus frontend smoke plus manual mobile checklist |

## Known Gaps

- No automated mobile viewport suite.
- Frontend smoke is intentionally narrow and does not replace manual exploratory testing.
- No documented coverage thresholds.
