# Feature Map

Mapa privado do que existe hoje no Weddingifts. Este documento não descreve ideias futuras; ele lista telas, endpoints, módulos e testes realmente identificados no código atual.

## 1. Frontend público

### `Weddingifts-web/index.html`

Responsabilidade:

- landing page do produto
- entrada principal para navegação pública
- CTA adaptado para sessão logada/deslogada

Scripts principais:

- `Weddingifts-web/js/landing.js`
- `Weddingifts-web/js/common.js`

### `Weddingifts-web/register.html`

Responsabilidade:

- cadastro de usuário
- coleta de nome, e-mail, CPF, data de nascimento e senha

Script principal:

- `Weddingifts-web/js/register.js`

API consumida:

- `POST /api/users`

### `Weddingifts-web/login.html`

Responsabilidade:

- login do usuário
- entrada para fluxos com `returnTo`, sessão expirada e pós-cadastro

Script principal:

- `Weddingifts-web/js/login.js`

API consumida:

- `POST /api/auth/login`

### `Weddingifts-web/event.html`

Responsabilidade:

- página pública por `slug`
- exibir dados enriquecidos do evento: casal, data/hora no fuso do evento, local, endereço, Maps, cerimônia, traje e capa
- exibir presentes disponíveis/reservados
- reservar e cancelar presente por CPF
- consultar RSVP por CPF do convidado
- confirmar ou atualizar RSVP como `accepted` ou `declined`
- coletar mensagem, restrições alimentares e acompanhantes até `maxExtraGuests`, com CPF condicional por idade

Script principal:

- `Weddingifts-web/js/event.js`
- `Weddingifts-web/js/event-contract.js`

APIs consumidas:

- `GET /api/events/{slug}`
- `GET /api/events/{eventId}/gifts`
- `GET /api/events/{slug}/rsvp?guestCpf={cpf}`
- `POST /api/events/{slug}/rsvp`
- `PUT /api/events/{slug}/rsvp`
- `POST /api/gifts/{giftId}/reserve`
- `POST /api/gifts/{giftId}/unreserve`

## 2. Frontend privado

### `Weddingifts-web/create-event.html`

Responsabilidade:

- criar evento autenticado
- coletar dados enriquecidos do evento: nomes do casal, data/hora com fuso, local, endereço, Maps, cerimônia, traje e URL da imagem de capa

Script principal:

- `Weddingifts-web/js/create-event.js`

API consumida:

- `POST /api/events`

### `Weddingifts-web/my-events.html`

Responsabilidade:

- listar eventos do usuário
- exibir metadados enriquecidos do evento
- editar evento com o contrato enriquecido
- excluir evento
- copiar link público
- navegar para convidados, presentes e histórico

Script principal:

- `Weddingifts-web/js/my-events.js`

APIs consumidas:

- `GET /api/events/mine`
- `PUT /api/events/{eventId}`
- `DELETE /api/events/{eventId}`

### `Weddingifts-web/my-guests.html`

Responsabilidade:

- selecionar evento do usuário
- listar convidados do evento
- criar, editar e excluir convidado, incluindo limite de acompanhantes (`maxExtraGuests`)
- autofill por CPF no próprio evento
- exibir indicador de reserva ativa e valor por convidado

Script principal:

- `Weddingifts-web/js/my-guests.js`

APIs consumidas:

- `GET /api/events/mine`
- `GET /api/events/{eventId}/guests`
- `POST /api/events/{eventId}/guests`
- `PUT /api/events/{eventId}/guests/{guestId}`
- `DELETE /api/events/{eventId}/guests/{guestId}`
- `GET /api/events/{eventId}/guests/by-cpf/{cpf}`
- `GET /api/events/{eventId}/gifts/reservations`

### `Weddingifts-web/my-event.html`

Responsabilidade:

- selecionar evento do usuário
- exibir resumo enriquecido do evento selecionado
- listar presentes do evento
- criar, editar e excluir presente
- exibir histórico de reservas cruzado com convidados

Script principal:

- `Weddingifts-web/js/my-event.js`

APIs consumidas:

