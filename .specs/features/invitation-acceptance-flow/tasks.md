# Fluxo Publico de Aceite de Convite Tasks

**Spec:** `.specs/features/invitation-acceptance-flow/spec.md`
**Context:** `.specs/features/invitation-acceptance-flow/context.md`
**Design:** `.specs/features/invitation-acceptance-flow/design.md`
**Status:** Complete - 2026-04-27

---

## Execution Plan

### Phase 1: Backend Contract Foundation

Schema, DTOs, and service rules that frontend work depends on.

```text
T1 -> T2
```

### Phase 2: Private Event Contract UI

Private event forms must understand the new event contract before public smoke data depends on it.

```text
T2 -> T3
```

### Phase 3: Public Invitation Flow

Build the public page in vertical slices. These are sequential because they touch the same public page/script and the smoke suite is not parallel-safe.

```text
T3 -> T4 -> T5 -> T6 -> T7
```

### Phase 4: Documentation and Final Validation

Update living codebase docs after implementation reality changes, then run the final full validation path.

```text
T7 -> T8 -> T9
```

### Full Dependency Graph

```text
T1 Backend event metadata/schema
  -> T2 Backend completion endpoint
    -> T3 Private event UI contract
      -> T4 Public shell and CPF lookup
        -> T5 Public RSVP step
          -> T6 Public gifts step
            -> T7 Completion and return menu
              -> T8 Codebase docs update
                -> T9 Final validation and mobile record
```

**Parallel execution:** none planned. Backend integration tests and frontend smoke are both marked not parallel-safe in `.specs/codebase/TESTING.md`.

---

## Task Breakdown

### T1: Backend Event Metadata and Invitation State Contract

**Status:** Done - 2026-04-27
**What:** Add persisted invitation metadata/state fields, optional cover URL validation, and public response contract fields needed before the completion endpoint.
**Where:**

- `Weddingifts.Api/Entities/Event.cs`
- `Weddingifts.Api/Entities/EventGuest.cs`
- `Weddingifts.Api/Data/AppDbContext.cs`
- `Weddingifts.Api/Migrations/*`
- `Weddingifts.Api/Models/CreateEventRequest.cs`
- `Weddingifts.Api/Models/UpdateEventRequest.cs`
- `Weddingifts.Api/Models/EventResponse.cs`
- `Weddingifts.Api/Models/EventGuestRsvpResponse.cs`
- `Weddingifts.Api/Services/EventService.cs`
- `Weddingifts.Api.IntegrationTests/IntegrationTestBase.cs`
- `Weddingifts.Api.IntegrationTests/EventIntegrationTests.cs`
- `Weddingifts.Api.IntegrationTests/EventRsvpIntegrationTests.cs`

**Depends on:** None
**Reuses:** `EventService` normalization patterns, `InputThreatValidator`, `EventResponse.FromEntity`, `EventGuestRsvpResponse.FromEntity`, xUnit integration-test helpers.
**Requirements:** IAF-01, IAF-04, IAF-07, IAF-09

**Tools:**

- MCP: none
- Skill: `tlc-spec-driven`

**Done when:**

- [x] `Event.InvitationMessage` exists, is non-null, max length 500, and defaults to empty string.
- [x] `EventGuest.InvitationFlowCompletedAt` exists as nullable `DateTime?`.
- [x] A focused EF migration adds both new columns and keeps `CoverImageUrl` non-null.
- [x] `CreateEventRequest` and `UpdateEventRequest` accept `invitationMessage`.
- [x] `EventResponse` returns `invitationMessage`.
- [x] `EventGuestRsvpResponse` returns `hasCompletedInvitationFlow` and `invitationFlowCompletedAt`.
- [x] `EventService` persists optional invitation message without triggering enriched payload validation by itself.
- [x] `EventService` persists missing/blank `coverImageUrl` as `""` and validates non-empty cover URLs as HTTP/HTTPS.
- [x] Integration tests cover create/update event with `invitationMessage`.
- [x] Integration tests cover create/update enriched event without/with blank `coverImageUrl`.
- [x] Integration tests cover RSVP lookup before completion returning `hasCompletedInvitationFlow=false` and `invitationFlowCompletedAt=null`.
- [x] Gate check passes: `dotnet build Weddingifts.Api/Weddingifts.Api.sln` then `dotnet test Weddingifts.Api/Weddingifts.Api.sln`.
- [x] Test count: backend integration suite now runs 54 tests, with no silent test deletion.

