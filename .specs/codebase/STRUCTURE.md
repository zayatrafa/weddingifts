# Estrutura

## Estrutura Do Repositório

- `Weddingifts-web/` - frontend estático multipágina
- `Weddingifts.Api/` - API ASP.NET Core
- `Weddingifts.Api.IntegrationTests/` - testes de integração backend
- `frontend-smoke/` - suíte smoke em Playwright para fluxos críticos do frontend
- `.github/workflows/` - pipelines de CI
- `.specs/` - documentação ativa do projeto

## Estrutura Do Backend

- `Controllers/` - endpoints HTTP
- `Services/` - regras de negócio
- `Entities/` - entidades persistidas de domínio
- `Models/` - contratos de request/response
- `Data/` - `AppDbContext`
- `Middleware/` - tratamento de exceções e headers de segurança
- `Security/` - configuração de JWT e hash de senha
- `Migrations/` - histórico de schema do EF Core

## Estrutura Do Frontend

- uma página HTML por tela
- um módulo JS principal por página em `Weddingifts-web/js/`
- helpers compartilhados em `Weddingifts-web/js/common.js`
- helpers compartilhados de contrato de evento em `Weddingifts-web/js/event-contract.js`
- estilos compartilhados em `Weddingifts-web/styles.css`

## Mapa Funcional Do Frontend

Telas públicas:

- `index.html` - landing page
- `register.html` - cadastro de usuário
- `login.html` - login
- `event.html` - hub público de convite e RSVP por `slug`
- `gifts.html` - lista pública de presentes e fluxo de reserva por `slug`

Telas privadas:

- `create-event.html` - criar evento
- `my-events.html` - listar, editar e excluir eventos do usuário
- `my-guests.html` - gerenciar convidados de um evento do usuário
- `my-event.html` - gerenciar presentes e histórico de reservas de um evento do usuário
- `account.html` - dados da conta e troca de senha

Módulos compartilhados relevantes:

- `Weddingifts-web/js/common.js` - base da API, requests, sessão, redirects e comportamento compartilhado de UI
- `Weddingifts-web/js/event-contract.js` - parsing de evento enriquecido e formatação sensível a fuso
- `Weddingifts-web/styles.css` - sistema visual compartilhado e regras responsivas

## Mapa Funcional Do Backend

- `AuthController` / `AuthService`
- `UserController` / `UserService`
- `EventController` / `EventService`
- `EventGuestController` / `EventGuestService`
- `GiftController` / `GiftService`
- `GiftReservationController` / `GiftService`
- `EventRsvpController` / `EventRsvpService`

## Ativos De Teste

- testes de integração backend em `Weddingifts.Api.IntegrationTests/`
- smoke tests de frontend em `frontend-smoke/`
- pipeline de CI em `.github/workflows/dotnet-ci.yml`

## Arquivos Que Merecem Tratamento Cuidadoso

- `Weddingifts-web/js/common.js` porque centraliza resolução da base da API, sessão, redirects e comportamento de UI compartilhado
- `Weddingifts.Api/Program.cs` porque conecta auth, CORS, rate limiting, escolha de provider de banco e comportamento por ambiente
- `Weddingifts.Api/Services/*` porque as regras de domínio vivem ali

## Arquivos Auxiliares Ou Com Cara De Legado

Eles existem no repositório, mas não são centrais ao fluxo principal do produto:

- `Weddingifts-web/app.js`
- `Weddingifts.Api/Controllers/TestController.cs`
- `Weddingifts.Api/Controllers/WeatherForecastController.cs`