- `GET /api/events/mine`
- `GET /api/events/{eventId}/gifts`
- `POST /api/events/{eventId}/gifts`
- `PUT /api/events/{eventId}/gifts/{giftId}`
- `DELETE /api/events/{eventId}/gifts/{giftId}`
- `GET /api/events/{eventId}/gifts/reservations`
- `GET /api/events/{eventId}/guests`

### `Weddingifts-web/account.html`

Responsabilidade:

- exibir dados básicos da conta autenticada
- permitir troca de senha autenticada com confirmação da senha atual

Script principal:

- `Weddingifts-web/js/account.js`

Observação:

- a troca de senha exige senha atual e nova senha forte

## 3. Shared frontend

### `Weddingifts-web/js/common.js`

Responsabilidade transversal:

- inferir base da API
- encapsular requests e tratamento de erro
- persistir sessão JWT
- validar expiração local da sessão
- proteger páginas privadas
- redirecionar para login com `returnTo`
- montar header mobile global e drawer de navegação
- centralizar mensagens compartilhadas em PT-BR
- formatar datas, hora e moeda

### `Weddingifts-web/styles.css`

Responsabilidade transversal:

- design system visual principal
- layout das páginas públicas e privadas
- responsividade
- header mobile, drawer e componentes compartilhados

## 4. Backend por domínio

### Auth

Arquivos:

- `Weddingifts.Api/Controllers/AuthController.cs`
- `Weddingifts.Api/Services/AuthService.cs`
- `Weddingifts.Api/Security/JwtTokenService.cs`

Contrato principal:

- `POST /api/auth/login`

### Users

Arquivos:

- `Weddingifts.Api/Controllers/UserController.cs`
- `Weddingifts.Api/Services/UserService.cs`
- `Weddingifts.Api/Entities/User.cs`

Contratos:

- `POST /api/users`
- `GET /api/users`
- `PUT /api/users/me/password`

### Events

Arquivos:

- `Weddingifts.Api/Controllers/EventController.cs`
- `Weddingifts.Api/Services/EventService.cs`
- `Weddingifts.Api/Entities/Event.cs`

Contratos:

- `POST /api/events`
- `PUT /api/events/{eventId}`
- `DELETE /api/events/{eventId}`
- `GET /api/events/mine`
- `GET /api/events/{slug}`

### Guests

Arquivos:

- `Weddingifts.Api/Controllers/EventGuestController.cs`
- `Weddingifts.Api/Services/EventGuestService.cs`
- `Weddingifts.Api/Entities/EventGuest.cs`

Contratos:

- `POST /api/events/{eventId}/guests`
- `PUT /api/events/{eventId}/guests/{guestId}`
- `DELETE /api/events/{eventId}/guests/{guestId}`
- `GET /api/events/{eventId}/guests`
- `GET /api/events/{eventId}/guests/by-cpf/{cpf}`

### RSVP

Arquivos:

- `Weddingifts.Api/Controllers/EventRsvpController.cs`
- `Weddingifts.Api/Services/EventRsvpService.cs`
- `Weddingifts.Api/Services/EventTimeZoneService.cs`
- `Weddingifts.Api/Entities/EventGuestCompanion.cs`

Contratos:

- `GET /api/events/{slug}/rsvp`
- `POST /api/events/{slug}/rsvp`
- `PUT /api/events/{slug}/rsvp`

### Gifts

Arquivos:

- `Weddingifts.Api/Controllers/GiftController.cs`
- `Weddingifts.Api/Services/GiftService.cs`
- `Weddingifts.Api/Entities/Gift.cs`

Contratos:

- `POST /api/events/{eventId}/gifts`
- `PUT /api/events/{eventId}/gifts/{giftId}`
- `DELETE /api/events/{eventId}/gifts/{giftId}`
- `GET /api/events/{eventId}/gifts`
- `GET /api/events/{eventId}/gifts/reservations`

### Reservations

Arquivos:

- `Weddingifts.Api/Controllers/GiftReservationController.cs`
- `Weddingifts.Api/Entities/GiftReservation.cs`
- regras distribuídas principalmente em `Weddingifts.Api/Services/GiftService.cs`

Contratos:

- `POST /api/gifts/{giftId}/reserve`
- `POST /api/gifts/{giftId}/unreserve`

## 5. Contratos HTTP relevantes

### `EventResponse`

Campos principais:

