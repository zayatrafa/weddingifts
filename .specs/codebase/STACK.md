# Tech Stack

**Analyzed:** 2026-04-27

## Core

- Framework: ASP.NET Core Web API, .NET 8
- Language: C# with nullable reference types and implicit usings enabled
- Runtime: .NET 8
- Package manager: NuGet for backend, npm for frontend smoke tooling
- Frontend runtime: static HTML/CSS/JavaScript served by Python `http.server` in local development

## Frontend

- UI Framework: none
- Styling: `Weddingifts-web/styles.css`
- State Management: per-page JavaScript state objects and browser `localStorage`
- Form Handling: vanilla DOM events and custom validation
- Production build step: none

## Backend

- API Style: REST over ASP.NET Core controllers
- Database: PostgreSQL through Entity Framework Core and Npgsql in normal runtime
- Test database: SQLite in-memory or local SQLite in testing/smoke environments
- Authentication: JWT Bearer
- Error style: `ProblemDetails` / `ValidationProblemDetails`
- API documentation: Swagger in Development and FrontendSmoke

## Key Backend Dependencies

- `Microsoft.AspNetCore.Authentication.JwtBearer` 8.0.0
- `Microsoft.EntityFrameworkCore` 8.0.0
- `Microsoft.EntityFrameworkCore.Sqlite` 8.0.0
- `Microsoft.EntityFrameworkCore.Design` 8.0.0
- `Microsoft.EntityFrameworkCore.Tools` 8.0.0
- `Npgsql.EntityFrameworkCore.PostgreSQL` 8.0.0
- `Swashbuckle.AspNetCore` 6.6.2

## Testing

- Integration: xUnit 2.7.0 and `Microsoft.AspNetCore.Mvc.Testing` 8.0.0
- Coverage collector: `coverlet.collector` 6.0.2
- Frontend smoke: Playwright 1.59.1
- CI: GitHub Actions

## External Services

- Database: PostgreSQL
- CI: GitHub Actions

No production integration is confirmed for e-mail, WhatsApp, payments, analytics, object storage, queueing, or external observability.

## Development Tools

- Local API: `dotnet run`
- Local frontend: `py -m http.server 5500`
- Frontend smoke orchestration: `frontend-smoke/run-smoke.mjs`
- Mobile LAN testing helper: `start-dev.ps1`
- Local convenience launcher: `run.bat`
