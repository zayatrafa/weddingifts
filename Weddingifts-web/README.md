# Weddingifts Front MVP

Frontend integrado aos endpoints reais do backend para leitura, reserva e cancelamento de presentes.

## Como abrir

1. Suba a API em `http://localhost:5298`:

```powershell
cd ../Weddingifts.Api
dotnet run
```

2. Suba um servidor estatico para o front:

```powershell
cd ../Weddingifts-web
py -m http.server 5500
```

3. Abra [http://localhost:5500](http://localhost:5500)

## Como usar

- Informe a URL da API (padrao `http://localhost:5298`)
- Informe o slug do evento cadastrado no banco
- Opcional: informe o nome do convidado
- Clique em `Carregar evento`
- Use `Reservar` ou `Cancelar` nos cards

Endpoints usados:

- `GET /api/events/{slug}`
- `GET /api/events/{eventId}/gifts`
- `POST /api/gifts/{giftId}/reserve`
- `POST /api/gifts/{giftId}/unreserve`
