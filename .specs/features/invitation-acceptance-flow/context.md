# Fluxo Público de Aceite de Convite Context

**Gathered:** 2026-04-27
**Spec:** `.specs/features/invitation-acceptance-flow/spec.md`
**Status:** Needs product/architecture review before design

---

## Feature Boundary

This feature changes the existing public event page into a CPF-gated invitation acceptance flow for invited guests. It covers public event loading by slug, guest identification by CPF, guided steps for invite message, RSVP/accompanying guests, optional gifts, event location/details, persisted completion, and a direct-action return menu for guests who already completed the flow.

It also adds event invitation copy, makes cover image URL optional, and extends backend DTOs/schema for invitation-flow completion. It does not implement delivery by e-mail/WhatsApp, tokenized guest links, payments, image upload, or new event privacy policies.

---

## Source Validation

### `.specs/` Findings

- `.specs/project/PROJECT.md` defines the MVP around event creation, guest management, gifts, public reservations, and RSVP.
- `.specs/project/PROJECT.md` and `.specs/codebase/DOMAIN_RULES.md` currently describe enriched event fields as including a required cover image URL.
- `.specs/project/ROADMAP.md` marks Public RSVP and gift/reservation basics as complete, and lists CPF-first guest flow as planned.
- `.specs/codebase/ARCHITECTURE.md` confirms the architecture pattern: thin controllers, business rules in services, DTO boundary, static multipage frontend, and public page through `event.html`.
- `.specs/codebase/CONCERNS.md` flags reservation/RSVP business rules, DTO contracts, shared frontend utilities, global CSS, and mobile layout as fragile areas.
- `.specs/codebase/TESTING.md` confirms backend integration plus frontend smoke are expected for public flow changes.
- `.specs/codebase/MOBILE_TESTING.md` requires manual mobile validation for public event, RSVP, guests, gifts, and shared layout.

### Current Code Findings

- `Weddingifts-web/event.html` currently exposes a slug input in the public page. `Weddingifts-web/js/event.js` does support `?slug=...` prefill and auto-load, but the visible main path still includes manual slug loading.
- `Weddingifts.Api/Controllers/EventRsvpController.cs` already exposes public RSVP contracts under `GET/POST/PUT /api/events/{slug}/rsvp`.
- `Weddingifts.Api/Services/EventRsvpService.cs` already validates invited CPF, blocks duplicate initial RSVP, blocks update before first response, validates companion limits, and uses event time zone for companion age.
- `Weddingifts.Api/Services/EventRsvpService.cs` currently clears companions and dietary restrictions when RSVP is changed to declined.
- `Weddingifts.Api/Services/GiftService.cs` already reserves and cancels gifts by invited guest CPF without requiring RSVP completion.
- `Weddingifts.Api/Models/EventGuestRsvpResponse.cs` currently lacks `hasCompletedInvitationFlow` and `invitationFlowCompletedAt`.
- `Weddingifts.Api/Entities/Event.cs` currently lacks `InvitationMessage`.
- `Weddingifts.Api/Entities/EventGuest.cs` currently lacks `InvitationFlowCompletedAt`.
- `Weddingifts.Api/Services/EventService.cs`, `Weddingifts-web/create-event.html`, `Weddingifts-web/js/my-events.js`, and `Weddingifts-web/js/event-contract.js` currently treat `coverImageUrl` as required for enriched event payloads.
- `frontend-smoke/weddingifts.smoke.spec.js` has existing tests that depend on the current public page structure, including direct gift cards and a standalone RSVP panel.

---

## Implementation Decisions

### Invitation Entry

- The public link remains event-scoped, not guest-scoped.
- The primary public URL is `event.html?slug={slug}`.
- The invited guest must enter CPF before seeing guest-specific RSVP state, completion state, reservations, or direct actions.
- The main path should not require typing the slug. A no-slug state may exist only as an error/fallback for malformed manual access.

### Guided Flow

- The flow has exactly 5 primary steps for the initial acceptance:
  1. CPF and event invitation header.
  2. Couple message.
  3. RSVP and companions.
  4. Gifts.
  5. Location/details and final completion.
- Gifts are optional during initial acceptance.
- Final completion requires an answered RSVP but does not require a gift reservation.
- The step 2 fallback message is fixed by product decision.
- The step 5 final message is fixed by product decision.

### Return Behavior

- Reopening the event link still starts with CPF because the URL does not identify a guest.
- If the RSVP response says the guest has completed the invitation flow, the frontend shows direct actions instead of replaying the stepper.
- Direct actions are:
  - "Presentear casal"
  - "Informações do evento"
  - "Adicionar/editar convidados extras"
  - "Confirmar/cancelar presença"

### RSVP and Companion Behavior

- Current RSVP rules remain the baseline:
  - Initial RSVP uses POST when status is pending.
  - Later RSVP edits use PUT after status is answered.
  - Public statuses are only `accepted` and `declined`.
  - Companion count cannot exceed `maxExtraGuests`.
  - Companion CPF is required at age 16 or older on the event local date.
- Current declined behavior remains the baseline: declining clears companions and dietary restrictions.
- Direct RSVP status editing must avoid accidental companion deletion when the guest remains accepted and only re-saves/reviews status.

