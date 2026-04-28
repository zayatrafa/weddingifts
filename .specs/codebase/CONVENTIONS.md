# Code Conventions

**Analyzed:** 2026-04-27

## Source of Truth

When information conflicts, use this priority:

1. Current codebase
2. Runtime configuration and observed environment behavior
3. Versioned project files
4. `.specs/` documentation
5. Archived docs in `old/`
6. Historical notes or conversations

## Working Rules for Agents

- Preserve existing functionality.
- Prefer small controlled changes.
- Analyze impact before editing.
- Avoid unrelated refactors.
- Keep frontend, backend, and `.specs` consistent.
- Declare uncertainty when confidence is low.
- Never invent behavior not confirmed in code or docs.
- Treat `old/` as historical archive only.

## Backend Conventions

Current architecture:

- Controllers stay thin.
- Business logic belongs in services.
- Data access goes through `AppDbContext` and EF Core.
- HTTP contracts live in `Models`.
- Persisted models live in `Entities`.
- Problem responses use `ProblemDetails` / `ValidationProblemDetails`.
- Sensitive fields such as password hashes must not be returned.

Naming:

- C# types and public members use PascalCase.
- Services are named by domain: `EventService`, `GiftService`, `EventRsvpService`.
- Request/response DTOs use explicit suffixes such as `CreateGiftRequest`, `EventResponse`.
- Async methods use `Async` when local pattern already uses it; preserve existing method names otherwise.

Error handling:

- Domain validation: `DomainValidationException`.
- Unauthorized credentials/session: `UnauthorizedRequestException`.
- Ownership or permission failure: `ForbiddenOperationException`.
- Missing resources: `ResourceNotFoundException`.
- Unexpected errors are converted by global middleware.

Security:

- Keep JWT Bearer on private routes.
- Do not weaken CPF, password, ownership, reservation, or RSVP validation.
- Auth changes require review of `common.js`, `login.js`, and all private pages.

## Frontend Conventions

Current stack:

- HTML, CSS, and vanilla JavaScript only.
- No React, Next.js, SPA router, or build step.
- One page equals one responsibility.
- One main script per page.
- Shared utilities live in `Weddingifts-web/js/common.js`.

JavaScript patterns:

- Use `requestJson`, `authHeaders`, `requireAuth`, `setStatus`, and formatting helpers when applicable.
- Keep state local to each page unless behavior is shared.
- Use backend `ProblemDetails.detail` when showing API errors.
- Keep loading, success, error, and empty states explicit.

Copy and UX:

- User-facing text must be PT-BR with correct accents, punctuation, and tone.
- Mobile impact is required for frontend changes.
- Preserve navigation behavior unless the task explicitly changes it.
- Avoid redesigning unrelated screens while fixing a focused issue.

CSS:

- Treat `styles.css` as shared system CSS.
- Review all affected pages before changing global classes.
- Avoid one-off fixes when a reusable pattern is clearly needed.

## Documentation Conventions

- `.specs/` is living documentation.
- `old/` is archive only.
- Feature work should use `.specs/features/<feature>/spec.md` before implementation when scope is medium or larger.
- Larger or ambiguous features should also use `context.md`, `design.md`, and `tasks.md`.
- Quick fixes can use `.specs/quick/<NNN-slug>/TASK.md` and `SUMMARY.md`.
- After implementation, update the relevant `.specs` codebase/project docs if reality changed.

## Regression Prevention

High-risk areas:

- Authentication and sessions
- Redirects
- DTO contracts
- Shared JS utilities
- Global CSS
- Database models/migrations
- Business-rule services
- Routing
- Mobile layout

For backend changes touching controllers, services, entities, models, auth, EF mappings, event flows, guest flows, reservation flows, or RSVP flows, run:

```powershell
dotnet build Weddingifts.Api/Weddingifts.Api.sln
dotnet test Weddingifts.Api/Weddingifts.Api.sln
```

For frontend changes touching critical flows or shared UI/session code, consider:

```powershell
npm run test:frontend-smoke
```

Mobile validation remains manual unless automation is added.
