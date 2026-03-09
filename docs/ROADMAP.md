# Weddingifts Development Roadmap

This document tracks the development stages of the Weddingifts project.

---

# Phase 1 - Backend Core (Completed)

- User creation
- Event creation
- Gift creation
- Gift listing
- Public event retrieval

Endpoints implemented:

- POST /api/users
- GET /api/users
- POST /api/events
- GET /api/events/{slug}
- POST /api/events/{eventId}/gifts
- GET /api/events/{eventId}/gifts

---

# Phase 2 - Gift Reservation System (Completed)

- Reserve a gift
- Cancel reservation
- Prevent over-reservation
- Validate quantities

Endpoints implemented:

- POST /api/gifts/{giftId}/reserve
- POST /api/gifts/{giftId}/unreserve

---

# Phase 3 - Backend Validation and Error Handling (Completed)

Implemented validation rules:

- event must exist when creating gifts
- user must exist when creating events
- price must be >= 0
- quantity must be >= 1

Implemented global error handling with ProblemDetails.

---

# Phase 4 - Frontend Public Event MVP (Completed)

Implemented in static HTML/CSS/JavaScript:

- public event page
- real API integration for loading event and gifts
- reserve/cancel actions integrated with backend
- basic loading/success/error feedback

---

# Phase 5 - Automated Quality (Completed)

- Integration tests for reservation and gift validation flows
- GitHub Actions CI running restore/build/test on push and pull_request

---

# Phase 6 - Frontend User Registration Screen (Next)

Implement in `Weddingifts-web`:

- user registration form (name, email, password)
- integration with POST /api/users
- clear UX states (loading, success, error)
- display backend validation errors from ProblemDetails

---

# Phase 7 - Backend Hardening (Planned)

- reservation concurrency hardening
- authentication/authorization
- rate limiting
- logging improvements

---

# Phase 8 - Frontend Evolution (Planned)

- migrate MVP to Next.js + TypeScript
- improve UX states (loading/errors/empty)
- add admin dashboard

---

# Phase 9 - Deployment (Planned)

- Dockerized services
- cloud deployment
- CI/CD evolution

---

# Long-Term Vision

Transform Weddingifts into a SaaS platform that can support multiple events and different celebration types.