### Gift Behavior

- Gift reservation continues to use invited guest CPF.
- The CPF already entered for the flow should be reused; the guest should not need to retype it in the gift step or return-menu gift action.
- Search/filter/sort should improve the gift list but not change reservation business rules.

### Visual and Mobile Behavior

- The primary advance action should be visually persistent:
  - Right-side action on desktop/tablet.
  - Comfortable fixed lower-right action on mobile.
- Mobile design must account for keyboard, CPF fields, companion fields, validation messages, gift actions, and lack of horizontal overflow.

---

## Conflicts and Risks

| ID | Finding | Conflict/Risk | Proposed Adjustment Before Design |
| --- | --- | --- | --- |
| IAF-C01 | Current docs and code require `coverImageUrl` for enriched event payloads. | Product plan requires optional cover image URL. | Treat `coverImageUrl` as optional without making the column nullable: missing/blank persists as empty string; non-empty values still require HTTP/HTTPS URL. Later implementation must update `.specs/codebase/DOMAIN_RULES.md` and related docs. |
| IAF-C02 | Current public page still exposes slug input as a primary UI control. | Product plan says no slug input in the main path. | Use `?slug={slug}` as the primary path. If slug is absent, show an invalid/missing-link fallback rather than making manual slug entry central. |
| IAF-C03 | Current RSVP update to `declined` intentionally clears companions. | Test note says direct confirm/cancel action must not erase companions when only status is reviewed. | Preserve existing declined-clears-companions domain rule. Interpret the new requirement as "do not accidentally send empty companions when status remains accepted." If product wants declined to preserve companions for later restore, that is a domain-rule change and must be explicitly approved before design. |
| IAF-C04 | Current `EventRsvpService` loads the event with `AsNoTracking()` and the guest as tracked. | New completion endpoint must update `EventGuest.InvitationFlowCompletedAt`; reusing the same loading path may not be sufficient. | Add a service path that loads the guest tracked for completion and keeps response mapping consistent. Design should decide whether this lives in `EventRsvpService` or a small invitation-flow service. |
| IAF-C05 | Current `EventGuestRsvpResponse` does not include flow completion fields. | Return-menu behavior depends on those fields after CPF lookup. | Extend the response DTO and test contracts before frontend depends on it. |
| IAF-C06 | Current event create/edit UI and shared event contract require cover image and have no invitation message field. | Backend-only contract additions would leave private UI unable to manage invitation message or empty cover image. | Update create/edit event UI only as needed to support optional cover image and invitation message; avoid broader private-page redesign. |
| IAF-C07 | Current frontend smoke tests target old selectors and public page layout. | Stepper and direct-action menu will break old smoke tests. | Replace affected public RSVP/reservation smoke flows with new invitation flow coverage and keep private flows intact. |
| IAF-C08 | RSVP can be reset to pending by admin changes after a guest completed the flow. | Completion timestamp may conflict with current RSVP validity. | Default proposal: keep `InvitationFlowCompletedAt` as historical completion, but if current RSVP is pending, route the guest back to RSVP before allowing final completion again. Confirm this before design. |

---

## Proposed Adjustments Requiring Approval Before Design

1. **Cover image optionality:** implement blank cover image as empty string, not nullable, while preserving URL validation for non-empty values.
2. **Declined RSVP companion behavior:** keep current rule that declining clears companions and dietary restrictions. The new "do not erase companions" requirement should apply to accepted/status-review submissions, not to declined transitions.
3. **RSVP reset after completion:** keep completion timestamp as historical, but require current RSVP to be answered before showing a completed return state or allowing completion to succeed.
4. **No-slug fallback:** remove slug input from the primary invitation path, but show a clear fallback/error when `event.html` is opened without `?slug=`.
5. **Completion endpoint response:** prefer returning the updated `EventGuestRsvpResponse` for consistency with existing RSVP public flows; a 204 response is possible but would force an extra lookup.

---

## Specific References

- Existing public event entry: `Weddingifts-web/event.html`
- Existing public event logic: `Weddingifts-web/js/event.js`
- Shared enriched event contract: `Weddingifts-web/js/event-contract.js`
- Existing public RSVP controller: `Weddingifts.Api/Controllers/EventRsvpController.cs`
- Existing RSVP rules: `Weddingifts.Api/Services/EventRsvpService.cs`
- Existing gift reservation rules: `Weddingifts.Api/Services/GiftService.cs`
- Existing event create/update validation: `Weddingifts.Api/Services/EventService.cs`
- Existing response DTOs: `Weddingifts.Api/Models/EventResponse.cs` and `Weddingifts.Api/Models/EventGuestRsvpResponse.cs`
- Existing mobile checklist: `.specs/codebase/MOBILE_TESTING.md`
- Existing smoke tests: `frontend-smoke/weddingifts.smoke.spec.js`

No external product references were provided; the user-provided plan is the product source for this context.

---

## Deferred Ideas

- E-mail invitation delivery.
- WhatsApp invitation delivery.
- Tokenized per-guest invite links.
- Payment/PIX/card flows.
- Uploaded/stored event background images.
- Automated mobile viewport smoke coverage beyond the manual checklist.
- Event privacy configuration beyond invited CPF validation.
