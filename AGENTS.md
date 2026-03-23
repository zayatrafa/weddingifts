# Weddingifts - Contexto do Projeto para Agentes de Código

Este arquivo descreve o estado atual do projeto Weddingifts.
Qualquer agente (Codex, Copilot, etc.) deve ler este documento antes de alterar código.

---

## Visão Geral

Weddingifts é uma aplicação para criação e gerenciamento de listas de presentes de casamento.

Fluxo principal atual:

- casal cria conta
- casal faz login
- casal cria eventos
- casal cadastra convidados por evento
- casal cadastra presentes por evento
- convidados acessam página pública por slug e reservam/cancelam presentes com CPF

Objetivos do projeto:

- aprendizado técnico com boas práticas modernas
- portfólio profissional
- base para evolução futura como SaaS
- entregar um MVP publicável e utilizável por usuários reais

---

## Estado Atual (Mar/2026)

### Backend implementado

- criação de usuário (`POST /api/users`)
  - com `name`, `email`, `password`, `cpf`, `birthDate`
  - `cpf` obrigatório e único
  - `birthDate` obrigatório e não pode ser futura
- listagem de usuários (`GET /api/users`, sem expor `PasswordHash`)
- login com JWT (`POST /api/auth/login`)
- criação de evento autenticado (`POST /api/events`)
- listagem de eventos do usuário autenticado (`GET /api/events/mine`)
- atualização de evento do usuário autenticado (`PUT /api/events/{eventId}`)
- exclusão de evento do usuário autenticado (`DELETE /api/events/{eventId}`)
- recuperação pública de evento por slug (`GET /api/events/{slug}`)
- criação de presente por evento (`POST /api/events/{eventId}/gifts`)
- listagem de presentes por evento (`GET /api/events/{eventId}/gifts`)
- criação de convidado por evento (`POST /api/events/{eventId}/guests`)
- listagem de convidados por evento (`GET /api/events/{eventId}/guests`)
- busca de convidado por CPF no evento (`GET /api/events/{eventId}/guests/by-cpf/{cpf}`)
- reserva de presente com CPF (`POST /api/gifts/{giftId}/reserve`)
  - reserva só permitida para CPF convidado do evento
- cancelamento de reserva (`POST /api/gifts/{giftId}/unreserve`)

### Regras importantes de negócio (estado atual)

- evento:
  - usuário deve existir
  - nome obrigatório
  - data obrigatória
  - slug único gerado automaticamente
  - editar/excluir permitido apenas para o dono autenticado
- presente:
  - evento deve existir
  - `price > 0`
  - `price < 1000000`
  - `quantity >= 1`
  - `quantity <= 100000`
- convidado:
  - `cpf` com 11 dígitos
  - `cpf` único por evento
  - nome, email e telefone obrigatórios
- reserva:
  - exige CPF válido
  - CPF precisa estar cadastrado como convidado do evento
  - não reserva se indisponível
  - incrementa/decrementa `ReservedQuantity`
  - limpa `ReservedBy`/`ReservedAt` quando volta a zero

### Qualidade e plataforma

- middleware global para erros com `ProblemDetails`
- CORS para frontend local (`http://localhost:5500` e `http://127.0.0.1:5500`)
- aplicação automática de migrations com `Database.Migrate()`
- testes de integração backend (`Weddingifts.Api.IntegrationTests`)
- CI com GitHub Actions em push e pull request (`restore/build/test`)

### Frontend MVP+ implementado (HTML/CSS/JS puro)

- landing page (`index.html`)
- cadastro (`register.html`)
  - confirmação de senha
  - CPF e data de nascimento
  - redirecionamento para login após sucesso
- login (`login.html`)
  - aviso contextual de pós-cadastro (placeholder de confirmação por email)
  - tratamento amigável de credenciais inválidas
- criação de evento (`create-event.html`)
  - redireciona para gerenciamento do evento criado
- gerenciamento de eventos (`my-events.html`)
  - editar nome/data
  - excluir evento
  - copiar link público
  - abrir gerenciamento de convidados
  - abrir gerenciamento de presentes
- gerenciamento de convidados (`my-guests.html`)
- gerenciamento de presentes (`my-event.html`)
  - preço em formato BRL no input
  - validações amigáveis de preço e quantidade
- minha conta (`account.html`)
- evento público (`event.html`)
  - reserva exigindo CPF

Layout atual:

