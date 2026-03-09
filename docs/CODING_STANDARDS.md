# Coding Standards

This document defines coding practices for the Weddingifts project.

The goal is to keep code:

- readable
- consistent
- easy to maintain

---

# General Principles

Prefer simple solutions.

Avoid unnecessary abstractions.

Keep functions small and focused.

---

# Naming Conventions

Use descriptive names.

Examples:

Good:

- CreateGift
- GetGiftsByEvent

Avoid:

- ProcessData
- HandleStuff

---

# Backend Controllers

Controllers should:

- remain thin
- contain minimal logic
- delegate work to services

Pattern:

Controller
-> Service
-> Database

---

# Backend Services

Services contain business rules.

Examples:

- GiftService
- UserService
- EventService

Responsibilities:

- validate operations
- coordinate database actions

---

# Entities

Entities represent database tables.

Avoid placing business logic inside entities.

---

# Models

Models represent request and response payloads.

Examples:

- CreateGiftRequest
- ReserveGiftRequest
- GiftResponse

Models should not contain database logic.

---

# Frontend MVP (Weddingifts-web)

Use plain HTML/CSS/JavaScript (no build step).

Keep frontend code simple:

- UI structure in `index.html`
- page logic and API calls in `app.js`
- visual styles in `styles.css`

When calling backend:

- prefer centralized request helpers
- always surface backend error messages (`ProblemDetails.detail`) to users
- provide explicit loading/success/error feedback

Do not introduce extra frontend frameworks unless explicitly requested.

---

# Error Handling

Return meaningful HTTP responses.

Examples:

- 404 - resource not found
- 400 - invalid input
- 500 - server error

---

# Validation

All user input should be validated.

Examples:

- price must be >= 0
- quantity must be >= 1
- password must have at least 6 characters

---

# Tests

Prefer integration tests for API behavior-critical flows.

Each new business-critical flow should include:

- at least one success path
- at least one failure path

Keep tests deterministic and isolated.

---

# Logging (future)

Important operations should be logged.

Examples:

- event creation
- gift reservation
