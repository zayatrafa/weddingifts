# AGENTS.md

## Mission

Maintain Weddingifts with the normal Codex workflow: inspect enough to understand the task, make focused changes, validate proportionally, and report the result clearly.

Preserve working user flows and avoid unrelated rewrites.

---

## Project Snapshot

Weddingifts is a multi-page web product for event gift lists.

Current architecture:

- Frontend: HTML / CSS / Vanilla JavaScript
- Backend: ASP.NET Core Web API (.NET 8)
- Database: PostgreSQL (EF Core)
- Authentication: JWT Bearer
- Tests: Integration tests

Main areas:

- Public event pages
- User registration/login
- Private event management
- Gift management
- Guest management
- Gift reservation flows

---

## Repository Map

Typical structure:

- `/Weddingifts-web` -> frontend application
- `/Weddingifts.Api` -> backend API
- `/Weddingifts.Api.IntegrationTests` -> automated tests
- `/docs` -> private local documentation
- `/.github/workflows` -> CI pipelines
- `/AGENTS.md` -> operational rules for AI agents

---

## Source of Truth Priority

When information conflicts, use this order:

1. Current codebase
2. Runtime configs / environment behavior
3. Versioned project files
4. Private local docs in `/docs`
5. Old notes / historical chats

Never trust outdated documentation over code.

---

## Default Codex Workflow

Use normal Codex behavior for this project.

- Do not use `tlc-spec-driven`, SDD, or spec-driven workflow files unless the user explicitly asks for that workflow in the current request.
- Do not run automated tests unless the user explicitly asks for tests in the current request. This applies across the whole project and future contexts: no `dotnet test`, frontend smoke tests, Playwright tests, npm test scripts, CI-style suites, or equivalent automated test runs by default.
- For clear small tasks, make the focused change directly after a quick inspection.
- Use deeper analysis when the change touches sensitive flows, shared contracts, data models, authentication, routing, or unclear behavior.
- Avoid unrelated refactors, broad rewrites, and framework changes unless explicitly requested.
- If something important is not confirmed in code, say so briefly instead of guessing.
- When tests would normally be appropriate, skip them and mention that they were not run because tests are opt-in for this project.

---

## Backend Guidance

Keep the existing ASP.NET Core architecture:

- Controllers should stay thin.
- Business logic belongs in services.
- Data access goes through DbContext / EF Core.
- Preserve auth boundaries and ProblemDetails-style errors.
- Avoid leaking sensitive fields.

Do not run backend tests unless the user explicitly asks. If a backend change is functional, contractual, risky, or touches critical flows, report the unrun test/build recommendation instead of running the suite by default.

---

## Frontend Guidance

Keep the existing multi-page vanilla JS approach:

- No React, Next.js, or build step unless explicitly requested.
- Preserve PT-BR user-facing text style.
- Keep loading, success, and error states clear.
- Preserve current navigation and successful flows unless the task asks to change them.

Check mobile impact when changing layout, visual behavior, forms, navigation, modals, or touch interactions.

---

## Critical Flows

Be careful with:

1. User registration
2. Login / logout
3. Session persistence
4. Event creation, edit, and delete
5. Gift CRUD
6. Guest CRUD
7. Public event page loading
8. Reserve / cancel reservation
9. Redirect flows
10. Mobile navigation

When a change touches these flows, inspect more carefully and mention any remaining risk. Automated tests remain opt-in and should only run when explicitly requested.

---

## Documentation

Private local docs in `/docs` are useful context, but do not require review for every task.

Update docs only when the change actually alters architecture, public behavior, roadmap status, coding standards, mobile guidance, or a known issue.

Do not recommend publishing private docs unless explicitly requested.

---

## Task Closing

Default final responses should be short:

- what changed
- files changed
- validation performed or skipped
- relevant risks or unvalidated areas

Use a more detailed report only when the user asks for it or when the change is broad, risky, or spans multiple areas.