- `id`
- `userId`
- `name`
- `hostNames`
- `eventDate`
- `eventDateTime`
- `timeZoneId`
- `locationName`
- `locationAddress`
- `locationMapsUrl`
- `ceremonyInfo`
- `dressCode`
- `coverImageUrl`
- `slug`
- `createdAt`
- `gifts`
- `guestCount`

Arquivo:

- `Weddingifts.Api/Models/EventResponse.cs`

### `GiftResponse`

Campos principais:

- `id`
- `eventId`
- `name`
- `description`
- `price`
- `quantity`
- `reservedQuantity`
- `availableQuantity`
- `isFullyReserved`
- `reservedBy`
- `reservedAt`
- `createdAt`

Arquivo:

- `Weddingifts.Api/Models/GiftResponse.cs`

### `EventGuestResponse`

Campos principais:

- `id`
- `eventId`
- `cpf`
- `name`
- `email`
- `phoneNumber`
- `maxExtraGuests`
- `rsvpStatus`
- `rsvpRespondedAt`
- `messageToCouple`
- `dietaryRestrictions`
- `companions`
- `createdAt`

Arquivo:

- `Weddingifts.Api/Models/EventGuestResponse.cs`

### `EventGuestRsvpResponse`

Campos principais:

- `eventId`
- `eventSlug`
- `guestId`
- `guestCpf`
- `guestName`
- `maxExtraGuests`
- `rsvpStatus`
- `rsvpRespondedAt`
- `messageToCouple`
- `dietaryRestrictions`
- `companions`

Arquivo:

- `Weddingifts.Api/Models/EventGuestRsvpResponse.cs`

### `GiftReservationResponse`

Campos principais:

- `id`
- `eventId`
- `giftId`
- `giftName`
- `giftPrice`
- `guestCpf`
- `reservedQuantity`
- `unreservedQuantity`
- `activeQuantity`
- `reservedAt`
- `lastReservedAt`
- `lastUnreservedAt`
- `unreservedAt`
- `createdAt`

Arquivo:

- `Weddingifts.Api/Models/GiftReservationResponse.cs`

## 6. Testes existentes

### Backend

Testes automatizados confirmados:

- `Weddingifts.Api.IntegrationTests/GiftReservationIntegrationTests.cs`
- `Weddingifts.Api.IntegrationTests/ChangePasswordIntegrationTests.cs`
- `Weddingifts.Api.IntegrationTests/UserAuthIntegrationTests.cs`
- `Weddingifts.Api.IntegrationTests/EventIntegrationTests.cs`
- `Weddingifts.Api.IntegrationTests/EventGuestIntegrationTests.cs`
- `Weddingifts.Api.IntegrationTests/EventRsvpIntegrationTests.cs`

Cobertura observada:

- cadastro de usuário
- login
- troca de senha autenticada
- criação, edição e exclusão de evento
- CRUD principal de convidados
- leitura, confirmação, atualização e reset de RSVP
- autenticação obrigatória em rotas privadas
- criação de presente por proprietário
- reserva e cancelamento
- bloqueio de edição quando há reserva ativa
- bloqueio de exclusão quando há reserva ativa
- validações de domínio em reservas e presentes

### Frontend

Existe uma suíte mínima de smoke com Playwright em:

- `frontend-smoke/weddingifts.smoke.spec.js`
- `frontend-smoke/support/api-helpers.js`
- `playwright.config.js`
- `package.json`
- backend `FrontendSmoke` autocontido com SQLite

A validação atual depende de:

- smoke automatizado local dos fluxos críticos
- smoke automatizado do RSVP público com consulta por CPF, POST/PUT, limite de acompanhantes, acompanhante menor sem CPF, acompanhante 16+ com CPF obrigatório e recusa limpando acompanhantes
- execução manual local complementar
- checklist em `docs/MOBILE_TEST_CHECKLIST.md`

## 7. Scripts e operação local

- `run.bat` -> sobe backend + frontend local e abre o navegador
- `start-dev.ps1` -> sobe backend + frontend, com opção útil para teste em celular na mesma rede

## 8. Fora do mapa atual

Não existem implementações confirmadas para:

- upload/gestão visual de foto de capa no frontend
- privacidade por evento
- envio real de e-mail
- convites por WhatsApp
- pagamento
- deploy automatizado documentado

