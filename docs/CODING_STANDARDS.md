# Coding Standards

This document defines coding practices for the Weddingifts project.

The goal is to maintain code that is:

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

CreateGift
GetGiftsByEvent

Avoid:

ProcessData
HandleStuff

---

# Controllers

Controllers should:

- remain thin
- contain minimal logic
- delegate work to services

Example pattern:

Controller
↓
Service
↓
Database

---

# Services

Services contain business rules.

Examples:

GiftService
UserService
EventService

Responsibilities:

- validating operations
- coordinating database actions

---

# Entities

Entities should represent database tables.

Avoid placing business logic inside entities.

---

# Models

Models should represent request or response payloads.

Example:

CreateGiftRequest

Models should not contain database logic.

---

# Error Handling

Return meaningful HTTP responses.

Examples:

404 – resource not found
400 – invalid input
500 – server error

---

# Validation

All user input should be validated.

Examples:

- price must be >= 0
- quantity must be >= 1

---

# Logging (future)

Important operations should be logged.

Examples:

- event creation
- gift reservation