# Fluxo Público de Aceite de Convite Specification

## Problem Statement

A página pública atual do evento permite carregar um evento por slug, consultar RSVP por CPF, responder presença e reservar presentes, mas essas ações aparecem como blocos soltos. Para o convidado real, o link precisa se comportar como um convite guiado: primeiro identificar o convidado por CPF, depois conduzir pela mensagem do casal, RSVP/acompanhantes, presentes opcionais e informações finais do evento.

Esta feature transforma o link público por evento em um fluxo de aceite em 5 etapas e registra quando o convidado concluiu o fluxo. Ao reabrir o link, como ele continua não identificando o convidado sozinho, o CPF continua sendo necessário antes de mostrar ações diretas.

## Goals

- [x] Permitir que um convidado abra o link público do evento, informe CPF e conclua o convite em 5 etapas sem precisar de conta.
- [x] Manter presentes opcionais no aceite inicial, sem bloquear conclusão por falta de reserva.
- [x] Registrar conclusão do fluxo por convidado e expor esse estado no contrato público de RSVP.
- [x] Permitir retorno ao link com CPF e mostrar menu direto para presentes, informações, acompanhantes e presença quando o fluxo já estiver concluído.
- [x] Permitir mensagem personalizada do convite por evento com fallback padrão e imagem de capa opcional.
- [x] Preservar regras existentes de CPF convidado, RSVP, acompanhantes, reservas e validações de evento.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Envio real por e-mail ou WhatsApp | O casal continuará copiando/enviando o link público do evento manualmente. |
| Link público identificado por convidado/token | A decisão inicial mantém o link por evento; CPF é informado ao abrir ou reabrir. |
| Pagamento, PIX ou checkout | Presentes continuam como reserva de lista, sem pagamento. |
| Upload/armazenamento de imagem | `coverImageUrl` pode ser vazio ou URL externa, sem upload de arquivo. |
| Privacidade avançada do evento | A feature usa as regras atuais de convidado por CPF e não cria política nova de visibilidade. |
| Redesign de páginas privadas além do necessário para novos campos | Ajustes privados ficam limitados a criar/editar/exibir `invitationMessage` e capa opcional. |

---

## Product Decisions

- O link público continua sendo por evento: `event.html?slug={slug}`.
- O convidado sempre informa CPF antes de acessar o fluxo ou o menu de retorno.
- Concluir o fluxo significa chegar à etapa final e clicar em confirmar conclusão.
- Reservar presente é opcional e não conclui o aceite por si só.
- O fallback da mensagem do convite é: "Com muita alegria, convidamos você para celebrar este dia tão especial conosco. Sua presença tornará nossa comemoração ainda mais completa."
- A mensagem final da etapa de local é: "Esperamos você lá."
- A ação de avançar fica lateral à direita em desktop/tablet e fixa no canto inferior direito em mobile, respeitando conforto de toque e sem overflow.

---

## Public Contracts

### Backend

- `Event` SHALL persist a new optional `InvitationMessage` field.
- `EventGuest` SHALL persist a new nullable `InvitationFlowCompletedAt` field.
- `CreateEventRequest` SHALL accept optional `invitationMessage`.
- `UpdateEventRequest` SHALL accept optional `invitationMessage`.
- `CreateEventRequest` and `UpdateEventRequest` SHALL treat `coverImageUrl` as optional.
- `EventResponse` SHALL expose `invitationMessage`.
- `EventGuestRsvpResponse` SHALL expose `hasCompletedInvitationFlow`.
- `EventGuestRsvpResponse` SHALL expose `invitationFlowCompletedAt`.
- The API SHALL add `CompleteInvitationFlowRequest { guestCpf }`.
- The API SHALL add anonymous/public `POST /api/events/{slug}/invitation-flow/complete`.

### Completion Endpoint Rules

1. WHEN `guestCpf` is not a valid CPF THEN the endpoint SHALL return validation failure.
2. WHEN the CPF does not belong to the event slug THEN the endpoint SHALL return validation failure.
3. WHEN the invited guest RSVP is still `pending` THEN the endpoint SHALL block completion.
4. WHEN the invited guest RSVP is `accepted` or `declined` THEN the endpoint SHALL set `InvitationFlowCompletedAt` if not already set.
5. WHEN the flow was already completed THEN the endpoint SHALL remain idempotent and keep the original completion timestamp unless a later design explicitly chooses otherwise.
6. WHEN completion succeeds THEN a subsequent RSVP lookup SHALL return `hasCompletedInvitationFlow=true` and `invitationFlowCompletedAt` populated.

### Cover Image Optionality

