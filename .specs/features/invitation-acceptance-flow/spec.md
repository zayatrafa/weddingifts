# Fluxo De Aceite Do Convite

Status: feature histórica implementada

## Objetivo

Permitir que um convidado abra uma página pública de evento por `slug`, se identifique com CPF, veja ou envie seu RSVP, gerencie acompanhantes dentro das regras do evento e siga para o fluxo público separado de presentes.

## Comportamento Atual Confirmado

- o hub público é `Weddingifts-web/event.html`
- as informações do evento carregam antes da identificação do convidado
- a identificação do convidado acontece por `GET /api/events/{slug}/rsvp?guestCpf=...`
- o RSVP inicial usa `POST /api/events/{slug}/rsvp`
- as atualizações de RSVP usam `PUT /api/events/{slug}/rsvp`
- a validação de acompanhantes é reforçada por idade e regras de fuso local do evento
- tanto o resultado `accepted` quanto `declined` são suportados
- os presentes vivem em `gifts.html`, não dentro da própria página de RSVP
- `POST /api/events/{slug}/invitation-flow/complete` ainda existe por compatibilidade, mas a feature deve ser entendida pela UX atual embarcada, não por suposições antigas

## Requisitos Centrais Confirmados No Código

1. A página deve resolver um evento por `slug` público.
2. Um convidado deve se identificar com um CPF convidado válido antes que os dados de RSVP sejam retornados.
3. O status de RSVP pode sair de `pending` para `accepted` ou `declined`.
4. Um RSVP já respondido pode ser editado pelo caminho de atualização.
5. Acompanhantes não podem exceder `maxExtraGuests`.
6. O CPF do acompanhante se torna obrigatório a partir de 16 anos na data do evento.
7. Recusar o convite limpa dados exclusivos de RSVP aceito, como acompanhantes e restrições alimentares.
8. O usuário pode seguir para a página pública separada de presentes depois do fluxo de convite.

## Referências Principais De Código

- `Weddingifts.Api/Controllers/EventRsvpController.cs`
- `Weddingifts.Api/Services/EventRsvpService.cs`
- `Weddingifts.Api/Services/EventTimeZoneService.cs`
- `Weddingifts-web/js/event.js`
- `Weddingifts-web/js/gifts.js`
- `Weddingifts.Api.IntegrationTests/EventRsvpIntegrationTests.cs`
- `frontend-smoke/weddingifts.smoke.spec.js`
