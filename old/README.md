# Weddingifts

PT-BR | [English](#english)

Weddingifts is a real MVP for wedding gift lists. It was built for a real use case and is also maintained as a portfolio project focused on product quality, business rules, and production-minded engineering.

## PT-BR

### Product Pitch
Weddingifts é um MVP real de lista de presentes para casamento, com foco em experiência prática para noivos e convidados: criação de evento, gestão de convidados, gestão de presentes e reserva pública com regras de negócio consistentes.

### 60s Scan (Para recrutadores)
- Problema: organizar presentes e convidados com regras claras, sem fluxo confuso.
- Solução: API .NET com regras de negócio centralizadas + frontend multipágina sem framework.
- Qualidade: testes de integração, tratamento de erro consistente (`ProblemDetails`), segurança com JWT e headers.
- Evolução: roadmap ativo com marcos entregues e próximos passos definidos para um go-live controlado.

### Arquitetura e decisões técnicas
- Backend: .NET 8, ASP.NET Core Web API, Entity Framework Core, PostgreSQL e JWT.
- Frontend: HTML, CSS e JavaScript puros, sem build step.
- Arquitetura em camadas: `Controllers -> Services -> DbContext`.
- Controllers finos; regras de negócio concentradas em services.
- Erros padronizados no backend com `ProblemDetails`.

Pastas principais:
- `Weddingifts.Api/Controllers`
- `Weddingifts.Api/Services`
- `Weddingifts.Api/Entities`
- `Weddingifts.Api/Models`
- `Weddingifts.Api/Data`
- `Weddingifts.Api/Middleware`
- `Weddingifts.Api/Security`
- `Weddingifts.Api/Migrations`
- `Weddingifts-web`

### Features entregues x próximas

Entregues:
- Cadastro e login com JWT.
- Gestão de eventos (criar, listar, editar e excluir).
- Gestão de convidados por evento (criar, listar e buscar por CPF).
- Gestão de presentes por evento.
- Página pública por `slug` com reserva e cancelamento por CPF.
- Validações de domínio para usuários, eventos, convidados e presentes.

Próximas:
- RSVP e contagem de confirmações.
- Controles de privacidade por evento.
- Evolução do fluxo de pagamento.
- Recursos finais para piloto real.

### Qualidade (testes, segurança e CI)
- Testes de integração em `Weddingifts.Api.IntegrationTests`.
- CI com GitHub Actions (`restore`, `build`, `test`).
- Segurança aplicada:
  - JWT em rotas privadas.
  - Rate limiting.
  - Security headers.
  - CORS controlado por ambiente.

### Como rodar localmente
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

Acessos:
- Frontend: `http://localhost:5500`
- API: `http://localhost:5298`

### Engineering Highlights
- Sessão e autorização: páginas privadas exigem token válido e sincronizam expiração entre abas.
- Modelo de convidado por CPF: o convidado pode reservar sem criar conta, reduzindo fricção no fluxo público.
- Histórico de reservas: painel privado cruza reservas e convidados para melhorar rastreabilidade.
- Navegação pública e privada: fluxos foram desenhados para evitar estados inconsistentes de autenticação.

### Diretrizes permanentes do projeto
- PT-BR correto é regra do projeto: novas mensagens, labels, placeholders, títulos e feedbacks devem sair já revisados, com acentuação, concordância e pontuação corretas.
- Mobile é requisito nativo: toda implementação deve nascer válida para desktop, tablet e celular, com atenção especial à experiência mobile.
- Correções estruturais têm prioridade sobre remendos locais quando houver padrão recorrente de UX ou consistência.

### Evidências visuais
- Fluxo de cadastro e login: adicionar print ou GIF.
- Gestão de eventos: adicionar print ou GIF.
- Gestão de convidados: adicionar print ou GIF.
- Gestão de presentes: adicionar print ou GIF.
- Página pública de reserva: adicionar print ou GIF.

Sugestão de pasta para evidências: `assets/readme/`.

### Changelog resumido por marco
- Fase 1: núcleo backend.
- Fase 2: reserva e cancelamento com proteção contra over-reservation.
- Fase 3: qualidade de API com validações e middleware global de erro.
- Fase 4: testes de integração e CI.
- Fase 5: frontend MVP multipágina.
- Fase 6: painel privado de eventos.
- Fase 7: convidados por evento + validação de reserva por CPF convidado.
- Fase 8: cadastro reforçado (CPF, data de nascimento e confirmação de senha).
- Fase 9: regras de presentes e ajustes de UX.
- Fase 10: estabilização e consolidação do MVP.

### Política de README
- Toda onda de entrega deve atualizar este README.
- PT-BR e EN devem permanecer consistentes.
- Cada incremento relevante deve registrar:
  - o que foi entregue;
  - impacto técnico e de produto;
  - evidência visual quando aplicável.

---

## English

### Product Pitch
Weddingifts is a real-world wedding gift-list MVP focused on practical usability for couples and guests: event creation, guest management, gift management, and public gift reservation with solid business rules.

### 60s Recruiter Scan
- Problem: simplify gift and guest operations with reliable, explicit rules.
- Solution: layered .NET API plus a framework-free multipage frontend.
- Quality: integration tests, a consistent error contract (`ProblemDetails`), and JWT-based security.
- Progress: active roadmap with shipped milestones and clear next steps toward controlled go-live.

### Architecture and Technical Decisions
- Backend: .NET 8, ASP.NET Core Web API, Entity Framework Core, PostgreSQL, JWT.
- Frontend: plain HTML, CSS, and JavaScript, with no framework and no build step.
- Layered architecture: `Controllers -> Services -> DbContext`.
- Thin controllers, domain rules in services.
- Consistent backend error handling through `ProblemDetails`.

Main folders:
- `Weddingifts.Api/Controllers`
- `Weddingifts.Api/Services`
- `Weddingifts.Api/Entities`
- `Weddingifts.Api/Models`
- `Weddingifts.Api/Data`
- `Weddingifts.Api/Middleware`
- `Weddingifts.Api/Security`
- `Weddingifts.Api/Migrations`
- `Weddingifts-web`

### Delivered vs upcoming features

Delivered:
- User registration and login with JWT.
- Event management (create, list, update, delete).
- Guest management per event (create, list, CPF lookup).
- Gift management per event.
- Public event page by `slug` with CPF-based reserve and unreserve.
- Domain-level validation for users, events, guests, and gifts.

Upcoming:
- RSVP and confirmation counters.
- Event-level privacy controls.
- Payment flow evolution.
- Final pilot-ready features.

### Quality (tests, security, CI)
- Integration tests in `Weddingifts.Api.IntegrationTests`.
- GitHub Actions CI (`restore`, `build`, `test`).
- Security practices:
  - JWT on private routes.
  - Rate limiting.
  - Security headers.
  - Environment-aware CORS.

### Run locally
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

Access:
- Frontend: `http://localhost:5500`
- API: `http://localhost:5298`

### Permanent project directives
- Correct PT-BR copy is a project rule, not a one-off cleanup task.
- Mobile support is native scope: every change must be valid for desktop, tablet, and phone from the start.
- Structural fixes take priority over cosmetic local patches when recurring UX issues exist.
