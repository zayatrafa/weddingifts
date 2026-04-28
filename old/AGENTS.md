# AGENTS.md

## Mission

Maintain Weddingifts with safe, incremental progress.
Preserve working flows, reduce regressions, and keep local private documentation synchronized with the real system state.

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

- `/Weddingifts-web` → frontend application
- `/Weddingifts.Api` → backend API
- `/Weddingifts.Api.IntegrationTests` → automated tests
- `/docs` → private local documentation
- `/.github/workflows` → CI pipelines
- `/AGENTS.md` → operational rules for AI agents

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

## Core Working Rules

All agents must:

- preserve existing functionality
- prefer small controlled changes
- analyze impact before editing
- avoid unrelated refactors
- avoid broad rewrites unless explicitly requested
- keep frontend/backend/docs consistent
- declare uncertainty when confidence is low
- never invent system behavior not confirmed in code

---

## Regression Prevention Rules

Before touching any shared or sensitive area, inspect downstream impact.

High-risk areas:

- authentication / sessions
- redirects
- DTOs / contracts
- shared JS utilities
- CSS shared styles
- database models
- services with business rules
- routing
- mobile layouts

If risk is medium/high, say so explicitly.

---

## Backend Rules (.NET)

Maintain current architecture:

- Controllers should stay thin
- Business logic belongs in Services
- Data access via DbContext / EF Core
- Preserve ProblemDetails error style
- Respect auth boundaries
- Avoid leaking sensitive fields

When backend changes touch contracts, verify frontend impact.

Always run relevant commands when possible:

dotnet restore Weddingifts.Api/Weddingifts.Api.sln
dotnet build Weddingifts.Api/Weddingifts.Api.sln
dotnet test Weddingifts.Api/Weddingifts.Api.sln

---

## Backend Test Execution Policy

When changing backend code, always evaluate test impact first.

Run this minimum verification set when relevant:

- `dotnet build Weddingifts.Api/Weddingifts.Api.sln`
- `dotnet test Weddingifts.Api/Weddingifts.Api.sln`

Changes that MUST trigger backend validation:

- Controllers
- Services
- Entities
- Models / DTOs
- Authentication / JWT
- AppDbContext
- Database mappings
- Validation rules
- Event flows
- Guest flows
- Reservation flows

Do not mark backend work as complete unless:

1. Build passes
2. Relevant tests pass
3. Risks are reported
4. Docs impacted by the change were reviewed

If tests were not executed, explain clearly why.

---

## Frontend Rules

Current frontend is multi-page vanilla JS.

Assume:

- no React
- no Next.js
- no build step
- no package manager requirement

Maintain patterns:

- one page = one responsibility
- shared utilities in common files
- clear loading / success / error states
- PT-BR user-facing text
- responsive behavior required

Do not introduce frameworks unless explicitly requested.

---

## UX Preservation Rule

Unless explicitly requested:

- preserve current navigation behavior
- preserve current successful flows
- preserve visual clarity
- preserve button/form usability
- preserve copy tone and language consistency

Do not redesign while fixing unrelated issues.

---

## Mobile First Validation Rule

Any frontend change must consider mobile impact.

Check especially:

- button visibility
- form spacing
- broken layouts
- overflow
- modal usability
- menu behavior
- touch targets
- text readability

If not validated, state clearly.

---

## Critical Flows That Must Not Break

Always be careful with:

1. User registration
2. Login / logout
3. Session persistence
4. Event creation
5. Event edit/delete
6. Gift CRUD
7. Guest CRUD
8. Public event page loading
9. Reserve / cancel reservation
10. Redirect flows
11. Mobile navigation

---

## Private Local Documentation Policy

This repository uses private local documentation files that may be excluded from Git version control for privacy and strategic reasons.

Examples:

- `/docs/ARCHITECTURE.md`
- `/docs/ROADMAP.md`
- `/docs/CODING_STANDARDS.md`
- `/docs/MOBILE_TEST_CHECKLIST.md`
- `/docs/KNOWN_ISSUES.md`
- internal notes

Operational rules:

1. These files are active project context sources.
2. Keep them synchronized with the real codebase.
3. Do not treat ignored files as irrelevant.
4. Do not recommend publishing private docs unless explicitly requested.
5. If local docs are unavailable, state that limitation clearly.
6. Preserve correct content and edit only impacted sections.
7. Never invent undocumented facts.

---

## Living Documentation Rule

Whenever a relevant change happens, review and update impacted docs in the same task.

Examples:

- architecture change → `ARCHITECTURE.md`
- feature delivered / changed → `ROADMAP.md`
- coding conventions changed → `CODING_STANDARDS.md`
- mobile UX changes → `MOBILE_TEST_CHECKLIST.md`
- recurring bug found → `KNOWN_ISSUES.md`

Update policy:

- preserve valid existing content
- edit only impacted sections
- reflect confirmed reality only
- mark uncertain items clearly

---

## Legacy / Ambiguous Files Rule

Some files may be legacy, experimental, temporary, or partially unused.

Do not assume they represent the active architecture without confirmation.

If uncertain:

- inspect references
- inspect imports/usages
- inspect routes/startup wiring
- state low confidence

---

## Change Size Rule

Prefer:

- one focused task
- one clear objective
- minimal blast radius

Avoid mixing:

- bugfix + refactor + redesign + architecture change

Split into steps when possible.

---

## Required Task Closing Report

At the end of every task, report:

1. What changed
2. Files changed
3. Validations/tests performed
4. Local docs updated
5. Docs that still need review
6. Remaining risks
7. What was not validated

---

## If Something Is Unclear

Do not guess.

Say:

- not confirmed in code
- not validated locally
- possible risk area
- requires manual verification

---

## Long-Term Goal

Help evolve Weddingifts with engineering discipline:

- stable releases
- low regression rate
- clear architecture
- maintainable code
- updated private knowledge base
- scalable future growth
