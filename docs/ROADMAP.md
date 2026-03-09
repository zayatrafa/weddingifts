# Weddingifts Development Roadmap

This document tracks the development stages of the Weddingifts project.

---

# Phase 1 – Backend Core (Completed)

✔ User creation
✔ Event creation
✔ Gift creation
✔ Gift listing
✔ Public event retrieval

Endpoints implemented:

POST /api/users
GET /api/users

POST /api/events
GET /api/events/{slug}

POST /api/events/{eventId}/gifts
GET /api/events/{eventId}/gifts

---

# Phase 2 – Gift Reservation System

Planned features:

- reserve a gift
- cancel reservation
- prevent double reservations
- validate quantities

Planned endpoints:

POST /api/gifts/{giftId}/reserve
POST /api/gifts/{giftId}/unreserve

---

# Phase 3 – Backend Improvements

Add validation rules:

- event must exist when creating gifts
- user must exist when creating events
- price must be positive
- quantity must be >= 1

Add improved error handling.

---

# Phase 4 – Public Event Page

Frontend implementation:

Public page showing:

- event name
- gift list
- reserve buttons

Technology:

Next.js
React

---

# Phase 5 – Gift Reservation UI

Guests should be able to:

- reserve a gift
- see reserved gifts
- confirm reservation

---

# Phase 6 – Admin Dashboard

Couples should be able to:

- create gifts
- edit gifts
- remove gifts
- track reservations

---

# Phase 7 – Deployment

Deploy system to cloud environment.

Possible stack:

Backend:
.NET container

Database:
PostgreSQL

Frontend:
Next.js

CI/CD pipeline.

---

# Long-Term Vision

Transform Weddingifts into a SaaS platform that can support multiple events and different celebration types.