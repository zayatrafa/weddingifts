# Weddingifts

**Vision:** Weddingifts is a real MVP for wedding gift lists and wedding event coordination, built with production-minded engineering discipline before the MVP is delivered. It centralizes event creation, guest management, gift management, public reservations, and RSVP into a coherent experience for couples and guests.
**For:** Couples managing wedding logistics and guests interacting with the public event page.
**Solves:** Reduces manual coordination, fragmented spreadsheets, unclear gift availability, and RSVP friction by providing one controlled flow backed by explicit business rules.

## Goals

- Deliver a stable MVP that supports the complete core wedding gift-list journey.
  - Success metric: user can register, log in, create an event, manage guests/gifts, publish a public page, receive reservations, and collect RSVP without known blocking defects.
- Keep regression risk low while evolving toward MVP delivery.
  - Success metric: backend build/tests pass for backend changes, frontend smoke passes for covered critical flows, and mobile impact is reviewed for UI changes.
- Maintain agent-ready documentation as part of the engineering workflow.
  - Success metric: `.specs/` remains the source of truth for project/codebase/feature documentation; archived docs stay in `old/` only for history.

## Tech Stack

**Core:**

- Framework: ASP.NET Core Web API on .NET 8
- Language: C#, HTML, CSS, vanilla JavaScript
- Database: PostgreSQL in normal runtime; SQLite for integration/frontend-smoke test environments
- Frontend: static multipage app without framework and without production build step

**Key dependencies:**

- Entity Framework Core 8
- Npgsql.EntityFrameworkCore.PostgreSQL 8
- Microsoft.AspNetCore.Authentication.JwtBearer 8
- Swashbuckle.AspNetCore 6.6.2
- xUnit 2.7
- Playwright 1.59.1 for frontend smoke testing

## Scope

**MVP includes:**

- User registration with CPF, birth date, and strong password rules
- Login with JWT session persistence
- Private pages protected by valid session
- Event creation, listing, editing, and deletion
- Enriched event fields for couple, date/time, time zone, location, ceremony, dress code, and cover image URL
- Guest creation, listing, editing, deletion, and CPF lookup
- Guest `maxExtraGuests` management
- Gift creation, listing, editing, deletion, and reservation rules
- Public event page by slug
- Public gift reservation and cancellation by invited guest CPF
- Private reservation history
- Public RSVP by CPF with accepted/declined status, message, dietary restrictions, and companions
- Backend integration tests and frontend smoke coverage for critical flows
- Manual mobile validation as required before MVP delivery

**Explicitly out of scope for the current MVP:**

- Real payment integration
- Real e-mail or WhatsApp invitation delivery
- File upload/storage for event cover images
- Production observability platform
- Formal production deployment runbook
- Frontend framework migration

## Constraints

- Technical: preserve the current layered backend pattern `Controllers -> Services -> AppDbContext`.
- Technical: preserve vanilla multipage frontend; do not introduce React, Next.js, or a build step unless explicitly requested.
- Technical: API model/DTO changes are contract changes and require frontend impact review.
- Product: all user-facing copy must remain correct PT-BR.
- UX: mobile is native scope; frontend changes must consider mobile layout, touch targets, and navigation.
- Documentation: `.specs/` is the living documentation source from 2026-04-27 onward; `old/` is historical archive only.
- Source of truth: code wins over documentation when conflicts are found.
