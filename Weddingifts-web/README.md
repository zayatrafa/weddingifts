# Weddingifts Front MVP+ (Multi-page)

Frontend em HTML/CSS/JavaScript puro, com layout clean responsivo e paginas separadas para cada fluxo.

## Paginas

- `index.html` - Landing page
- `register.html` - Cadastro de usuario
- `login.html` - Login (JWT)
- `my-event.html` - Painel privado do casal
- `event.html` - Pagina publica do evento por slug

## Como rodar

1. Suba a API (`Weddingifts.Api`) na porta desejada (padrao local: `http://localhost:5298`):

```powershell
cd ../Weddingifts.Api
dotnet run
```

2. Suba o servidor estatico do frontend:

```powershell
cd ../Weddingifts-web
py -m http.server 5500
```

3. Abra no navegador:

- Landing: [http://localhost:5500](http://localhost:5500)
- Login: [http://localhost:5500/login.html](http://localhost:5500/login.html)
- Cadastro: [http://localhost:5500/register.html](http://localhost:5500/register.html)
- Painel: [http://localhost:5500/my-event.html](http://localhost:5500/my-event.html)
- Evento publico: [http://localhost:5500/event.html](http://localhost:5500/event.html)

## Fluxos implementados

### Publico

- carregar evento por slug (`GET /api/events/{slug}`)
- listar presentes (`GET /api/events/{eventId}/gifts`)
- reservar presente (`POST /api/gifts/{giftId}/reserve`)
- cancelar reserva (`POST /api/gifts/{giftId}/unreserve`)

### Privado (JWT)

- login (`POST /api/auth/login`)
- listar eventos do usuario (`GET /api/events/mine`)
- criar evento (`POST /api/events`)
- criar presente no proprio evento (`POST /api/events/{eventId}/gifts`)

### Cadastro

- criar usuario (`POST /api/users`)
- exibir erros de backend via `ProblemDetails.detail`

## Notas

- sem framework e sem build step
- mesma API base reutilizada em todas as paginas
- sessao JWT armazenada em `localStorage`
- layout responsivo para desktop e mobile