**Tests:** Integration
**Gate:** Backend
**Verify:**

```powershell
dotnet build Weddingifts.Api/Weddingifts.Api.sln
dotnet test Weddingifts.Api/Weddingifts.Api.sln
```

Expected: build succeeds, integration suite succeeds, new event/RSVP contract assertions pass.

**Commit:** `feat(invitation-flow): add invitation metadata contracts`

---

### T2: Backend Invitation Flow Completion Endpoint

**Status:** Done - 2026-04-27
**What:** Add the public completion endpoint that marks an invited guest's current invitation flow as completed only after RSVP is answered.
**Where:**

- `Weddingifts.Api/Models/CompleteInvitationFlowRequest.cs`
- `Weddingifts.Api/Controllers/EventRsvpController.cs`
- `Weddingifts.Api/Services/EventRsvpService.cs`
- `Weddingifts.Api.IntegrationTests/EventRsvpIntegrationTests.cs`
- `Weddingifts.Api.IntegrationTests/IntegrationTestBase.cs`

**Depends on:** T1
**Reuses:** Existing RSVP slug/CPF loading, `EventGuestService.NormalizeCpf`, `DomainValidationException`, RSVP reset rules, `EventGuestRsvpResponse.FromEntity`.
**Requirements:** IAF-03, IAF-04, IAF-05, IAF-09

**Tools:**

- MCP: none
- Skill: `tlc-spec-driven`

**Done when:**

- [x] `CompleteInvitationFlowRequest { GuestCpf }` exists.
- [x] `POST /api/events/{slug}/invitation-flow/complete` exists on the public RSVP controller surface.
- [x] The endpoint delegates to `EventRsvpService.CompleteInvitationFlowAsync`.
- [x] Completion validates slug, CPF, invited guest membership, and answered RSVP.
- [x] Completion blocks `pending` RSVP.
- [x] Completion succeeds for `accepted` RSVP and returns `EventGuestRsvpResponse`.
- [x] Completion succeeds for `declined` RSVP and returns `EventGuestRsvpResponse`.
- [x] Completion is idempotent and keeps the original timestamp.
- [x] Existing RSVP reset path clears `InvitationFlowCompletedAt` when resetting to `pending`.
- [x] Integration tests cover not-invited CPF, pending RSVP block, accepted completion, declined completion, idempotency, and reset clearing completion.
- [x] Gate check passes: `dotnet build Weddingifts.Api/Weddingifts.Api.sln` then `dotnet test Weddingifts.Api/Weddingifts.Api.sln`.
- [x] Test count: backend integration suite now runs 61 tests, with no silent test deletion.

**Tests:** Integration
**Gate:** Backend
**Verify:**

```powershell
dotnet build Weddingifts.Api/Weddingifts.Api.sln
dotnet test Weddingifts.Api/Weddingifts.Api.sln
```

Expected: completion endpoint tests pass and existing RSVP/reservation tests still pass.

**Commit:** `feat(invitation-flow): add public completion endpoint`

---

### T3: Private Event Forms Support Invitation Message and Optional Cover

**Status:** Done - 2026-04-27
**What:** Update private event create/edit UI and shared event contract helpers for `invitationMessage` and optional `coverImageUrl`.
**Where:**

- `Weddingifts-web/create-event.html`
- `Weddingifts-web/js/create-event.js`
- `Weddingifts-web/js/event-contract.js`
- `Weddingifts-web/js/my-events.js`
- `frontend-smoke/support/api-helpers.js`
- `frontend-smoke/weddingifts.smoke.spec.js`