1. WHEN `coverImageUrl` is missing, `null`, or whitespace THEN backend SHALL persist an empty string and SHALL NOT validate it as URL.
2. WHEN `coverImageUrl` is non-empty THEN backend SHALL validate it as an absolute HTTP/HTTPS URL.
3. WHEN `coverImageUrl` is empty THEN public frontend SHALL render the event without a broken image or required-image error.

---

## User Stories

### P1: Identify Invited Guest - MVP

**User Story**: As a wedding guest, I want to open the event link and identify myself with my CPF so that I can access the invitation meant for me.

**Why P1**: The link stays event-scoped and does not identify the guest; CPF is the privacy boundary for RSVP and reservations.

**Acceptance Criteria**:

1. WHEN the guest opens `event.html?slug={slug}` THEN the system SHALL load the event from the slug without requiring a slug input in the main path.
2. WHEN the guest informs a valid invited CPF THEN the system SHALL load RSVP state for that event and guest.
3. WHEN the CPF is invalid THEN the system SHALL show a PT-BR validation message before calling guest-specific actions.
4. WHEN the CPF is valid but not invited THEN the system SHALL show the existing not-invited validation response without exposing another guest's data.
5. WHEN the event slug is missing or invalid THEN the system SHALL show a clear public error state.

**Independent Test**: Open a public event URL, enter an invited CPF, and verify the first flow state loads with the correct guest.

---

### P1: Guided Five-Step Invitation Flow - MVP

**User Story**: As a wedding guest, I want a guided invitation flow so that I know what to read and answer in the right order.

**Why P1**: This is the core user-facing transformation from public utility page to invitation acceptance.

**Acceptance Criteria**:

1. WHEN the invited CPF is accepted THEN the system SHALL show step 1 with "Você foi convidado para o evento {nome}", date/time, couple names, and CPF context.
2. WHEN the guest advances THEN the system SHALL show step 2 with the couple invitation message or the fallback message.
3. WHEN the guest advances THEN the system SHALL show step 3 for RSVP, optional message, dietary restrictions, and companions up to `maxExtraGuests`.
4. WHEN the guest advances THEN the system SHALL show step 4 with gift list and optional reservation by the already informed CPF.
5. WHEN the guest advances THEN the system SHALL show step 5 with location, address, Maps link, event details, and "Esperamos você lá."
6. WHEN the guest is on desktop/tablet THEN the advance action SHALL be positioned as a right-side action.
7. WHEN the guest is on mobile THEN the advance action SHALL be fixed in the lower-right area without covering form fields, validation messages, or gift actions.

**Independent Test**: Complete the stepper from CPF through location without reserving a gift.

---

### P1: RSVP and Companions Inside Flow - MVP

**User Story**: As an invited guest, I want to confirm or decline my presence and manage allowed companions so that the couple receives accurate attendance information.

**Why P1**: Completion is blocked until RSVP is answered, and existing RSVP rules are central to the invitation flow.

**Acceptance Criteria**:

1. WHEN RSVP is pending THEN the flow SHALL use the current initial RSVP contract and allow `accepted` or `declined`.
2. WHEN RSVP was already answered THEN the flow SHALL use the current update RSVP contract.
3. WHEN status is `accepted` THEN the guest SHALL be able to provide optional message, optional dietary restrictions, and companions up to `maxExtraGuests`.
4. WHEN status is `declined` THEN the system SHALL keep the current domain behavior of clearing companions and dietary restrictions unless product explicitly changes that rule before design.
5. WHEN companion age on the event date is at least 16 THEN CPF SHALL be required for that companion.
6. WHEN companion age on the event date is under 16 THEN CPF SHALL remain optional.
7. WHEN a direct RSVP action re-saves an already accepted status without changing companions THEN it SHALL NOT accidentally submit an empty companions payload that deletes existing companions.

**Independent Test**: Confirm presence with zero and non-zero companions, then reopen and update RSVP without losing companions unexpectedly.

---

### P1: Complete Invitation Flow - MVP

**User Story**: As an invited guest, I want to confirm that I finished the invitation flow so that the next visit can show shortcuts instead of repeating the guided flow.

**Why P1**: Return behavior depends on a persisted completion marker.

**Acceptance Criteria**:

1. WHEN the guest reaches step 5 and clicks the final completion action THEN the frontend SHALL call `POST /api/events/{slug}/invitation-flow/complete` with the already informed `guestCpf`.
2. WHEN RSVP is still pending THEN completion SHALL be blocked and the guest SHALL be directed back to the RSVP step.
3. WHEN RSVP is accepted or declined THEN completion SHALL be saved for that `EventGuest`.
4. WHEN completion succeeds THEN the guest SHALL see a final success state.
5. WHEN completion succeeds THEN later RSVP lookup SHALL expose `hasCompletedInvitationFlow=true`.

**Independent Test**: Answer RSVP, finish step 5, call RSVP lookup, and verify completion fields.

---

