# Weddingifts Architecture

Documento privado de referência arquitetural. O objetivo aqui é descrever o sistema como ele existe hoje no código, não como ele pode evoluir depois.

## 1. Resumo executivo

Weddingifts é um MVP de lista de presentes para casamento com duas aplicações principais:

- frontend estático multipágina em `Weddingifts-web/`
- API REST em `.NET 8` em `Weddingifts.Api/`

Topologia atual:

`Weddingifts-web` -> `Weddingifts.Api` -> PostgreSQL

Estado geral da arquitetura:

- backend em camadas simples (`Controllers -> Services -> AppDbContext`)
- frontend sem framework e sem build step
- pagina publica do evento como hub aberto por `slug`, com RSVP e presentes como acoes independentes
- autenticação via JWT para áreas privadas
- reservas públicas por CPF convidado
- backend de RSVP público por CPF convidado com acompanhantes e fuso por evento
- aceite público do convite com conclusão explícita e tela separada de presentes em `gifts.html`
- testes automatizados concentrados no backend
- sem integrações externas confirmadas para e-mail, pagamento, storage, analytics ou observabilidade

Evidências principais:

- `Weddingifts.Api/Program.cs`
- `Weddingifts.Api/Data/AppDbContext.cs`
- `Weddingifts.Api/Services/*`
- `Weddingifts-web/js/common.js`
- `.github/workflows/dotnet-ci.yml`

## 2. Estrutura do repositório

- `Weddingifts.Api/` -> API principal em ASP.NET Core
- `Weddingifts.Api/Controllers/` -> endpoints HTTP
- `Weddingifts.Api/Services/` -> regras de negócio
- `Weddingifts.Api/Entities/` -> entidades persistidas
- `Weddingifts.Api/Models/` -> contratos HTTP (request/response)
- `Weddingifts.Api/Data/` -> `AppDbContext`
- `Weddingifts.Api/Middleware/` -> middleware global de erro e headers
- `Weddingifts.Api/Security/` -> geração de JWT
- `Weddingifts.Api/Migrations/` -> histórico de schema do banco
- `Weddingifts.Api.IntegrationTests/` -> testes de integração com `WebApplicationFactory`
- `Weddingifts-web/` -> frontend multipágina em HTML/CSS/JS
- `Weddingifts-web/js/` -> um script principal por tela + `common.js`
- `.github/workflows/` -> CI de backend e smoke suite frontend
- `docs/` -> base privada/local de documentação

Áreas com sinal de legado ou utilidade auxiliar, não do fluxo principal do produto:

- `Weddingifts-web/app.js`
- `Weddingifts.Api/Controllers/TestController.cs`
- `Weddingifts.Api/Controllers/WeatherForecastController.cs`

## 3. Stack real

### Backend

- `.NET 8` / ASP.NET Core Web API
- Entity Framework Core
- Npgsql / PostgreSQL
- JWT Bearer
- Swagger em ambiente `Development`
- rate limiting nativo do ASP.NET Core

Evidências:

- `Weddingifts.Api/Weddingifts.Api.csproj`
- `Weddingifts.Api/Program.cs`

### Frontend

- HTML, CSS e JavaScript puros
- sem framework frontend
- sem build step do produto
- `package.json` local apenas para automação mínima de smoke com Playwright
- smoke suite frontend sobe backend próprio em ambiente `FrontendSmoke` com SQLite para reduzir dependência de segredos locais

Evidências:

- `Weddingifts-web/*.html`
- `Weddingifts-web/js/*.js`
- `package.json`
- `playwright.config.js`
- `frontend-smoke/*`

### Banco de dados

- PostgreSQL em runtime normal
- SQLite in-memory apenas nos testes de integração

Evidências:

- `Weddingifts.Api/Program.cs`
- `Weddingifts.Api.IntegrationTests/IntegrationTestWebApplicationFactory.cs`

### CI

- GitHub Actions com:
  - `restore`, `build` e `test` da solution backend em `ubuntu-latest`
  - smoke suite frontend em `windows-latest` com Playwright Chromium
  - backend em `FrontendSmoke` + SQLite local temporário no job frontend

Evidência:

- `.github/workflows/dotnet-ci.yml`

## 4. Topologia da aplicação

### Fluxo principal

1. O frontend estático é servido separadamente do backend.
2. Os scripts em `Weddingifts-web/js/*.js` chamam a API via `fetch`.
3. A base da API é inferida no frontend a partir do host atual, usando porta `5298`.
4. Páginas privadas dependem de sessão JWT em `localStorage`.
5. O backend persiste os dados em PostgreSQL via EF Core.

Evidências:

- `Weddingifts-web/js/common.js`
- `Weddingifts.Api/Program.cs`
- `Weddingifts.Api/Data/AppDbContext.cs`