**Depends on:** T2
**Reuses:** Existing enriched event form helpers, `requestJson`, create-event smoke setup, my-events edit form pattern.
**Requirements:** IAF-07, IAF-09

**Tools:**

- MCP: none
- Skill: `tlc-spec-driven`

**Done when:**

- [x] Create event form has an optional invitation message field with PT-BR label/copy.
- [x] Create event form no longer requires cover image URL in HTML or JS validation.
- [x] Shared event contract reads/builds `invitationMessage`.
- [x] Shared event contract validates `coverImageUrl` only when non-empty.
- [x] My-events edit form includes `invitationMessage` and supports blank `coverImageUrl`.
- [x] Frontend smoke helper can create enriched events with invitation message and without cover image.
- [x] Frontend smoke validates event creation works when cover image URL is omitted and invitation message is sent.
- [x] Gate check passes: `cmd /c npm run test:frontend-smoke`.
- [x] Test count: frontend smoke remains 6 tests; updated create-event coverage asserts the new contract.

**Tests:** Frontend smoke + manual review for private form layout
**Gate:** Frontend smoke
**Verify:**

```powershell
cmd /c npm run test:frontend-smoke
```

Expected: smoke suite succeeds, create-event flow creates an event without cover URL and includes invitation message in API-created data.

**Commit:** `feat(invitation-flow): support invitation message in event forms`

---

### T4: Public Invitation Shell and CPF Lookup

**Status:** Done - 2026-04-27
**What:** Replace the public page's primary slug-input flow with a slug-query invitation shell and CPF lookup step.
**Where:**

- `Weddingifts-web/event.html`
- `Weddingifts-web/js/event.js`
- `Weddingifts-web/styles.css`
- `frontend-smoke/weddingifts.smoke.spec.js`

**Depends on:** T3
**Reuses:** Existing `event.js` event loading, CPF formatter/validator, RSVP lookup, event date formatting, `setStatus`, and public error handling.
**Requirements:** IAF-01, IAF-02

**Tools:**

- MCP: none
- Skill: `tlc-spec-driven`

**Done when:**

- [x] `event.html?slug={slug}` loads the event without a primary slug input.
- [x] Opening `event.html` without slug renders a missing-link fallback.
- [x] The invitation shell renders event name, date/time, couple names, and CPF entry.
- [x] CPF validation blocks malformed CPF before guest-specific API calls.
- [x] Invited CPF lookup loads RSVP state and moves into the invitation flow.
- [x] Not-invited CPF shows the backend validation message without guest data leakage.
- [x] Stable selectors exist for root, status, CPF input, step panel, and advance action.
- [x] Scoped CSS supports the shell without broad global layout changes.
- [x] Frontend smoke covers opening public link, entering invited CPF, and seeing the guided flow start.
- [x] Gate check passes: `cmd /c npm run test:frontend-smoke`.
- [x] Test count: frontend smoke now runs 7 tests, adding public identification coverage with no silent deletion.

**Tests:** Frontend smoke + manual public-page layout review
**Gate:** Frontend smoke
**Verify:**

```powershell
cmd /c npm run test:frontend-smoke
```

Expected: public event opens from query slug, CPF lookup works, old standalone slug flow is no longer the primary path.

**Commit:** `feat(invitation-flow): add public invitation shell`

---

### T5: Public RSVP Step and Companion Payload Safety

**Status:** Done - 2026-04-27
**What:** Move RSVP/companion editing into the invitation stepper and prevent accidental companion deletion on accepted-status review.
**Where:**

- `Weddingifts-web/js/event.js`
- `Weddingifts-web/styles.css`
- `frontend-smoke/weddingifts.smoke.spec.js`

**Depends on:** T4
**Reuses:** Existing RSVP form rendering, companion field rendering, age/CPF validation, POST/PUT RSVP method selection, backend RSVP validation messages.
**Requirements:** IAF-02, IAF-03, IAF-05

**Tools:**

- MCP: none
- Skill: `tlc-spec-driven`

**Done when:**

