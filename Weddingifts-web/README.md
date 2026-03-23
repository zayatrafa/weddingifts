# Weddingifts Frontend MVP+ (Multi-page)

Frontend em HTML/CSS/JavaScript puro, sem framework e sem build step.

## Estrutura de telas

- `index.html` - Landing page
- `register.html` - Criar conta
- `login.html` - Entrar
- `create-event.html` - Criar evento (privado)
- `my-events.html` - Gerenciar meus eventos (privado)
- `my-guests.html` - Gerenciar convidados de um evento (privado)
- `my-event.html` - Gerenciar presentes de um evento (privado)
- `account.html` - Minha conta (privado)
- `event.html` - Página pública do evento por slug

## Organização dos scripts

- `js/common.js` - helpers compartilhados (API, sessão, status, dropdown)
- `js/landing.js`
- `js/register.js`
- `js/login.js`
- `js/create-event.js`
- `js/my-events.js`
- `js/my-guests.js`
- `js/my-event.js`
- `js/account.js`
- `js/event.js`

## Como rodar localmente

1. Subir API (porta 5298)

```powershell
cd ../Weddingifts.Api
dotnet run
```

2. Subir frontend estático (porta 5500)

```powershell
cd ../Weddingifts-web
py -m http.server 5500
```

3. Acessar no navegador

- Landing: [http://localhost:5500](http://localhost:5500)
- Evento público por slug: [http://localhost:5500/event.html?slug=SEU_SLUG](http://localhost:5500/event.html?slug=SEU_SLUG)

## Fluxos implementados

### Público

- carregar evento por slug (`GET /api/events/{slug}`)
- listar presentes (`GET /api/events/{eventId}/gifts`)
- reservar (`POST /api/gifts/{giftId}/reserve`) com CPF
- cancelar reserva (`POST /api/gifts/{giftId}/unreserve`)

### Conta e autenticação

- cadastrar usuário (`POST /api/users`) com CPF e data de nascimento
- login (`POST /api/auth/login`)
- sessão JWT em `localStorage`

### Eventos (privado)

- criar evento (`POST /api/events`)
- listar meus eventos (`GET /api/events/mine`)
- editar evento (`PUT /api/events/{eventId}`)
- excluir evento (`DELETE /api/events/{eventId}`)

### Convidados (privado)

- criar convidado por evento (`POST /api/events/{eventId}/guests`)
- listar convidados por evento (`GET /api/events/{eventId}/guests`)
- lookup por CPF no evento (`GET /api/events/{eventId}/guests/by-cpf/{cpf}`)

### Presentes (privado)

- criar presente (`POST /api/events/{eventId}/gifts`)
- listar presentes por evento (`GET /api/events/{eventId}/gifts`)
- validações de negócio:
  - `price > 0`
  - `price < 1000000`
  - `quantity >= 1`
  - `quantity <= 100000`

## Navegação e UX

- menu no topo com estados logado/deslogado
- ações privadas em dropdown do usuário
- agrupamento de subitens para gerenciamento de eventos
- feedback visual para loading/sucesso/erro
- mensagens de erro exibem `ProblemDetails.detail` quando disponível
- layout responsivo desktop/mobile

## Observação importante

Se aparecer erro `501 Unsupported method ('POST')` no browser, normalmente a API não está rodando e apenas o servidor estático foi iniciado. Garanta que o backend esteja ativo em `http://localhost:5298`.
