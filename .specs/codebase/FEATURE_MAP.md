# Feature Map

**Analyzed:** 2026-04-27

This map describes what exists in the current codebase. It is not a future roadmap.

## Public Frontend

### `index.html`

- Landing page.
- Main public entry point.
- CTA adapts to session state through `landing.js` and `common.js`.

### `register.html`

- User registration.
- Collects name, e-mail, CPF, birth date, and password.
- API: `POST /api/users`.

### `login.html`

- User login.
- Handles `returnTo`, session expiration, logout, and post-registration states.
- API: `POST /api/auth/login`.

### `event.html`

- Public invitation page by `event.html?slug={slug}`.
- Shows enriched event data.
- Identifies invited guests by CPF before showing guest-specific data.
- Runs a guided invitation flow: message, RSVP/companions, optional gifts, location/details, and completion.
- Shows gift list lazily inside the flow with search, availability filters, and sorting.
- Reserves/unreserves gifts by the CPF already entered for the invitation flow.
- Calls completion endpoint after answered RSVP and final location step.
- Shows return-menu direct actions for completed guests: gifts, event information, companion editing, and RSVP status editing.
- APIs:
  - `GET /api/events/{slug}`
  - `GET /api/events/{eventId}/gifts`
  - `GET /api/events/{slug}/rsvp?guestCpf={cpf}`
  - `POST /api/events/{slug}/rsvp`
  - `PUT /api/events/{slug}/rsvp`
  - `POST /api/events/{slug}/invitation-flow/complete`
  - `POST /api/gifts/{giftId}/reserve`
  - `POST /api/gifts/{giftId}/unreserve`

## Private Frontend

### `create-event.html`

- Creates authenticated enriched event.
- Supports optional invitation message and optional cover image URL.
- API: `POST /api/events`.

### `my-events.html`

- Lists authenticated user's events.
- Shows enriched event details.
- Displays and edits invitation message and optional cover image URL.
- Edits and deletes events.
- Copies public link.
- Navigates to guests, gifts, and reservation history.
- APIs:
  - `GET /api/events/mine`
  - `PUT /api/events/{eventId}`
  - `DELETE /api/events/{eventId}`

### `my-guests.html`

- Selects event.
- Lists, creates, edits, and deletes guests.
- Manages `maxExtraGuests`.
- Looks up by CPF within event.
- Shows reservation indicators and active reserved value.
- APIs:
  - `GET /api/events/mine`
  - `GET /api/events/{eventId}/guests`
  - `POST /api/events/{eventId}/guests`
  - `PUT /api/events/{eventId}/guests/{guestId}`
  - `DELETE /api/events/{eventId}/guests/{guestId}`
  - `GET /api/events/{eventId}/guests/by-cpf/{cpf}`
  - `GET /api/events/{eventId}/gifts/reservations`

### `my-event.html`

- Selects event.
- Shows enriched selected-event summary.
- Lists, creates, edits, and deletes gifts.
- Shows reservation history enriched with guest names when possible.
- APIs:
  - `GET /api/events/mine`
  - `GET /api/events/{eventId}/gifts`
  - `POST /api/events/{eventId}/gifts`
  - `PUT /api/events/{eventId}/gifts/{giftId}`
  - `DELETE /api/events/{eventId}/gifts/{giftId}`
  - `GET /api/events/{eventId}/gifts/reservations`
  - `GET /api/events/{eventId}/guests`

### `account.html`

- Shows basic account data.
- Allows authenticated password change with current password.
- API: `PUT /api/users/me/password`.

## Shared Frontend

### `common.js`

- API base inference.
- Fetch/error handling.
- JWT session persistence and expiration checks.
- Private page protection.
- Safe login redirects.
- User dropdown.
- Global mobile header/drawer.
- Shared PT-BR copy.
- Date/currency/status helpers.

### `event-contract.js`

- Shared enriched-event parsing/formatting.
- Supported Brazilian time-zone display.
- Public/private event date-time consistency.

### `styles.css`

- Global visual system.
- Responsive layout.
- Public/private page components.
- Mobile header and drawer.

## Backend by Domain

### Auth

- Files: `AuthController`, `AuthService`, `JwtTokenService`
- Contract: `POST /api/auth/login`

### Users

- Files: `UserController`, `UserService`, `User`
- Contracts:
  - `POST /api/users`
  - `GET /api/users`
  - `PUT /api/users/me/password`

### Events

- Files: `EventController`, `EventService`, `Event`, `EventTimeZoneService`
- Event contract includes optional `invitationMessage` and optional `coverImageUrl`.
- Contracts:
  - `POST /api/events`
  - `PUT /api/events/{eventId}`
  - `DELETE /api/events/{eventId}`
  - `GET /api/events/mine`
  - `GET /api/events/{slug}`

### Guests

- Files: `EventGuestController`, `EventGuestService`, `EventGuest`
- Contracts:
  - `POST /api/events/{eventId}/guests`
  - `PUT /api/events/{eventId}/guests/{guestId}`
  - `DELETE /api/events/{eventId}/guests/{guestId}`
  - `GET /api/events/{eventId}/guests`
  - `GET /api/events/{eventId}/guests/by-cpf/{cpf}`

### RSVP

- Files: `EventRsvpController`, `EventRsvpService`, `EventGuestCompanion`
- Contracts:
  - `GET /api/events/{slug}/rsvp`
  - `POST /api/events/{slug}/rsvp`
  - `PUT /api/events/{slug}/rsvp`
  - `POST /api/events/{slug}/invitation-flow/complete`

### Gifts and Reservations

- Files: `GiftController`, `GiftReservationController`, `GiftService`, `Gift`, `GiftReservation`
- Contracts:
  - `POST /api/events/{eventId}/gifts`
  - `PUT /api/events/{eventId}/gifts/{giftId}`
  - `DELETE /api/events/{eventId}/gifts/{giftId}`
  - `GET /api/events/{eventId}/gifts`
  - `GET /api/events/{eventId}/gifts/reservations`
  - `POST /api/gifts/{giftId}/reserve`
  - `POST /api/gifts/{giftId}/unreserve`

## Existing Tests

Backend:

- `UserAuthIntegrationTests`
- `ChangePasswordIntegrationTests`
- `EventIntegrationTests`
- `EventGuestIntegrationTests`
- `EventRsvpIntegrationTests`
- `GiftReservationIntegrationTests`

Frontend smoke:

- `frontend-smoke/weddingifts.smoke.spec.js`
- `frontend-smoke/support/api-helpers.js`

## Outside Current Implementation

- Payment.
- Real e-mail.
- WhatsApp invitations.
- Event privacy settings.
- File upload/storage for cover image.
- Production deployment automation/runbook.
