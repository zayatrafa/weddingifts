# External Integrations

**Analyzed:** 2026-04-27

## Database

**Service:** PostgreSQL
**Purpose:** Main application persistence.
**Implementation:** Entity Framework Core through `AppDbContext`.
**Configuration:** `ConnectionStrings:DefaultConnection`.
**Authentication:** Database username/password in User Secrets or environment variables for local development.

## Test Database

**Service:** SQLite
**Purpose:** Integration and frontend smoke testing without relying on PostgreSQL secrets.
**Implementation:** `Microsoft.EntityFrameworkCore.Sqlite`.
**Configuration:** In-memory SQLite for integration tests; local SQLite file in `FrontendSmoke`.

## Authentication

**Service:** Local JWT Bearer authentication.
**Purpose:** Protect private API routes and frontend pages.
**Implementation:** `JwtTokenService`, `AuthService`, ASP.NET Core JWT Bearer middleware, and frontend `localStorage`.
**Configuration:** `Jwt:Issuer`, `Jwt:Audience`, `Jwt:Key`, `Jwt:ExpiresMinutes`.

## CI

**Service:** GitHub Actions
**Purpose:** Build, test, and smoke validation.
**Implementation:** `.github/workflows/dotnet-ci.yml`.
**Jobs:**

- Backend restore/build/test on Ubuntu.
- Frontend smoke on Windows with .NET, Node, Python, npm, and Playwright Chromium.

## Local Tooling

**Service:** Python `http.server`
**Purpose:** Serve static frontend locally.
**Implementation:** `py -m http.server 5500`.

**Service:** Playwright
**Purpose:** Browser smoke testing.
**Implementation:** `frontend-smoke/` and `playwright.config.js`.

## Not Confirmed in Current Code

No implementation is confirmed for:

- Payment provider
- PIX integration
- E-mail service
- WhatsApp provider
- Object/file storage
- Analytics
- Error monitoring/Sentry
- Queue/background jobs
- Webhooks

Any future work in these areas requires a new feature spec and external documentation research before implementation.