- [x] The guided flow renders the message step before RSVP using `event.invitationMessage` or fallback copy.
- [x] RSVP step supports accepted/declined status, optional message, dietary restrictions, and companions up to `maxExtraGuests`.
- [x] Initial pending RSVP uses POST and answered RSVP uses PUT.
- [x] Companion CPF requirement still follows event-date age rules.
- [x] Accepted RSVP update hydrates existing companions before submit.
- [x] Re-saving accepted RSVP without changing companion count preserves existing companions.
- [x] Explicit companion count 0 removes companions only when chosen by the guest.
- [x] Declined RSVP still clears companions and dietary restrictions per backend rule.
- [x] Frontend smoke covers accepted RSVP, companion age/CPF behavior, accepted re-save preservation, and declined clearing.
- [x] Gate check passes: `cmd /c npm run test:frontend-smoke`.
- [x] Test count: frontend smoke remains 7 tests, with expanded RSVP/companion assertions and no silent deletion.

**Tests:** Frontend smoke + manual RSVP layout review
**Gate:** Frontend smoke
**Verify:**

```powershell
cmd /c npm run test:frontend-smoke
```

Expected: RSVP behavior matches existing domain rules inside the guided flow and preserves accepted companions on review.

**Commit:** `feat(invitation-flow): add RSVP step to public flow`

---

### T6: Public Gift Step with Search, Filters, Sorting, and Optional Reservation

**Status:** Done - 2026-04-27
**What:** Add the gift step to the guided flow with client-side search/filter/sort and optional reservation by the already informed CPF.
**Where:**

- `Weddingifts-web/js/event.js`
- `Weddingifts-web/styles.css`
- `frontend-smoke/weddingifts.smoke.spec.js`

**Depends on:** T5
**Reuses:** Existing gift list rendering helpers, `availableUnits`, `reservedUnits`, `badgeForGift`, reservation/cancellation API calls, currency formatting.
**Requirements:** IAF-06, IAF-08

**Tools:**

- MCP: none
- Skill: `tlc-spec-driven`

**Done when:**

- [x] Gift step loads gifts lazily from `GET /api/events/{eventId}/gifts`.
- [x] Gift step searches by name and description.
- [x] Gift step filters by all, available, and reserved.
- [x] Gift step sorts by availability, price ascending, price descending, and name ascending.
- [x] Reservation uses `state.guestCpf` without asking the guest to retype CPF.
- [x] Cancellation uses `state.guestCpf` and preserves existing backend behavior.
- [x] Fully reserved gifts cannot be reserved.
- [x] Empty gift list or no matching filters shows a clear empty state.
- [x] The guest can continue without reserving a gift.
- [x] Frontend smoke covers no-gift skip, gift reservation, and at least one search/filter/sort path.
- [x] Gate check passes: `cmd /c npm run test:frontend-smoke`.
- [x] Test count: frontend smoke now runs 8 tests, adding gift-step assertions with no silent deletion.

**Tests:** Frontend smoke + manual gift-step layout review
**Gate:** Frontend smoke
**Verify:**

```powershell
cmd /c npm run test:frontend-smoke
```

Expected: gift step works inside the flow, optional skip is possible, and reservation still obeys invited-CPF rules.

**Commit:** `feat(invitation-flow): add optional gift step`

---

### T7: Completion Step, Return Menu, and Direct Actions

**Status:** Done - 2026-04-27
**What:** Add the location/completion step, call the completion endpoint, and render return-menu direct actions for completed guests.
**Where:**

- `Weddingifts-web/js/event.js`
- `Weddingifts-web/styles.css`
- `frontend-smoke/support/api-helpers.js`
- `frontend-smoke/weddingifts.smoke.spec.js`

**Depends on:** T6
**Reuses:** Event detail rendering, Maps link rendering, completion endpoint from T2, RSVP/gift direct action functions from earlier tasks.
**Requirements:** IAF-02, IAF-04, IAF-05, IAF-06

**Tools:**

- MCP: none
- Skill: `tlc-spec-driven`