- menu com estado logado/deslogado
- menu dropdown com agrupamento de subitens para gerenciamento de eventos
- interface responsiva desktop/mobile
- API base fixa no frontend: `http://localhost:5298`

---

## Stack

Backend:

- .NET 8
- ASP.NET Core Web API
- Entity Framework Core
- PostgreSQL
- JWT Bearer

Frontend:

- HTML/CSS/JavaScript puro
- sem framework
- sem build step

Ferramentas:

- Git + GitHub
- Swagger/OpenAPI
- GitHub Actions

---

## Arquitetura

Arquitetura em camadas no backend:

Controllers -> Services -> DbContext -> Database

Responsabilidades:

- Controllers: HTTP, autenticação/autorização, DTOs, resposta
- Services: regras de negócio e validações
- Entities: mapeamento de persistência
- Models: requests/responses da API

Estrutura principal:

- `Weddingifts.Api/Controllers`
- `Weddingifts.Api/Services`
- `Weddingifts.Api/Entities`
- `Weddingifts.Api/Models`
- `Weddingifts.Api/Data`
- `Weddingifts.Api/Middleware`
- `Weddingifts.Api/Security`
- `Weddingifts.Api/Migrations`

Frontend organizado por páginas + JS por responsabilidade:

- `Weddingifts-web/*.html`
- `Weddingifts-web/js/common.js` (helpers compartilhados)
- `Weddingifts-web/js/*.js` (lógica por tela)

---

## Modelo de Dados

Entidades:

- `User`
- `Event`
- `Gift`
- `EventGuest`

Relacionamentos:

- `User` 1:N `Event`
- `Event` 1:N `Gift`
- `Event` 1:N `EventGuest`

Observações:

- exclusão de evento remove presentes e convidados relacionados (cascade)
- `User.Cpf` único global
- `EventGuest` possui índice único em `(EventId, Cpf)`

---

## Padrões de API e Segurança

- autenticação JWT para rotas privadas
- erro de domínio -> HTTP 400
- recurso não encontrado -> HTTP 404
- erro inesperado -> HTTP 500
- frontend deve exibir `ProblemDetails.detail` quando existir

Importante:

- proteção contra SQL injection já é tratada por padrão via EF Core (queries parametrizadas)
- ainda assim, manter validações de entrada e não concatenar SQL manual

---

## Execução Local (Windows)

Opção 1 (recomendada):

- `run.bat`

Opção 2 (manual):

Backend:

```powershell
cd Weddingifts.Api
dotnet run
```

Frontend:

```powershell
cd Weddingifts-web
py -m http.server 5500
```

URLs:

- frontend: `http://localhost:5500`
- API: `http://localhost:5298`

Importante:

- erro `501 Unsupported method ('POST')` no navegador costuma indicar que apenas o servidor estático foi iniciado e a API não está rodando.

Testes:

```powershell
dotnet restore Weddingifts.Api/Weddingifts.Api.sln --configfile Weddingifts.Api/NuGet.Config
dotnet test Weddingifts.Api/Weddingifts.Api.sln --no-restore
```

---

## Diretrizes para Mudanças

1. Manter arquitetura atual e simplicidade.
2. Não introduzir framework frontend sem pedido explícito.
3. Manter controllers enxutos e regras nos services.
4. Não expor campos sensíveis em responses.
5. Preservar compatibilidade com fluxos já existentes.
6. Sempre validar impacto em login, eventos, convidados, presentes e página pública.
7. Preferir mensagens de erro em PT-BR no frontend.
8. Garantir limites de tamanho em campos de entrada no frontend e backend.

---

## Situação do Produto

Resumo objetivo:

- o fluxo principal do produto já está em forma de MVP funcional
- o projeto ainda está em pré-produção (MVP publicável em progresso)

Para considerar "MVP publicável", faltam principalmente:

1. acabamento de UX e consistência de validações/mensagens
2. endurecimento de segurança operacional (rate-limit, headers, etc.)
3. setup de deploy (staging/produção), observabilidade e backup

---

## Próxima Janela de Evolução (Sugestão)

Prioridade recomendada:

1. Sprint de estabilização do MVP publicável (UX, validações, limites, i18n PT-BR).
2. Sprint de produção mínima (deploy, domínio, HTTPS, banco gerenciado, secrets, logs, backup).
3. Go-live controlado com poucos usuários e ciclo curto de feedback/correção.
4. Pós-MVP: confirmação real por email, convites por WhatsApp/email e refino visual amplo.