### P1: Return Menu After Completion - MVP

**User Story**: As a returning guest, I want to enter my CPF and see direct actions so that I can quickly revisit only what I need.

**Why P1**: The user explicitly chose event-scoped links, so CPF-gated return behavior is required to avoid repeating the full flow.

**Acceptance Criteria**:

1. WHEN a guest who completed the flow reopens the link THEN the system SHALL ask for CPF again.
2. WHEN the informed CPF belongs to a completed guest THEN the system SHALL show direct actions instead of the stepper.
3. WHEN the guest selects "Presentear casal" THEN the system SHALL show the gift list with reservation using the already informed CPF.
4. WHEN the guest selects "Informações do evento" THEN the system SHALL show local, address, Maps link, date/time, ceremony details, dress code, and final message.
5. WHEN the guest selects "Adicionar/editar convidados extras" THEN the system SHALL open the RSVP companion editing state.
6. WHEN the guest selects "Confirmar/cancelar presença" THEN the system SHALL open RSVP status editing without accidental loss of accepted companions.
7. WHEN a guest has not completed the flow THEN the system SHALL continue the guided flow instead of showing return shortcuts.

**Independent Test**: Complete the flow, reload `event.html?slug={slug}`, enter the same CPF, and verify the direct-action menu appears.

---

### P1: Optional Gift Reservation - MVP

**User Story**: As a guest, I want gifts to be optional during acceptance so that I can finish the invitation even if I do not choose a gift now.

**Why P1**: The product decision explicitly makes gifts optional in the initial acceptance.

**Acceptance Criteria**:

1. WHEN the guest reaches the gift step THEN the system SHALL show gift list and availability.
2. WHEN the guest reserves a gift THEN the reservation SHALL use the CPF already entered for the flow.
3. WHEN the guest skips gifts THEN the system SHALL allow progression to location and completion.
4. WHEN a gift is fully reserved THEN the system SHALL keep the current unavailable behavior.
5. WHEN the guest returns through direct actions THEN "Presentear casal" SHALL work without replaying previous invitation steps.

**Independent Test**: Complete one flow with no reservation and another with a reservation; both should be valid.

---

### P2: Invitation Message and Optional Cover Image

**User Story**: As a couple, I want to configure the invitation message and optionally provide a background image so that the public invitation feels personal without requiring an image.

**Why P2**: This improves invite quality and unblocks event creation/editing without forced external image URL.

**Acceptance Criteria**:

1. WHEN creating an event with `invitationMessage` THEN the API SHALL persist and return it.
2. WHEN updating an event with `invitationMessage` THEN the API SHALL persist and return it.
3. WHEN no `invitationMessage` is provided THEN the public invitation SHALL use the fallback message.
4. WHEN no `coverImageUrl` is provided THEN the API SHALL persist an empty string and the frontend SHALL not require or render a broken image.
5. WHEN a non-empty `coverImageUrl` is provided THEN current URL validation SHALL still apply.

**Independent Test**: Create and edit events with and without invitation message and cover image URL.

---

### P2: Gift Search, Filters, and Sorting

**User Story**: As a guest, I want to search, filter, and sort gifts so that I can find an appropriate available option quickly.

**Why P2**: The current page has basic filters but the guided flow calls for a stronger gift selection experience.

**Acceptance Criteria**:

1. WHEN gifts are shown THEN the system SHALL provide search by gift name/description.
2. WHEN filters are used THEN the system SHALL support all, available, and reserved states at minimum.
3. WHEN sorting is used THEN the system SHALL support useful ordering for guest choice, including price and availability.
4. WHEN no gifts match THEN the system SHALL show a clear empty state and still allow skipping gifts.

**Independent Test**: Seed gifts with different names, prices, and availability, then verify search/filter/sort combinations.

---

### P2: Public Contract and Migration Coverage

**User Story**: As a maintainer, I want explicit API and schema coverage so that frontend and backend evolve together without hidden contract breaks.

**Why P2**: The feature changes DTOs, EF entities, migrations, tests, and frontend smoke flows.

**Acceptance Criteria**:

1. WHEN adding `InvitationMessage` and `InvitationFlowCompletedAt` THEN an EF migration SHALL update the schema.
2. WHEN event response contracts are used by frontend/tests THEN they SHALL include `invitationMessage`.
3. WHEN RSVP response contracts are used by frontend/tests THEN they SHALL include completion fields.
4. WHEN old RSVP/reservation smoke selectors change THEN tests SHALL be updated to the new public flow.
5. WHEN docs are updated after implementation THEN `.specs/codebase/*` SHALL reflect changed domain rules and feature map.

**Independent Test**: Run backend integration tests and frontend smoke after contract updates.

---

## Edge Cases

