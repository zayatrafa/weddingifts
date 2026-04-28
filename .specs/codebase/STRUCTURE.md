# Project Structure

**Root:** `C:\Users\rafae\Documents\Projetos\Weddingifts`
**Analyzed:** 2026-04-27

## Directory Tree

```text
Weddingifts/
  .github/
    workflows/
  .specs/
    project/
    codebase/
    features/
    quick/
  old/
  Weddingifts.Api/
    Controllers/
    Data/
    Entities/
    Exceptions/
    Middleware/
    Migrations/
    Models/
    Security/
    Services/
  Weddingifts.Api.IntegrationTests/
  Weddingifts-web/
    js/
  frontend-smoke/
    support/
  assets/
    readme/
```

## Module Organization

### API

**Purpose:** Backend REST API and business rules.
**Location:** `Weddingifts.Api/`
**Key files:** `Program.cs`, `Weddingifts.Api.csproj`, `Data/AppDbContext.cs`.

### Integration Tests

**Purpose:** Backend behavior verification through in-process API host.
**Location:** `Weddingifts.Api.IntegrationTests/`
**Key files:** `IntegrationTestWebApplicationFactory.cs`, `IntegrationTestBase.cs`, domain-specific `*IntegrationTests.cs`.

### Frontend

**Purpose:** Static multipage user interface.
**Location:** `Weddingifts-web/`
**Key files:** page HTML files, `styles.css`, `js/common.js`, `js/event-contract.js`.

### Frontend Smoke

**Purpose:** Browser-based smoke suite for critical flows.
**Location:** `frontend-smoke/`
**Key files:** `weddingifts.smoke.spec.js`, `run-smoke.mjs`, `support/api-helpers.js`.

### Documentation

**Purpose:** Living project, codebase, feature, and workflow documentation.
**Location:** `.specs/`
**Archive:** `old/`

## Where Things Live

**Authentication and account:**

- UI: `Weddingifts-web/login.html`, `register.html`, `account.html`
- Frontend logic: `js/login.js`, `js/register.js`, `js/account.js`, `js/common.js`
- Backend logic: `AuthService`, `UserService`, `JwtTokenService`, `PasswordHasherService`
- Contracts: `LoginRequest`, `LoginResponse`, `CreateUserRequest`, `ChangePasswordRequest`

**Events:**

- UI: `create-event.html`, `my-events.html`, `event.html`
- Frontend logic: `js/create-event.js`, `js/my-events.js`, `js/event.js`, `js/event-contract.js`
- Backend logic: `EventController`, `EventService`, `EventTimeZoneService`
- Data: `Event`

**Guests and RSVP:**

- UI: `my-guests.html`, `event.html`
- Frontend logic: `js/my-guests.js`, `js/event.js`
- Backend logic: `EventGuestService`, `EventRsvpService`
- Data: `EventGuest`, `EventGuestCompanion`

**Gifts and reservations:**

- UI: `my-event.html`, `event.html`
- Frontend logic: `js/my-event.js`, `js/event.js`
- Backend logic: `GiftService`
- Data: `Gift`, `GiftReservation`

**Testing and CI:**

- Backend integration tests: `Weddingifts.Api.IntegrationTests/`
- Frontend smoke: `frontend-smoke/`
- CI: `.github/workflows/dotnet-ci.yml`

## Special Directories

**`.specs/`:** living documentation for `tlc-spec-driven`.

**`old/`:** archived docs. Do not update as source of truth.

**`assets/readme/`:** visual evidence location for README-era assets. Currently archival unless product docs require assets later.

**Temporary/generated local directories:** `.codex_tmp*`, `test-results`, `node_modules`, `bin`, `obj`, and similar should not be treated as source.
