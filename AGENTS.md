# Weddingifts - Contexto do Projeto para Agentes de Código

Este arquivo descreve o estado atual do projeto Weddingifts.
Qualquer agente (Codex, Copilot, etc.) deve ler este documento antes de alterar código.

---

## Visão Geral

Weddingifts é uma aplicação para criação e gerenciamento de listas de presentes de casamento.

Fluxo principal:

- casal cria conta
- casal faz login
- casal cria eventos
- casal cadastra presentes por evento
- convidados acessam página pública por slug e reservam/cancelam presentes

Objetivos do projeto:

- aprendizado técnico com boas práticas modernas
- portfólio profissional
- base para evolução futura como SaaS

---

## Estado Atual (Mar/2026)

### Backend implementado

- criação de usuário (`POST /api/users`)
- listagem de usuários (`GET /api/users`, sem expor `PasswordHash`)
- login com JWT (`POST /api/auth/login`)
- criação de evento autenticado (`POST /api/events`)
- listagem de eventos do usuário autenticado (`GET /api/events/mine`)
- atualização de evento do usuário autenticado (`PUT /api/events/{eventId}`)
- exclusão de evento do usuário autenticado (`DELETE /api/events/{eventId}`)
- recuperação pública de evento por slug (`GET /api/events/{slug}`)
- criação de presente por evento (`POST /api/events/{eventId}/gifts`)
- listagem de presentes por evento (`GET /api/events/{eventId}/gifts`)
- reserva de presente (`POST /api/gifts/{giftId}/reserve`)
- cancelamento de reserva (`POST /api/gifts/{giftId}/unreserve`)

### Qualidade e plataforma

- middleware global para erros com `ProblemDetails`
- CORS para frontend local (`http://localhost:5500` e `http://127.0.0.1:5500`)
- aplicação automática de migrations com `Database.Migrate()`
- testes de integração backend (`Weddingifts.Api.IntegrationTests`)
- CI com GitHub Actions em push e pull request (`restore/build/test`)

### Frontend MVP+ implementado (HTML/CSS/JS puro)

- landing page (`index.html`)
- cadastro (`register.html`)
- login (`login.html`)
- criação de evento (`create-event.html`)
- gerenciamento de eventos (`my-events.html`)
  - editar nome/data
  - excluir evento
  - copiar link público
  - abrir gerenciamento de presentes
- gerenciamento de presentes (`my-event.html`)
- minha conta (`account.html`)
- evento público (`event.html`)

Layout atual:

- menu com estado logado/deslogado
- menu dropdown do usuário logado com ações privadas
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

Relacionamentos:

- `User` 1:N `Event`
- `Event` 1:N `Gift`

Observação:

- exclusão de evento remove presentes relacionados (cascade)

---

## Regras de Negócio

Usuário:

- senha obrigatoriamente hash (PBKDF2)

Evento:

- usuário deve existir
- nome obrigatório
- data obrigatória
- slug único gerado automaticamente
- editar/excluir permitido apenas para o dono autenticado

Presente:

- evento deve existir
- `price >= 0`
- `quantity >= 1`

Reserva:

- não pode reservar se indisponível
- incrementa `ReservedQuantity`
- não pode cancelar quando `ReservedQuantity == 0`
- decrementa `ReservedQuantity`
- limpa `ReservedBy`/`ReservedAt` quando volta a zero

---

## Padrões de API e Segurança

- autenticação JWT para rotas privadas
- erro de domínio -> HTTP 400
- recurso não encontrado -> HTTP 404
- erro inesperado -> HTTP 500
- frontend deve exibir `ProblemDetails.detail` quando existir

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
6. Sempre validar impacto em login, eventos, presentes e página pública.

---

## Próxima Janela de Evolução (Sugestão)

Prioridade recomendada:

1. Backend de conta do usuário (alterar senha e perfil).
2. Refinar UX do painel privado (feedbacks, estados vazios, confirmações).
3. Adicionar testes de integração para editar/excluir evento.
4. Planejar versionamento de API e observabilidade básica (logs estruturados).
