# Weddingifts Architecture

Este documento descreve a arquitetura atual do Weddingifts.

## Visão de alto nível

Frontend estático (Weddingifts-web)
-> API REST (.NET 8)
-> PostgreSQL

## Backend

### Camadas

Controllers
-> Services
-> Data Access (AppDbContext)
-> Database

### Responsabilidades

Controllers:

- recebem requisições HTTP
- aplicam autenticação/autorização quando necessário
- delegam regras para Services
- retornam DTOs de resposta

Services:

- concentram regras de negócio
- validam regras de domínio
- coordenam leitura/escrita no banco

Data (EF Core):

- mapeamento de entidades
- consultas e persistência
- migrations

### Entidades

- `User`
- `Event`
- `Gift`

Relacionamentos:

- `User` 1:N `Event`
- `Event` 1:N `Gift`

Observação:

- `Gift` possui relacionamento com `Event` em cascade delete.

### Endpoints atuais

Auth:

- `POST /api/auth/login`

User:

- `POST /api/users`
- `GET /api/users`

Event:

- `POST /api/events` (auth)
- `GET /api/events/mine` (auth)
- `PUT /api/events/{eventId}` (auth)
- `DELETE /api/events/{eventId}` (auth)
- `GET /api/events/{slug}` (public)

Gift:

- `POST /api/events/{eventId}/gifts` (auth)
- `GET /api/events/{eventId}/gifts` (public)

Reservation:

- `POST /api/gifts/{giftId}/reserve` (public)
- `POST /api/gifts/{giftId}/unreserve` (public)

### Segurança e tratamento de erro

- JWT Bearer para rotas privadas
- senha com hash PBKDF2
- middleware global para `ProblemDetails`

## Frontend (MVP+)

Stack:

- HTML/CSS/JavaScript puro
- sem framework
- sem build step

Estrutura por telas:

- `index.html` (landing)
- `register.html` (cadastro)
- `login.html` (login)
- `create-event.html` (criar evento)
- `my-events.html` (gerenciar eventos)
- `my-event.html` (gerenciar presentes)
- `account.html` (conta)
- `event.html` (evento público)

JS organizado por responsabilidade:

- `js/common.js` (helpers compartilhados)
- `js/*.js` (lógica de cada tela)

## Qualidade e CI

- testes de integração em `Weddingifts.Api.IntegrationTests`
- execução em `WebApplicationFactory<Program>` + SQLite in-memory
- workflow `.github/workflows/dotnet-ci.yml` com restore/build/test

## Decisões arquiteturais atuais

- simplicidade e clareza primeiro
- frontend desacoplado do backend via API REST
- separação por camadas no backend
- separação por tela no frontend
- evolução incremental preservando fluxos existentes
