# Roadmap

**Current Milestone:** MVP delivery preparation - Wedding core
**Status:** In Progress
**Last Reviewed:** 2026-04-27

This roadmap describes planned delivery state. When roadmap and code conflict, inspect the code first, then update this document.

---

## Milestone 1: MVP Foundation

**Goal:** Provide the complete baseline for account, event, guest, gift, and reservation management.
**Target:** Complete in code; still part of the pre-MVP stabilization baseline.

### Features

**Account and Auth** - COMPLETE

- Register user with name, e-mail, CPF, birth date, and strong password
- Log in with JWT
- Persist and expire frontend sessions safely
- Change password with current password confirmation

**Event Management** - COMPLETE

- Create event
- List user's events
- Edit event
- Delete event when business rules allow
- Generate public slug

**Guest Management** - COMPLETE

- Create, list, edit, and delete guests by event
- Validate CPF, e-mail, phone, and owner authorization
- Lookup guest by CPF within event

**Gift Management and Reservation** - COMPLETE

- Create, list, edit, and delete gifts by event
- Reserve and cancel reservation by invited guest CPF
- Keep private reservation history
- Block unsafe mutation when active reservations exist

---

## Milestone 2: Wedding Core

**Goal:** Make the public event page useful for real wedding coordination before MVP delivery.
**Target:** Complete when private confirmation counts, filters, and remaining business policies are verified.

### Features

**Enriched Event Details** - COMPLETE

- Persist and display couple names, date/time, time zone, location, maps URL, ceremony details, dress code, and cover image URL
- Format event date/time according to event time zone

**Public RSVP** - COMPLETE

- Allow invited guest to consult RSVP by CPF
- Allow accepted/declined response
- Collect message and dietary restrictions
- Manage companions up to `maxExtraGuests`
- Require companion CPF conditionally by age on event date

**Private RSVP Counts** - PLANNED

- Show accepted, declined, and pending counts in private management views
- Keep counts consistent with RSVP resets after administrative changes

**Gift and Guest Filters** - PLANNED

- Add useful filters in private gift management
- Add useful filters in private guest management
- Keep public gift filtering clear on desktop and mobile

**Final Product Policies** - PLANNED

- Close final policy for editing reserved gifts
- Close final policy for deleting events with reservations and guests

---

## Milestone 3: Privacy and Product Rules

**Goal:** Prepare the product for safer real-world pilot usage.

### Features

**Event Privacy Controls** - PLANNED

- Configurable privacy per event
- Rule for whether only invited guests can gift

**CPF-First Guest Flow** - PLANNED

- Reduce friction for guests without requiring an account
- Keep CPF validation and privacy boundaries explicit

**Safer Destructive Actions** - PLANNED

- Password confirmation for event deletion
- Improved reservation list for couples

---

## Milestone 4: Invitations, Payment, and Closing

**Goal:** Explore post-MVP capabilities that are not confirmed in current code.

### Features

**Invitations** - PLANNED

- WhatsApp invitation flow
- E-mail invitation flow

**Payments** - PLANNED

- PIX transfer flow
- Payment validation for reservation confirmation
- Card integration

**Event Closing** - PLANNED

- Finalized event rules
- Countdown and post-event states

---

## Future Considerations

- Production deployment strategy
- Observability and error monitoring
- External storage for cover images
- Automated mobile viewport coverage