**Done when:**

- [x] Location step shows location name, address, Maps link, ceremony info, dress code, date/time, and "Esperamos você lá."
- [x] Completion action calls `POST /api/events/{slug}/invitation-flow/complete` with stored CPF.
- [x] Completion blocks or routes back to RSVP if current RSVP is pending.
- [x] Completion success renders final success state.
- [x] Reopening the link and entering the same CPF shows the return menu when `hasCompletedInvitationFlow=true`.
- [x] Return menu includes "Presentear casal", "Informações do evento", "Adicionar/editar convidados extras", and "Confirmar/cancelar presença".
- [x] Direct "Presentear casal" opens gifts and reserves by stored CPF.
- [x] Direct "Informações do evento" opens event details without replaying the stepper.
- [x] Direct RSVP actions open RSVP editing and preserve accepted companions unless explicitly changed.
- [x] Frontend smoke covers full completion, reopen return menu, direct gift action, direct info action, and direct RSVP action.
- [x] Gate check passes: `cmd /c npm run test:frontend-smoke`.
- [x] Test count: frontend smoke remains 8 tests after T7, with added completion/return-menu assertions and no silent deletion.

**Tests:** Frontend smoke + manual return-menu layout review
**Gate:** Frontend smoke
**Verify:**

```powershell
cmd /c npm run test:frontend-smoke
```

Expected: full public invitation flow completes, and completed guests get direct actions after CPF lookup.

**Commit:** `feat(invitation-flow): add completion and return menu`

---

### T8: Update Living Codebase Documentation

**Status:** Done - 2026-04-27
**What:** Update `.specs/codebase/*` so living documentation reflects the implemented invitation flow and changed event/RSVP rules.
**Where:**

- `.specs/codebase/DOMAIN_RULES.md`
- `.specs/codebase/FEATURE_MAP.md`
- `.specs/codebase/ARCHITECTURE.md` if the public flow diagram or data flow needs adjustment
- `.specs/codebase/TESTING.md` if smoke coverage descriptions change materially
- `.specs/features/invitation-acceptance-flow/tasks.md` status notes, if implementation status is tracked there

**Depends on:** T7
**Reuses:** Existing `.specs` documentation conventions.
**Requirements:** IAF-09

**Tools:**

- MCP: none
- Skill: `tlc-spec-driven`

**Done when:**

- [x] Domain rules mention optional `coverImageUrl`, `invitationMessage`, and invitation flow completion semantics.
- [x] Feature map lists the new completion endpoint and updated public event flow.
- [x] Testing docs reflect updated smoke coverage if the public smoke suite changes shape.
- [x] No archived `old/` docs are edited.
- [x] Documentation gate passes: `rg --files -u -g '*.md'` and `git status --short`.

**Tests:** Documentation
**Gate:** Documentation
**Verify:**

```powershell
rg --files -u -g '*.md'
git status --short
```

Expected: only intended living docs are updated and no implementation files are unintentionally changed in this task.

**Commit:** `docs(invitation-flow): update codebase documentation`

---

### T9: Final Full Validation and Mobile Record

**Status:** Done - 2026-04-27
**What:** Run final cross-stack gates and record manual mobile validation evidence for the public invitation flow.
**Where:**

- `.specs/features/invitation-acceptance-flow/validation.md` (new, if a validation record is kept)
- Existing implementation files only if a validation failure requires a focused fix

**Depends on:** T8
**Reuses:** `.specs/codebase/TESTING.md` gate commands and `.specs/codebase/MOBILE_TESTING.md` checklist.
**Requirements:** IAF-01, IAF-02, IAF-03, IAF-04, IAF-05, IAF-06, IAF-07, IAF-08, IAF-09

**Tools:**

- MCP: none
- Skill: `tlc-spec-driven`
- Skill: `browser-use:browser` if interactive local browser verification is requested during execution

**Done when:**

