# Domain Rules

**Analyzed:** 2026-04-27

These rules are confirmed in current code or migrated from the previous live documentation. If this file conflicts with code, inspect the code and update this file.

## User

Source: `Weddingifts.Api/Services/UserService.cs`

- Name is required.
- Name has max length 120.
- Name must contain only letters, accents, apostrophes, hyphens, and spaces according to current validation.
- E-mail is required.
- E-mail has max length 255.
- E-mail must have valid format.
- E-mail must be unique.
- CPF is required in current registration.
- CPF is normalized to digits only.
- CPF must be valid.
- CPF must be unique.
- Birth date is required.
- Birth date cannot be in the future.
- Password must have at least 8 characters.
- Password must have max length 72.
- Password must contain letter, number, and special character.

## Authentication

Sources: `AuthService`, `JwtTokenService`

- Login uses e-mail and password.
- Login normalizes e-mail to lowercase.
- Invalid login returns a generic invalid credentials message.
- Login response includes JWT token, expiration, and user data.
- JWT includes user id, name, e-mail, and CPF.
- JWT signing key must be configured and at least 32 bytes.

## Event

Source: `EventService`

- Event name is required.
- Event name has max length 120.
- Legacy `eventDate` remains accepted.
- Enriched event payload requires host names, event date/time, time zone, location name, location address, Maps URL, ceremony info, and dress code.
- `coverImageUrl` is optional; blank or missing values are persisted as an empty string.
- Non-empty `coverImageUrl` values must be absolute HTTP/HTTPS URLs.
- `invitationMessage` is optional and has max length 500.
- `eventDateTime` is the canonical event instant and is persisted as UTC.
- `timeZoneId` must be a supported Brazilian time zone.
- Event local date/time must be in the future according to event time zone.
- Slug is generated automatically and must be unique.
- Only event owner can edit or delete.
- Deleting an event is blocked when active reservations exist.
- Administrative temporal changes may reset incompatible RSVP state to `pending`.

## Guest

Source: `EventGuestService`

- Guest belongs to one event.
- Only event owner can manage guests.
- Guest CPF is required.
- CPF is normalized to digits only.
- CPF must be valid.
- CPF must be unique per event.
- Guest name is required.
- Guest name has max length 120.
- Guest name accepts only valid person-name characters according to code.
- Guest e-mail is required.
- Guest e-mail has max length 120.
- Guest e-mail must have valid format.
- Phone number is required.
- Phone number must have 10 or 11 digits.
- `maxExtraGuests` belongs to the main guest.
- `maxExtraGuests` defaults to 0.
- `maxExtraGuests` cannot be negative.
- Reducing `maxExtraGuests` below saved companion count resets guest RSVP to `pending`.

## RSVP and Companions

Sources: `EventRsvpService`, `EventTimeZoneService`

- RSVP status for the main guest is `pending`, `accepted`, or `declined`.
- Public write contract accepts only `accepted` and `declined`.
- `GET /api/events/{slug}/rsvp` requires `guestCpf`.
- `POST /api/events/{slug}/rsvp` requires the guest to still be `pending`.
- `PUT /api/events/{slug}/rsvp` requires the guest to have already responded.
- `GET /api/events/{slug}/rsvp` exposes `hasCompletedInvitationFlow` and `invitationFlowCompletedAt`.
- `POST /api/events/{slug}/invitation-flow/complete` requires invited `guestCpf` and an answered RSVP.
- Invitation flow completion is idempotent and stores `InvitationFlowCompletedAt` on the guest.
- Resetting an RSVP to `pending` clears `InvitationFlowCompletedAt`.
- `accepted` allows companions up to `maxExtraGuests`.
- `declined` removes companions and clears dietary restrictions.
- `messageToCouple` is optional.
- `dietaryRestrictions` is optional and applies only to accepted RSVP.
- Companion belongs to a specific main guest.
- Companion name is required and has max length 120.
- Companion birth date is required.
- Companion birth date cannot be later than the event local date.
- Companion age is calculated on the event local date using event `timeZoneId`.
- Companion CPF is required when age on event date is at least 16.
- Companion CPF is optional when age on event date is under 16.
- If provided, companion CPF must be valid.
- Companion CPF cannot repeat in the same RSVP.
- Companion CPF cannot match a main guest CPF in the same event.
- Companion CPF cannot match another saved companion CPF in the same event.
- Administrative event/guest changes that invalidate companion data reset RSVP to `pending`.

## Gift

Source: `GiftService`

- Gift belongs to one event.
- Only event owner can create, edit, or delete gifts.
- Gift name is required.
- Gift name has max length 255.
- Description is optional.
- Description has max length 120.
- Price must be greater than zero.
- Price must be less than 1,000,000.
- Quantity must be at least 1.
- Quantity must be at most 100,000.

When active reservations exist:

- Name cannot be changed.
- Description cannot be changed.
- Price cannot be changed.
- Quantity cannot be reduced below already reserved quantity.
- Gift cannot be deleted.

## Gift Reservation

Source: `GiftService`

- Reservation is made by CPF without guest login.
- CPF used for reservation must belong to an invited guest for the event.
- Gift must exist.
- Gift cannot be reserved above available quantity.
- Fully reserved gift cannot receive another reservation.
- Cancellation requires an active reservation by the same CPF.
- History tracks reserved, unreserved, and active quantity.
- `ReservedBy` and `ReservedAt` reflect latest known active reservation state.

## Session and Private Navigation

Sources: `Weddingifts-web/js/common.js`, `login.js`, `register.js`, `create-event.js`

- Private pages require valid JWT session.
- Expired session clears local data and redirects to login.
- `returnTo` accepts only safe internal paths.
- `returnTo` cannot point to `login.html`.
- After registration, user goes to login with safe create-event return path.
- After login without safe `returnTo`, user goes to `my-events.html` if they have events, otherwise `create-event.html`.
- After event creation, user goes to `my-events.html?focusEventId=...`.

## Not Implemented

No confirmed implementation exists for:

- Upload/visual management of cover image files.
- Real e-mail confirmation.
- Payment.
- Event privacy configuration.
