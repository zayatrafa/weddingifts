# Weddingifts – Project Context for AI Agents

This document provides full context about the Weddingifts project.
Any AI coding agent (Codex, Copilot, etc.) should read this file before making changes.

---

# Project Overview

Weddingifts is a web application for managing wedding gift lists.

The system allows couples to create an event and publish a public page where guests can reserve gifts.

This project is being developed as:

- a learning project for modern backend technologies
- a portfolio project
- a potential SaaS product

The project prioritizes:

- simple architecture
- clean code
- backend best practices
- modern development stack

---

# Current Development Stage

Backend core + reservation flow are implemented.
A first frontend MVP is implemented and integrated end-to-end with the backend.

Implemented features:

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

Development Tools:

- Git
- GitHub
- Swagger / OpenAPI
- Docker Desktop (planned use)

---

# Project Architecture

The backend follows a simple layered architecture:

Controllers
↓
Services
↓
Data Access (DbContext)
↓
Database

Folder structure:

Weddingifts.Api
│
├── Controllers
├── Services
├── Entities
├── Models
├── Data
├── Migrations
├── Middleware
├── Exceptions
├── Security

---

# Database Model

Current entities:

User
Event
Gift

Relationships:

User
  └── Event (1:N)

Event
  └── Gift (1:N)

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

---

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

Example:

/events/abc123

---

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

# Local Run (Windows)

Preferred command:

run.bat

What `run.bat` does:

- stops old API/web processes on local ports
- starts backend (`dotnet run`)
- starts frontend static server (`py -m http.server 5500`)
- opens browser at `http://localhost:5500/?slug=62b74666`

Manual run option:

Backend:

cd Weddingifts.Api
dotnet run

Frontend:

cd Weddingifts-web
py -m http.server 5500

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

# Next High-Level Roadmap

Backend:

- reservation concurrency hardening
- authentication/authorization
- rate limiting
- logging improvements

Frontend:

- migrate MVP to Next.js + TypeScript
- improve UX states (loading/errors/empty)
- add admin dashboard

Deployment:

- Dockerized services
- cloud deployment
- CI/CD pipeline

---

# Purpose of this Document

This file exists to provide context for AI coding agents.

Agents should:

- understand the architecture
- follow the defined patterns
- avoid breaking the project structure
- generate code consistent with existing patterns

Do not refactor architecture unless explicitly instructed.
