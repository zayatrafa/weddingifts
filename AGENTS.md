# Weddingifts - Project Context for AI Agents

This document provides context about the Weddingifts project.
Any AI coding agent (Codex, Copilot, etc.) should read this file before making changes.

---

# Project Overview

Weddingifts is a web application for managing wedding gift lists.

The system allows couples to create an event and publish a public page where guests can reserve gifts.

This project is being developed as:

- a learning project for modern backend technologies
- a portfolio project
- a potential SaaS product

The project priorities are:

- simple architecture
- clean code
- backend best practices
- modern development stack

---

# Current Development Stage

Backend core, reservation flow, integration tests, and CI are implemented.
A frontend MVP is implemented and integrated end-to-end with the backend.

Implemented backend features:

- user creation
- user listing (without exposing PasswordHash)
- event creation (with user existence validation)
- public event retrieval by slug
- gift creation (with validation)
- gift listing by event
- gift reservation
- gift unreservation
- global API error handling (ProblemDetails)
- CORS for local frontend integration
- startup migration application (`Database.Migrate()`)

Implemented quality features:

- integration test project (`Weddingifts.Api.IntegrationTests`)
- integration tests for reservation, unreservation, and gift creation validations
- GitHub Actions CI workflow (`.github/workflows/dotnet-ci.yml`) running restore/build/test on push and pull_request

Implemented frontend MVP (static):

- public event visual page
- load event by slug from real backend API
- list gifts from real backend API
- reserve and unreserve gifts through real endpoints
- basic status and feedback messages

---

# Tech Stack

Backend:

- .NET 8
- ASP.NET Web API
- Entity Framework Core
- PostgreSQL

Frontend (current MVP):

- static HTML/CSS/JavaScript (no build step)

Frontend (planned evolution):

- Next.js
- React
- TypeScript

Development tools:

- Git
- GitHub
- Swagger / OpenAPI
- GitHub Actions (CI)
- Docker Desktop (planned use)

---

# Project Architecture

Backend layered architecture:

Controllers
-> Services
-> Data Access (DbContext)
-> Database

Folder structure:

Weddingifts.Api
- Controllers
- Services
- Entities
- Models
- Data
- Migrations
- Middleware
- Exceptions
- Security

Testing:

Weddingifts.Api.IntegrationTests
- `IntegrationTestWebApplicationFactory`
- `GiftReservationIntegrationTests`

CI:

.github/workflows
- `dotnet-ci.yml`

---

# Database Model

Current entities:

User
Event
Gift

Relationships:

User
  -> Event (1:N)

Event
  -> Gift (1:N)

---

# Entity Descriptions

## User

Represents a user who creates wedding events.

Fields:

- Id
- Name
- Email
- PasswordHash
- CreatedAt

## Event

Represents a wedding event.

Fields:

- Id
- UserId
- Name
- EventDate
- Slug
- CreatedAt

Slug is used for public URLs.
Example: `/events/abc123`

## Gift

Represents a gift in the wedding list.

Fields:

- Id
- EventId
- Name
- Description
- Price
- Quantity
- ReservedQuantity
- ReservedBy
- ReservedAt
- CreatedAt

---

# API Endpoints

User

- POST /api/users
- GET /api/users

Event

- POST /api/events
- GET /api/events/{slug}

Gift

- POST /api/events/{eventId}/gifts
- GET /api/events/{eventId}/gifts

Gift reservation

- POST /api/gifts/{giftId}/reserve
- POST /api/gifts/{giftId}/unreserve

---

# Business Rules

Gift creation:

- price must be >= 0
- quantity must be >= 1
- event must exist

Event creation:

- user must exist

Gift reservation:

- cannot reserve if quantity <= 0
- cannot reserve if reserved quantity reached total quantity
- increments ReservedQuantity by 1

Cancel reservation:

- cannot unreserve when ReservedQuantity is 0
- decrements ReservedQuantity by 1
- clears ReservedBy and ReservedAt when ReservedQuantity reaches 0

---

# Security and API Standards

- Passwords are hashed before persistence (PBKDF2 service).
- Controllers should return response DTOs, not raw entities, when sensitive or cyclical data may leak.
- API errors are mapped via global middleware:
  - 400 for domain validation errors
  - 404 for missing resources
  - 500 for unexpected failures

---

# Local Run and Test (Windows)

Preferred command:

- `run.bat`

What `run.bat` does:

- stops old API/web processes on local ports
- starts backend (`dotnet run`)
- starts frontend static server (`py -m http.server 5500`)
- opens browser at `http://localhost:5500/?slug=62b74666`

Manual run option:

Backend:

```powershell
cd Weddingifts.Api
dotnet run
```

Frontend:

```powershell
cd Weddingifts-web
py -m http.server 5500
```

Run tests:

```powershell
dotnet restore Weddingifts.Api/Weddingifts.Api.sln --configfile Weddingifts.Api/NuGet.Config
dotnet test Weddingifts.Api/Weddingifts.Api.sln --no-restore
```

---

# Migration Notes

- Reservation migration file exists:
  - `20260309123000_AddGiftReservationFields`
- Startup applies migrations automatically via `Database.Migrate()`.
- If schema mismatch occurs, ensure old API processes are stopped and restart backend.

---

# Coding Guidelines

When modifying this project:

1. Maintain current folder structure.
2. Follow ASP.NET dependency injection patterns.
3. Services contain business logic.
4. Controllers should remain thin.
5. Entities represent database tables.
6. Models represent API requests/responses.
7. Prefer explicit validation and meaningful error messages.

Avoid introducing unnecessary frameworks.
Prefer simple and readable code.

---

# Next Task (Frontend)

Primary next task for a new coding window:

Implement a user registration screen in `Weddingifts-web` using the existing backend endpoint:

- `POST /api/users`

Request body:

```json
{
  "name": "Maria Silva",
  "email": "maria@email.com",
  "password": "123456"
}
```

Expected behavior:

- show a registration form (name, email, password)
- submit using real API URL configured in the page
- show loading state while request is running
- on success, show confirmation message with created user info (without password)
- on error, show `ProblemDetails.detail` message returned by backend
- keep existing event loading + gift reservation flows working

Do not refactor architecture unless explicitly instructed.

---

# Purpose of this Document

This file exists to provide context for AI coding agents.

Agents should:

- understand the architecture
- follow the defined patterns
- avoid breaking the project structure
- generate code consistent with existing patterns
