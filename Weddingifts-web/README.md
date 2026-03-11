# Weddingifts Front MVP+ (Multi-page)

Frontend em HTML/CSS/JavaScript puro, com layout responsivo e páginas separadas por fluxo.

## Páginas

- `index.html` - Landing page
- `register.html` - Cadastro de usuário
- `login.html` - Login (JWT)
- `create-event.html` - Área privada para criar evento
- `my-events.html` - Área privada para gerenciar eventos
- `my-event.html` - Área privada para gerenciar presentes
- `account.html` - Área privada de conta
- `event.html` - Página pública do evento por slug

## Como rodar

1. Suba a API (`Weddingifts.Api`) na porta padrão local: `http://localhost:5298`.

```powershell
cd ../Weddingifts.Api
dotnet run
```

2. Suba o servidor estático do frontend:

```powershell
cd ../Weddingifts-web
py -m http.server 5500
```

3. Abra no navegador:

- Landing: [http://localhost:5500](http://localhost:5500)
- Cadastro: [http://localhost:5500/register.html](http://localhost:5500/register.html)
- Login: [http://localhost:5500/login.html](http://localhost:5500/login.html)
- Criar evento: [http://localhost:5500/create-event.html](http://localhost:5500/create-event.html)
- Meus eventos: [http://localhost:5500/my-events.html](http://localhost:5500/my-events.html)
- Gerenciar presentes: [http://localhost:5500/my-event.html](http://localhost:5500/my-event.html)
- Minha conta: [http://localhost:5500/account.html](http://localhost:5500/account.html)
- Evento público: [http://localhost:5500/event.html](http://localhost:5500/event.html)

## Fluxos implementados

### Público

- carregar evento por slug (`GET /api/events/{slug}`)
- listar presentes (`GET /api/events/{eventId}/gifts`)
- reservar presente (`POST /api/gifts/{giftId}/reserve`)
- cancelar reserva (`POST /api/gifts/{giftId}/unreserve`)

### Privado (JWT)

- login (`POST /api/auth/login`)
- listar eventos do usuário (`GET /api/events/mine`)
- criar evento (`POST /api/events`)
- criar presente no próprio evento (`POST /api/events/{eventId}/gifts`)

### Cadastro

- criar usuário (`POST /api/users`)
- exibir erros de backend via `ProblemDetails.detail`

## Notas

- sem framework e sem build step
- API do frontend fixada em `http://localhost:5298`
- sessão JWT armazenada em `localStorage`
- layout responsivo para desktop e mobile
