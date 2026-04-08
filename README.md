# Weddingifts

PT-BR | [English](#english)

Weddingifts is a real MVP for wedding gift lists. It was built to solve a real use case (my own wedding) and to showcase production-minded engineering decisions for recruiters.

## PT-BR

### Product Pitch
Weddingifts é um MVP real de lista de presentes para casamento, com foco em experiência prática para noivos e convidados: criação de evento, gestão de convidados, gestão de presentes e reserva pública com regras de negócio consistentes.

### 60s Scan (Para Recrutadores)
- Problema: organizar presentes e convidados com regras claras, sem fluxo confuso.
- Solução: API .NET com regras de negócio centralizadas + frontend multipágina sem framework.
- Qualidade: testes de integração, tratamento de erro consistente (`ProblemDetails`), segurança com JWT e headers.
- Evolução: roadmap ativo com marcos já entregues e próximos passos definidos para go-live controlado.

### Arquitetura e Decisões Técnicas
- Backend: .NET 8, ASP.NET Core Web API, Entity Framework Core, PostgreSQL, JWT.
- Frontend: HTML/CSS/JS puro, sem build step.
- Arquitetura em camadas: `Controllers -> Services -> DbContext`.
- Controllers finos; regras de negócio no domínio (services).
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

### Features Entregues x Próximas

Entregues:
- Cadastro e login com JWT.
- Gestão de eventos (criar/listar/editar/excluir).
- Gestão de convidados por evento (criar/listar/lookup por CPF).
- Gestão de presentes por evento.
- Página pública por `slug` com reserva/cancelamento por CPF.
- Regras de validação de domínio para usuários, eventos, convidados e presentes.

Próximas (foco atual):
- Estabilização de sessão e UX de erro.
- Testes mobile completos e ajustes responsivos.
- RSVP (confirmação de presença) e contagem na gestão.
- Privacidade configurável por evento.
- Pagamento em etapas (PIX primeiro, cartão depois).

### Qualidade (Testes, Segurança, CI)
- Testes de integração em `Weddingifts.Api.IntegrationTests`.
- CI com GitHub Actions (`restore`, `build`, `test`).
- Segurança aplicada:
  - JWT em rotas privadas.
  - Rate limiting.
  - Security headers (CSP, HSTS, COOP/CORP e outros).
  - CORS controlado.

### Como Rodar Localmente (2-3 comandos)
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

Acessar:
- Frontend: `http://localhost:5500`
- API: `http://localhost:5298`

### Engineering Highlights
- Sessão e autorização: páginas privadas dependem de token válido para evitar inconsistência de navegação.
- Privacidade por evento (decisão de produto): o organizador define o que é público e o que é restrito.
- Política para edição de presente reservado (em definição): bloquear alterações que afetem reserva já feita.
- Modelo de convidado por CPF: convidado pode reservar sem criar conta, mantendo fricção baixa no fluxo público.

### Evidências Visuais (Atualizar a cada onda)
- Fluxo de cadastro e login: adicionar print/GIF.
- Gestão de eventos: adicionar print/GIF.
- Gestão de convidados: adicionar print/GIF.
- Gestão de presentes: adicionar print/GIF.
- Página pública de reserva: adicionar print/GIF.

Sugestão de pasta para evidências: `assets/readme/`.

### Changelog Resumido por Marco
- Fase 1: Núcleo backend (usuários, evento, presentes, evento público por slug).
- Fase 2: Reserva/cancelamento com proteção contra over-reservation.
- Fase 3: Qualidade de API com validações e middleware global de erro.
- Fase 4: Testes de integração e CI.
- Fase 5: Frontend MVP multipágina.
- Fase 6: Painel privado de eventos.
- Fase 7: Convidados por evento + validação de reserva por CPF convidado.
- Fase 8: Cadastro reforçado (CPF + data nascimento + confirmação de senha).
- Fase 9: Regras de presentes e ajustes de UX.
- Fase 10 (em andamento): estabilização MVP publicável.

### Política de README (Trilha Contínua de Portfólio)
- Toda onda de entrega deve incluir atualização deste README.
- PT-BR e EN devem permanecer consistentes.
- Cada incremento relevante deve refletir:
  - o que foi entregue;
  - impacto técnico/produto;
  - evidência visual quando aplicável.

---

## English

### Product Pitch
Weddingifts is a real-world wedding gift-list MVP focused on practical usability for couples and guests: event creation, guest management, gift management, and public gift reservation with solid business rules.

### 60s Recruiter Scan
- Problem: simplify gift and guest operations with reliable, explicit rules.
- Solution: layered .NET API + framework-free multipage frontend.
- Quality: integration tests, consistent error contract (`ProblemDetails`), JWT-based security.
- Progress: active roadmap with shipped milestones and clear next steps toward controlled go-live.

### Architecture and Technical Decisions
- Backend: .NET 8, ASP.NET Core Web API, Entity Framework Core, PostgreSQL, JWT.
- Frontend: plain HTML/CSS/JavaScript, no framework, no build step.
- Layered architecture: `Controllers -> Services -> DbContext`.
- Thin controllers, domain rules in services.
- Consistent backend error model using `ProblemDetails`.

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

### Delivered vs Upcoming Features

Delivered:
- User registration and login with JWT.
- Event management (create/list/update/delete).
- Guest management per event (create/list/CPF lookup).
- Gift management per event.
- Public event page by `slug` with CPF-based reserve/unreserve.
- Domain-level validation for users, events, guests, and gifts.

Upcoming (current focus):
- Session stabilization and better auth/UX behavior.
- Full mobile test pass and responsive fixes.
- RSVP and confirmation counters in event management.
- Event-level privacy controls.
- Phased payment support (PIX first, card integration later).

### Quality (Tests, Security, CI)
- Integration tests in `Weddingifts.Api.IntegrationTests`.
- GitHub Actions CI (`restore`, `build`, `test`).
- Security practices:
  - JWT on private routes.
  - Rate limiting.
  - Security headers (CSP, HSTS, COOP/CORP and others).
  - Controlled CORS.

### Run Locally (2-3 commands)
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

### Engineering Highlights
- Session/auth behavior: private screens require a valid token to avoid inconsistent management flows.
- Event-level privacy (product decision): organizers decide what is public vs guest-only.
- Reserved gift edit policy (in definition): block edits that break existing reservations.
- CPF-first guest model: guests can reserve gifts without creating an account, reducing friction.

### Visual Evidence (Update every wave)
- Registration and login flow: add screenshot/GIF.
- Event management: add screenshot/GIF.
- Guest management: add screenshot/GIF.
- Gift management: add screenshot/GIF.
- Public reservation flow: add screenshot/GIF.

Suggested evidence folder: `assets/readme/`.

### Milestone Changelog (Summary)
- Phase 1: Backend core.
- Phase 2: Reservation/cancellation with over-reservation safeguards.
- Phase 3: API quality and global error middleware.
- Phase 4: Integration tests and CI.
- Phase 5: Multipage frontend MVP.
- Phase 6: Private event dashboard.
- Phase 7: Guest flows + CPF-based reservation eligibility.
- Phase 8: Stronger signup inputs and validation.
- Phase 9: Gift rules and UX refinements.
- Phase 10 (in progress): MVP stabilization.

### README Policy (Continuous Portfolio Track)
- Every delivery wave must include a README update.
- PT-BR and EN sections must stay aligned.
- Each relevant increment should capture:
  - what shipped;
  - technical/product impact;
  - visual evidence when applicable.
