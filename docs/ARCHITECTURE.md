# Weddingifts Architecture

This document explains the system architecture of the Weddingifts project.

The goal is to keep a simple and scalable architecture.

---

# System Overview

Weddingifts is a backend-driven web application for managing wedding gift lists.

The system allows:

- users to create wedding events
- couples to create gift lists
- guests to reserve gifts through a public page

---

# High-Level Architecture (Current)

Static Frontend (Weddingifts-web)
-> REST API (.NET 8)
-> PostgreSQL Database

---

# Backend Architecture

The backend follows a layered architecture:

Controllers
-> Services
-> Data Access (DbContext)
-> Database

---

# Layer Responsibilities

Controllers

- handle HTTP requests
- validate basic request format
- call services
- return response DTOs

Controllers should contain minimal business logic.

Services

- implement business rules
- coordinate operations
- interact with database through DbContext

Services contain core application logic.

Entities

Entities represent database tables.

Current entities:

- User
- Event
- Gift

Models

Models represent API request and response structures.

Examples:

- CreateUserRequest
- CreateEventRequest
- CreateGiftRequest
- ReserveGiftRequest
- UserResponse / EventResponse / GiftResponse

Data Layer

AppDbContext manages database access.

Responsibilities:

- mapping entities to tables
- executing queries
- managing migrations

---

# Database Schema

User
  -> Event (1:N)

Event
  -> Gift (1:N)

---

# Public Event Access

Events are accessed publicly through a slug.

Example:

`/events/abc123`

The slug is generated automatically when the event is created.

---

# Testing Architecture

Integration tests are implemented in a dedicated project:

- `Weddingifts.Api.IntegrationTests`

Approach:

- `WebApplicationFactory<Program>` for in-process API execution
- SQLite in-memory database for isolated test runs
- real HTTP calls to API endpoints for end-to-end backend behavior validation

Covered flows include:

- reserve gift success and failure
- unreserve gift success and failure
- gift creation validations (`price >= 0`, `quantity >= 1`)

---

# CI Architecture

GitHub Actions workflow:

- `.github/workflows/dotnet-ci.yml`

Pipeline steps:

- restore solution
- build solution
- run tests

Triggers:

- push
- pull_request

---

# Future Architecture Considerations

Possible future improvements:

- authentication and authorization
- caching
- background jobs
- email notifications
- payment integrations
