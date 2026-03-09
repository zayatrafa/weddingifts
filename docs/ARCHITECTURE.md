# Weddingifts Architecture

This document explains the system architecture of the Weddingifts project.

The goal is to maintain a simple and scalable backend architecture.

---

# System Overview

Weddingifts is a backend-driven web application for managing wedding gift lists.

The system allows:

- users to create wedding events
- couples to create gift lists
- guests to reserve gifts through a public page

---

# High-Level Architecture

Frontend (planned)
↓
REST API (.NET)
↓
PostgreSQL Database

---

# Backend Architecture

The backend follows a layered architecture:

Controllers
↓
Services
↓
Data Access (DbContext)
↓
Database

---

# Layer Responsibilities

Controllers

- handle HTTP requests
- validate basic request format
- call services
- return responses

Controllers should contain minimal business logic.

---

Services

- implement business rules
- coordinate operations
- interact with database through DbContext

Services contain the core logic of the application.

---

Entities

Entities represent database tables.

Examples:

User
Event
Gift

---

Models

Models represent API request and response structures.

Examples:

CreateUserRequest
CreateEventRequest
CreateGiftRequest

These models are separate from database entities.

---

Data Layer

AppDbContext manages database access.

Responsibilities:

- mapping entities to tables
- executing queries
- managing migrations

---

# Database Schema

User
  └── Event (1:N)

Event
  └── Gift (1:N)

---

# Public Event Access

Events are accessed publicly through a slug.

Example:

/events/abc123

The slug is generated automatically when the event is created.

---

# Future Architecture Considerations

Possible future improvements:

- authentication and authorization
- caching
- background jobs
- email notifications
- payment integrations