- WHEN CPF is formatted with punctuation THEN system SHALL normalize to digits before backend calls.
- WHEN CPF is valid but not invited THEN system SHALL not reveal any event guest details.
- WHEN an already completed guest hits completion again THEN system SHALL handle it idempotently.
- WHEN RSVP is reset to pending by administrative event/guest changes THEN `hasCompletedInvitationFlow` behavior must be decided in design before implementation; default proposal is to keep completion timestamp but route guest back to RSVP if current RSVP is pending.
- WHEN event has no gifts THEN gift step SHALL show an empty state and allow skipping.
- WHEN event has empty `coverImageUrl` THEN no image URL validation or broken image rendering SHALL occur.
- WHEN event has no `invitationMessage` THEN fallback message SHALL be used.
- WHEN direct RSVP editing keeps status accepted THEN existing companions SHALL remain unless the guest explicitly edits/removes them.
- WHEN direct RSVP editing changes status to declined THEN current domain behavior clears companions and dietary restrictions.
- WHEN mobile keyboard is open on CPF or companion forms THEN fixed advance action SHALL not block required fields or submit buttons.
- WHEN Maps URL is absent only because legacy event data exists THEN location step SHALL degrade gracefully, but enriched event creation/update still requires Maps URL unless a separate product change makes it optional.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| IAF-01 | P1: Identify Invited Guest | Implementation | Complete - T4 public slug shell and CPF lookup |
| IAF-02 | P1: Guided Five-Step Invitation Flow | Implementation | Complete - T4 shell, T5 message/RSVP, T6 gifts, and T7 location/completion |
| IAF-03 | P1: RSVP and Companions Inside Flow | Implementation | Complete - T2 answered-RSVP guard, T5 RSVP step, and T7 direct RSVP preservation smoke |
| IAF-04 | P1: Complete Invitation Flow | Implementation | Complete - T1 state field, T2 backend endpoint, and T7 frontend completion |
| IAF-05 | P1: Return Menu After Completion | Implementation | Complete - T2 completion state, T5 companion preservation, and T7 return menu/direct actions |
| IAF-06 | P1: Optional Gift Reservation | Implementation | Complete - T6 guided gift step/skip and T7 direct gift action |
| IAF-07 | P2: Invitation Message and Optional Cover Image | Implementation | Complete - T1 backend event contract and T3 private create/edit UI |
| IAF-08 | P2: Gift Search, Filters, and Sorting | Implementation | Complete - T6 gift search/filter/sort smoke coverage |
| IAF-09 | P2: Public Contract and Migration Coverage | Implementation | Complete - T1/T2 backend contracts and integration tests, T3-T7 frontend smoke, T8 living docs, and T9 final validation/mobile record |

**Coverage:** 9 total, 9 mapped to tasks, 9 fully covered by T1-T9.

---

## Test Plan

### Backend Integration

- Create event with `invitationMessage`.
- Update event with `invitationMessage`.
- Create event without `coverImageUrl`.
- Update event with empty `coverImageUrl`.
- Consult RSVP before completion and verify `hasCompletedInvitationFlow=false` and `invitationFlowCompletedAt=null`.
- Block completion for CPF not invited to the event.
- Block completion for RSVP still `pending`.
- Complete flow after RSVP is `accepted`.
- Complete flow after RSVP is `declined`.
- Verify completion endpoint is idempotent.
- Verify subsequent RSVP lookup returns `hasCompletedInvitationFlow=true`.

### Frontend Smoke

- Complete invitation flow: open link, enter CPF, advance through 5 steps, confirm presence, optionally reserve gift, and complete.
- Reopen link, enter CPF, and validate direct-action menu.
- Validate direct "Presentear casal" action without replaying stepper.
- Validate direct "Confirmar/cancelar presença" action without accidentally clearing accepted companions when only status is reviewed.
- Update old public RSVP/reservation smoke coverage for the new page structure and selectors.

### Manual Mobile

Follow `.specs/codebase/MOBILE_TESTING.md` for the public page, with focus on:

- Fixed lower-right advance action.
- CPF input and validation feedback.
- RSVP accepted/declined controls.
- Companion count and companion fields.
- Gift search/filter/sort and reservation actions.
- Location/details step.
- No horizontal overflow and no content hidden behind fixed controls.

---

## Success Criteria

- [x] A guest can complete the full public invitation flow with only event link and invited CPF.
- [x] A guest can complete the flow without reserving a gift.
- [x] A returning completed guest sees direct actions after entering CPF.
- [x] Existing RSVP and gift reservation rules remain enforced.
- [x] Empty cover image URL no longer blocks event create/update.
- [x] Backend integration coverage verifies new contracts and completion rules.
- [x] Frontend smoke covers complete flow, return menu, direct gift action, and direct RSVP action.
- [x] Manual mobile validation is recorded for the public flow.