- [x] Backend build passes.
- [x] Backend integration tests pass.
- [x] Frontend smoke passes.
- [x] Manual mobile validation follows `.specs/codebase/MOBILE_TESTING.md` for the public page.
- [x] Mobile record includes date, viewport/device, browser, pages checked, issues found, and pass/fail/partial result.
- [x] Any validation failure either has a focused fix in the same task with its gate re-run, or is documented as a blocker.

**Tests:** Full + manual mobile
**Gate:** Full
**Verify:**

```powershell
dotnet build Weddingifts.Api/Weddingifts.Api.sln
dotnet test Weddingifts.Api/Weddingifts.Api.sln
cmd /c npm run test:frontend-smoke
```

Expected: backend build/test and frontend smoke pass; manual mobile record is present and complete.

**Commit:** `test(invitation-flow): validate public invitation flow`

---

## Parallel Execution Map

```text
Phase 1:
  T1 -> T2

Phase 2:
  T2 -> T3

Phase 3:
  T3 -> T4 -> T5 -> T6 -> T7

Phase 4:
  T7 -> T8 -> T9
```

**Parallelism constraint:** no task is marked `[P]` because the required integration/smoke gates are not parallel-safe, and the public frontend tasks share `event.html`, `event.js`, `styles.css`, and the smoke file.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | One backend event/RSVP contract foundation slice with co-located integration tests | OK - cohesive contract slice |
| T2 | One backend endpoint/service behavior slice with co-located integration tests | OK - one endpoint |
| T3 | One private event-form contract slice with co-located smoke coverage | OK - one UI contract surface |
| T4 | One public identify/shell slice with co-located smoke coverage | OK - one flow step |
| T5 | One public RSVP step slice with co-located smoke coverage | OK - one flow step |
| T6 | One public gift step slice with co-located smoke coverage | OK - one flow step |
| T7 | One completion/return-menu slice with co-located smoke coverage | OK - one flow outcome |
| T8 | One documentation sync slice | OK - docs only |
| T9 | One final validation/mobile record slice | OK - validation only |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | Start | Match |
| T2 | T1 | T1 -> T2 | Match |
| T3 | T2 | T2 -> T3 | Match |
| T4 | T3 | T3 -> T4 | Match |
| T5 | T4 | T4 -> T5 | Match |
| T6 | T5 | T5 -> T6 | Match |
| T7 | T6 | T6 -> T7 | Match |
| T8 | T7 | T7 -> T8 | Match |
| T9 | T8 | T8 -> T9 | Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Entities, EF mappings, models, service/business rules | Integration + migration review | Integration, Backend gate | OK |
| T2 | Controller, service/business rules, models | Integration | Integration, Backend gate | OK |
| T3 | Frontend private flows and shared event contract JS | Smoke + manual | Frontend smoke + manual review | OK |
| T4 | Frontend public flow, page HTML, JS, CSS | Smoke + manual | Frontend smoke + manual review | OK |
| T5 | Frontend public RSVP flow, JS, CSS | Smoke + manual | Frontend smoke + manual review | OK |
| T6 | Frontend public gift flow, JS, CSS | Smoke + manual | Frontend smoke + manual review | OK |
| T7 | Frontend public completion/return flow, JS, CSS | Smoke + manual | Frontend smoke + manual review | OK |
| T8 | Documentation only | Documentation review | Documentation gate | OK |
| T9 | Cross-stack validation and mobile record | Full + manual mobile | Full gate + manual mobile | OK |

---

## Execution Tooling Prompt Before Execute

Before executing these tasks, confirm the tool preference for each task. Proposed defaults:

| Task Range | Proposed Tools |
| --- | --- |
| T1-T2 | Shell for inspection/tests, `apply_patch` for edits, `tlc-spec-driven` |
| T3-T7 | Shell for inspection/tests, `apply_patch` for edits, `tlc-spec-driven`; optionally `browser-use:browser` for local visual checks |
| T8 | Shell for inventory/status, `apply_patch` for docs, `tlc-spec-driven` |
| T9 | Shell for gates, `browser-use:browser` if interactive browser validation is requested, `tlc-spec-driven` |