### Observações importantes

- Não há SSR, server actions ou BFF.
- Não há serviço separado para pagamentos, e-mail, mensageria ou fila.
- O sistema é um monólito simples com frontend desacoplado por HTTP.

## 5. Módulos centrais

### 5.1 Autenticação

Responsabilidade:

- login do usuário
- emissão de JWT
- controle de sessão nas páginas privadas

Arquivos principais:

- `Weddingifts.Api/Controllers/AuthController.cs`
- `Weddingifts.Api/Services/AuthService.cs`
- `Weddingifts.Api/Security/JwtTokenService.cs`
- `Weddingifts.Api/Services/PasswordHasherService.cs`
- `Weddingifts-web/js/login.js`
- `Weddingifts-web/js/common.js`

### 5.2 Usuários

Responsabilidade:

- cadastro de conta
- listagem autenticada de usuários
- troca de senha autenticada
- regras de CPF, nascimento e senha

Arquivos principais:

- `Weddingifts.Api/Controllers/UserController.cs`
- `Weddingifts.Api/Services/UserService.cs`
- `Weddingifts.Api/Entities/User.cs`
- `Weddingifts.Api/Models/CreateUserRequest.cs`
- `Weddingifts-web/js/register.js`

### 5.3 Eventos

Responsabilidade:

- criar, listar, editar e excluir eventos do usuário
- expor evento público por `slug`
- persistir metadados enriquecidos do evento, `eventDateTime` canônico e `timeZoneId`

Arquivos principais:

- `Weddingifts.Api/Controllers/EventController.cs`
- `Weddingifts.Api/Services/EventService.cs`
- `Weddingifts.Api/Entities/Event.cs`
- `Weddingifts.Api/Models/EventResponse.cs`
- `Weddingifts-web/js/create-event.js`
- `Weddingifts-web/js/my-events.js`
- `Weddingifts-web/js/my-event.js`
- `Weddingifts-web/js/landing.js`

### 5.4 Presentes

Responsabilidade:

- CRUD de presentes por evento
- cálculo de disponibilidade e reserva atual
- bloqueios de edição/exclusão quando há reserva ativa

Arquivos principais:

- `Weddingifts.Api/Controllers/GiftController.cs`
- `Weddingifts.Api/Services/GiftService.cs`
- `Weddingifts.Api/Entities/Gift.cs`
- `Weddingifts.Api/Models/GiftResponse.cs`
- `Weddingifts-web/js/my-event.js`
- `Weddingifts-web/js/gifts.js`

### 5.5 Convidados

Responsabilidade:

- CRUD de convidados por evento
- lookup de convidado por CPF
- sumarização de reserva por convidado na gestão
- controle de `maxExtraGuests` e estado de RSVP do convidado principal

Arquivos principais:

- `Weddingifts.Api/Controllers/EventGuestController.cs`
- `Weddingifts.Api/Services/EventGuestService.cs`
- `Weddingifts.Api/Entities/EventGuest.cs`
- `Weddingifts.Api/Models/EventGuestResponse.cs`
- `Weddingifts-web/js/my-guests.js`

### 5.6 Reservas

Responsabilidade:

- reservar e cancelar presente por CPF convidado
- manter histórico de reserva por presente/evento
- expor histórico autenticado para os noivos

Arquivos principais:

- `Weddingifts.Api/Controllers/GiftReservationController.cs`
- `Weddingifts.Api/Services/GiftService.cs`
- `Weddingifts.Api/Entities/GiftReservation.cs`
- `Weddingifts.Api/Models/GiftReservationResponse.cs`
- `Weddingifts-web/js/gifts.js`
- `Weddingifts-web/js/my-event.js`
- `Weddingifts-web/js/my-guests.js`

### 5.7 RSVP

Observacao atual: o endpoint de conclusao do convite continua disponivel por compatibilidade, mas `event.html` nao depende mais dele para conduzir a experiencia publica.

Responsabilidade:

- expor leitura pública do RSVP por `slug` + CPF convidado
- confirmar ou atualizar RSVP do convidado principal
- validar acompanhantes, CPF condicional por idade e resets administrativos
- concluir o fluxo público de convite antes de oferecer a lista separada de presentes

Arquivos principais:

- `Weddingifts.Api/Controllers/EventRsvpController.cs`
- `Weddingifts.Api/Services/EventRsvpService.cs`
- `Weddingifts.Api/Services/EventTimeZoneService.cs`
- `Weddingifts.Api/Entities/EventGuestCompanion.cs`
- `Weddingifts.Api/Models/EventGuestRsvpResponse.cs`
- `Weddingifts-web/js/event.js`

## 6. Arquitetura de dados

### Banco e ORM

