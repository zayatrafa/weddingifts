# Weddingifts - Contexto para Agentes (Abr/2026)

Este arquivo consolida o estado real do projeto para continuidade em novos chats.
Objetivo: evitar regressões e acelerar handoff entre agentes.

---

## 1) Estado atual do produto

Weddingifts é uma aplicação de lista de presentes de casamento com fluxo ponta a ponta funcional.

Fluxo principal atual:

- casal cria conta
- casal faz login
- casal cria eventos
- casal gerencia convidados por evento
- casal gerencia presentes por evento
- convidados acessam página pública por slug
- convidados reservam e cancelam presente com CPF

Status: MVP funcional concluído e em fase de estabilização para MVP publicável.

---

## 2) Stack e arquitetura

Backend:

- .NET 8
- ASP.NET Core Web API
- Entity Framework Core
- PostgreSQL
- JWT

Frontend:

- HTML/CSS/JavaScript puro
- sem framework
- sem build step

Arquitetura backend:

Controllers -> Services -> DbContext -> Database

Responsabilidades:

- Controllers: camada HTTP
- Services: regras de negócio e validações
- Data/Entities: persistência
- Models: contratos request/response
- Middleware: tratamento global e hardening

---

## 3) Funcionalidades implementadas

### Usuários e autenticação

- cadastro de usuário (`POST /api/users`) com `name`, `email`, `password`, `cpf`, `birthDate`
- CPF único no usuário
- validação de data de nascimento
- login JWT (`POST /api/auth/login`)

### Eventos

- criar evento (`POST /api/events`)
- listar meus eventos (`GET /api/events/mine`)
- editar (`PUT /api/events/{eventId}`)
- excluir (`DELETE /api/events/{eventId}`)
- evento público por slug (`GET /api/events/{slug}`)
- data do evento validada como futura

### Convidados

- criar convidado (`POST /api/events/{eventId}/guests`)
- listar convidados (`GET /api/events/{eventId}/guests`)
- buscar por CPF no evento (`GET /api/events/{eventId}/guests/by-cpf/{cpf}`)
- editar convidado
- remover convidado

### Presentes

- criar presente (`POST /api/events/{eventId}/gifts`)
- listar presentes (`GET /api/events/{eventId}/gifts`)
- editar presente
- remover presente
- regras atuais:
  - `price > 0`
  - `price < 1000000`
  - `quantity >= 1`
  - `quantity <= 100000`

### Reserva de presentes

- reservar com CPF (`POST /api/gifts/{giftId}/reserve`)
- cancelar com CPF (`POST /api/gifts/{giftId}/unreserve` com body `guestCpf`)
- cancelamento só permitido para CPF com reserva ativa
- histórico de reservas por presente/convidado
- endpoint de histórico por evento:
  - `GET /api/events/{eventId}/gifts/reservations`

---

## 4) Modelo de dados relevante

Entidades principais:

- `User`
- `Event`
- `EventGuest`
- `Gift`
- `GiftReservation`

Relacionamentos:

- `User` 1:N `Event`
- `Event` 1:N `EventGuest`
- `Event` 1:N `Gift`
- `Gift` 1:N `GiftReservation`

Observações:

- deleção de evento em cascade para convidados e presentes
- regra de autoria por CPF para cancelamento de reserva

---

## 5) Hardening e segurança já aplicados

- middleware global de exceções com `ProblemDetails`
- middleware de headers de segurança (`SecurityHeadersMiddleware`)
- rate limiting global e mais rígido para rotas sensíveis
- rate limiting desativado automaticamente no ambiente `Testing` (para não quebrar suíte de integração)
- validação de input suspeito contra payloads maliciosos (`InputThreatValidator`)
- validações de tamanho e formato em services (nome, email, telefone, senha etc.)
- mensagens de validação e autenticação em PT-BR no backend

Importante:

- EF Core já usa queries parametrizadas por padrão (proteção base contra SQL injection)
- manter proibição de SQL manual concatenado em qualquer evolução

---

## 6) Frontend atual

Páginas:

- `index.html`
- `register.html`
- `login.html`
- `create-event.html`
- `my-events.html`
- `my-guests.html`
- `my-event.html`
- `account.html`
- `event.html`

UX atual:

- menu logado/deslogado
- dropdown de usuário com agrupamento de gerenciamento
- feedback de status (loading/sucesso/erro)
- preço no front em formato BRL nas telas de presentes

---

## 7) Arquivos-chave desta fase

Backend:

- `Weddingifts.Api/Program.cs`
- `Weddingifts.Api/Middleware/GlobalExceptionMiddleware.cs`
- `Weddingifts.Api/Middleware/SecurityHeadersMiddleware.cs`
- `Weddingifts.Api/Services/InputThreatValidator.cs`
- `Weddingifts.Api/Services/UserService.cs`
- `Weddingifts.Api/Services/AuthService.cs`
- `Weddingifts.Api/Services/EventService.cs`
- `Weddingifts.Api/Services/EventGuestService.cs`
- `Weddingifts.Api/Services/GiftService.cs`
- `Weddingifts.Api/Data/AppDbContext.cs`
- `Weddingifts.Api/Migrations/20260403000100_AddGiftReservations.cs`

Frontend:

- `Weddingifts-web/js/common.js`
- `Weddingifts-web/js/register.js`
- `Weddingifts-web/js/login.js`
- `Weddingifts-web/js/create-event.js`
- `Weddingifts-web/js/my-events.js`
- `Weddingifts-web/js/my-guests.js`
- `Weddingifts-web/js/my-event.js`
- `Weddingifts-web/js/event.js`
- `Weddingifts-web/js/landing.js`
- `Weddingifts-web/styles.css`

---

## 8) O que manter em qualquer próxima mudança

1. Não remover validação de CPF em reserve/unreserve.
2. Não permitir cancelamento sem autoria por CPF.
3. Manter services como centro das regras de negócio.
4. Manter feedback amigável no frontend.
5. Não reverter alterações de outros chats em paralelo.
6. Se houver conflito de mudanças, fazer merge lógico preservando comportamento já estável.

---

## 9) Próximo passo recomendado no novo chat

Abrir com objetivo claro de sprint, por exemplo:

- "Sprint 1 - Estabilização MVP publicável"

Escopo sugerido da próxima sprint:

1. limites máximos de caracteres em todos os campos (front e back)
2. padronização final de mensagens PT-BR
3. revisão final de redirecionamentos de login/eventos
4. rodapé global em todas as páginas
5. checklist final de preparação de deploy (staging/produção)

---

## 10) Nota de handoff

Este arquivo foi atualizado para continuidade imediata em novo chat.
Caso exista outro chat alterando em paralelo, este conteúdo deve ser tratado como base de referência e não como ordem para desfazer trabalho já válido.

Última validação técnica registrada neste chat:

- build backend: OK
- integração backend: OK (`11/11`)