- banco principal: PostgreSQL
- ORM: Entity Framework Core
- contexto: `Weddingifts.Api/Data/AppDbContext.cs`

### Entidades principais

- `User`
- `Event`
- `Gift`
- `EventGuest`
- `EventGuestCompanion`
- `GiftReservation`

### Relações observadas

- `User` 1:N `Event`
- `Event` 1:N `Gift`
- `Event` 1:N `EventGuest`
- `Event` 1:N `GiftReservation`
- `EventGuest` 1:N `EventGuestCompanion`
- `Gift` 1:N `GiftReservation`

### Restrições e índices relevantes

- `User.Cpf` único quando preenchido
- `EventGuest(EventId, Cpf)` único
- índice em `EventGuestCompanion(EventGuestId)`
- índice em `GiftReservation(GiftId, GuestCpf)`
- índice em `GiftReservation(EventId, GuestCpf)`
- cascade delete em reservas por `Event` e `Gift`

Evidência:

- `Weddingifts.Api/Data/AppDbContext.cs`

### Migrations confirmadas

Migrations presentes em `Weddingifts.Api/Migrations/`:

- `InitialCreate`
- `AddEvent`
- `AddUserEventRelationship`
- `AddGift`
- `AddGiftReservationFields`
- `AddEventGuests`
- `AddUserCpfBirthDate`
- `AddGiftReservations`
- `AddEventRsvpAndTimeZone`

## 7. Autenticação e autorização

### Login

- endpoint: `POST /api/auth/login`
- resposta: token JWT, `expiresAt` e `user`
- autenticação baseada em e-mail e senha

Evidências:

- `Weddingifts.Api/Controllers/AuthController.cs`
- `Weddingifts.Api/Models/LoginRequest.cs`
- `Weddingifts.Api/Models/LoginResponse.cs`

### Sessão no frontend

- sessão persistida em `localStorage` na chave `wg_auth_session`
- páginas privadas usam `requireAuth()`
- expiração validada por `expiresAt` e fallback pelo `exp` do JWT
- sincronização entre abas via evento `storage`
- redirecionamento automático para `login.html` com `returnTo`, `sessionExpired` ou `loggedOut`

Evidência:

- `Weddingifts-web/js/common.js`

### Autorização

- rotas privadas usam `[Authorize]`
- ownership é reforçado nos services, não apenas no controller
- ações de evento, presente e convidado dependem do `userId` autenticado

Evidências:

- `Weddingifts.Api/Controllers/*.cs`
- `Weddingifts.Api/Services/EventService.cs`
- `Weddingifts.Api/Services/GiftService.cs`
- `Weddingifts.Api/Services/EventGuestService.cs`

## 8. Endpoints confirmados

### Auth

- `POST /api/auth/login`

### Users

- `POST /api/users`
- `GET /api/users`
- `PUT /api/users/me/password`

### Events

- `POST /api/events`
- `PUT /api/events/{eventId}`
- `DELETE /api/events/{eventId}`
- `GET /api/events/mine`
- `GET /api/events/{slug}`
- `GET /api/events/{slug}/rsvp`
- `POST /api/events/{slug}/rsvp`
- `PUT /api/events/{slug}/rsvp`
- `POST /api/events/{slug}/invitation-flow/complete`

### Guests

- `POST /api/events/{eventId}/guests`
- `PUT /api/events/{eventId}/guests/{guestId}`
- `DELETE /api/events/{eventId}/guests/{guestId}`
- `GET /api/events/{eventId}/guests`
- `GET /api/events/{eventId}/guests/by-cpf/{cpf}`

### Gifts

- `POST /api/events/{eventId}/gifts`
- `PUT /api/events/{eventId}/gifts/{giftId}`
- `DELETE /api/events/{eventId}/gifts/{giftId}`
- `GET /api/events/{eventId}/gifts`
- `GET /api/events/{eventId}/gifts/reservations`

### Reservations

- `POST /api/gifts/{giftId}/reserve`
- `POST /api/gifts/{giftId}/unreserve`

## 9. Middleware, segurança e comportamento HTTP

### Middleware confirmados

- `GlobalExceptionMiddleware`
- `SecurityHeadersMiddleware`

### Comportamentos relevantes

- erros retornam `ProblemDetails` / `ValidationProblemDetails`
- `DomainValidationException` -> `400`
- `UnauthorizedRequestException` -> `401`
- `ForbiddenOperationException` -> `403`
- `ResourceNotFoundException` -> `404`
- exceção inesperada -> `500`

### Headers e políticas

- CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP e CORP
- HSTS quando a requisição é HTTPS
- CORS liberado amplamente em `Development`; mais restrito fora dele
- rate limiting desativado apenas em `Testing`

Evidências:

- `Weddingifts.Api/Program.cs`
- `Weddingifts.Api/Middleware/GlobalExceptionMiddleware.cs`
- `Weddingifts.Api/Middleware/SecurityHeadersMiddleware.cs`

## 10. Frontend atual

### Páginas confirmadas

Públicas:

- `Weddingifts-web/index.html`
- `Weddingifts-web/register.html`
- `Weddingifts-web/login.html`
- `Weddingifts-web/event.html`
- `Weddingifts-web/gifts.html`

Privadas:

- `Weddingifts-web/create-event.html`
- `Weddingifts-web/my-events.html`
- `Weddingifts-web/my-guests.html`
- `Weddingifts-web/my-event.html`
- `Weddingifts-web/account.html`

### Organização dos scripts

- `Weddingifts-web/js/common.js` -> utilitários compartilhados, sessão, navegação, header mobile, catálogo PT-BR
- `Weddingifts-web/js/event-contract.js` -> contrato compartilhado de evento enriquecido, fusos brasileiros, parsing UTC da API e formatação por `timeZoneId`
- um script principal por página (`landing.js`, `register.js`, `login.js`, `create-event.js`, `my-events.js`, `my-guests.js`, `my-event.js`, `account.js`, `event.js`, `gifts.js`)

### Observações relevantes

- a navegação mobile global é injetada por `common.js`
- o frontend consome a API diretamente, sem camada adicional
- o contrato enriquecido de evento inclui comida/bebida, programacao e galeria por URLs externas
- o fluxo privado de criação/listagem/edição de eventos já consome e exibe o contrato enriquecido de evento
- a página pública do evento já exibe dados enriquecidos, consome o RSVP público por CPF e conclui o convite antes de encaminhar para presentes
- a página pública de presentes (`gifts.html`) concentra busca, filtros, carrinho, reserva/cancelamento por CPF e retorno ao convite
- a gestão privada de convidados já coleta, edita e lista o limite de acompanhantes (`maxExtraGuests`)
- `account.html` integra com backend real para troca de senha usando senha atual obrigatória

## 11. Integrações externas

Nenhuma integração externa de produção foi confirmada pelo código atual para:

- e-mail
- WhatsApp
- pagamentos
- storage de arquivos
- analytics
- Sentry / observabilidade externa

Incerto:

- não há integração real de e-mail confirmada no backend atual

Evidências:

- ausência de SDKs/pacotes correspondentes no `Weddingifts.Api.csproj`
- ausência de endpoints/serviços específicos no backend
- `Weddingifts-web/js/common.js`
- `Weddingifts-web/js/login.js`

## 12. Testes e qualidade

### Testes automatizados confirmados

- testes de integração backend em `Weddingifts.Api.IntegrationTests/`
- smoke tests mínimos de frontend em `frontend-smoke/` com Playwright
- foco atual em cadastro, login, troca de senha, eventos, convidados, reservas e restrições de mutação
- foco frontend atual em login, criação de evento, listagem de eventos, gestão de convidados, reserva/cancelamento público e RSVP público

### CI confirmada

- pipeline GitHub Actions executa restore, build e test da solution backend
- a mesma pipeline executa a smoke suite frontend em `push` e `pull_request`

### Lacunas confirmadas

- validação mobile ainda depende de checklist manual

Evidências:

- `Weddingifts.Api.IntegrationTests/GiftReservationIntegrationTests.cs`
- `Weddingifts.Api.IntegrationTests/ChangePasswordIntegrationTests.cs`
- `Weddingifts.Api.IntegrationTests/UserAuthIntegrationTests.cs`
- `Weddingifts.Api.IntegrationTests/EventIntegrationTests.cs`
- `Weddingifts.Api.IntegrationTests/EventGuestIntegrationTests.cs`
- `Weddingifts.Api.IntegrationTests/EventRsvpIntegrationTests.cs`
- `frontend-smoke/weddingifts.smoke.spec.js`
- `playwright.config.js`
- `.github/workflows/dotnet-ci.yml`
- `docs/MOBILE_TEST_CHECKLIST.md`

## 13. Inconsistências e dívida arquitetural visível

- `docs/` é uma base privada relevante, mas está ignorada no Git e pode desalinhar com facilidade.
- `AGENTS.md` também está ignorado no Git, então as instruções operacionais locais não são distribuídas automaticamente.
- `Weddingifts-web/app.js` aparenta ser legado e pode confundir manutenção futura.
- ainda não há validação mobile automatizada no CI; mobile depende de checklist manual.

## 14. Incertos

- não há evidência suficiente de estratégia de deploy/infra futura para documentar produção.
- não há confirmação de uso real dos controllers auxiliares `TestController` e `WeatherForecastController`.
- não há evidência de observabilidade centralizada, fila, cache distribuído ou storage externo.

