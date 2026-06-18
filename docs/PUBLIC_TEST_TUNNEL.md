# Teste público temporário com Cloudflare Tunnel

Este runbook prepara o WeddinGifts para teste público temporário usando TryCloudflare, sem deploy real. As URLs `trycloudflare.com` geradas pelo `cloudflared` são temporárias e não devem ser commitadas como configuração definitiva.

## Pré-requisitos

- Backend local configurado com PostgreSQL e JWT.
- Frontend estático servido localmente.
- `cloudflared` instalado e disponível no terminal.
- Máquina ligada durante todo o teste.

## 1. Subir o backend local

Em um terminal:

```powershell
cd C:\Users\rafae\Documents\Projetos\Weddingifts
dotnet run --project Weddingifts.Api/Weddingifts.Api.csproj --urls http://localhost:5298
```

Verifique:

```powershell
Invoke-WebRequest http://localhost:5298/swagger/index.html -UseBasicParsing
```

## 2. Abrir túnel para o backend

Em outro terminal:

```powershell
cloudflared tunnel --url http://localhost:5298
```

Copie a URL pública gerada, por exemplo:

```text
https://backend-temporario.trycloudflare.com
```

## 3. Configurar o frontend para usar o backend público

Edite temporariamente `Weddingifts-web/js/api-config.js`:

```javascript
if (typeof window !== "undefined") {
  window.WEDDINGIFTS_API_BASE_URL = "https://backend-temporario.trycloudflare.com";
}
```

Use a URL real gerada no passo anterior. Antes de commit, volte este arquivo para o valor vazio:

```javascript
if (typeof window !== "undefined") {
  window.WEDDINGIFTS_API_BASE_URL = "";
}
```

## 4. Subir o frontend local

Em outro terminal:

```powershell
cd C:\Users\rafae\Documents\Projetos\Weddingifts\Weddingifts-web
py -m http.server 5500
```

Verifique:

```powershell
Invoke-WebRequest http://localhost:5500/login.html -UseBasicParsing
```

## 5. Abrir túnel para o frontend

Em outro terminal:

```powershell
cloudflared tunnel --url http://localhost:5500
```

Copie a URL pública gerada, por exemplo:

```text
https://frontend-temporario.trycloudflare.com
```

Esta é a URL que deve ser enviada aos testadores.

## 6. Configurar CORS para a URL pública do frontend

Pare e reinicie o backend incluindo a origem pública do frontend em `ALLOWED_ORIGINS`:

```powershell
cd C:\Users\rafae\Documents\Projetos\Weddingifts
$env:ALLOWED_ORIGINS="http://localhost:5500,http://127.0.0.1:5500,https://frontend-temporario.trycloudflare.com"
dotnet run --project Weddingifts.Api/Weddingifts.Api.csproj --urls http://localhost:5298
```

Troque `https://frontend-temporario.trycloudflare.com` pela URL real do túnel do frontend. Se a API já estava rodando, reinicie para a nova configuração entrar em vigor.

Também é possível usar estas chaves equivalentes:

```powershell
$env:AllowedOrigins="http://localhost:5500,http://127.0.0.1:5500,https://frontend-temporario.trycloudflare.com"
$env:Cors__AllowedOrigins="http://localhost:5500,http://127.0.0.1:5500,https://frontend-temporario.trycloudflare.com"
```

## 7. Validar fluxo público

Acesse a URL pública do frontend e teste pelo menos:

- abrir página pública por `event.html?slug=SEU_SLUG`;
- consultar CPF do convidado;
- confirmar RSVP;
- abrir lista de presentes;
- reservar e retirar presente;
- entrar no painel do casal e conferir dados.

## Como voltar para local

1. Pare os dois processos `cloudflared`.
2. Pare backend e frontend.
3. Volte `Weddingifts-web/js/api-config.js` para `window.WEDDINGIFTS_API_BASE_URL = "";`.
4. Remova a variável de ambiente do terminal atual:

```powershell
Remove-Item Env:ALLOWED_ORIGINS -ErrorAction SilentlyContinue
Remove-Item Env:AllowedOrigins -ErrorAction SilentlyContinue
Remove-Item Env:Cors__AllowedOrigins -ErrorAction SilentlyContinue
```

5. Suba novamente local:

```powershell
dotnet run --project Weddingifts.Api/Weddingifts.Api.csproj --urls http://localhost:5298
```

```powershell
cd C:\Users\rafae\Documents\Projetos\Weddingifts\Weddingifts-web
py -m http.server 5500
```

## Troubleshooting

- Se o navegador mostrar erro de CORS, confirme que `ALLOWED_ORIGINS` contém a URL pública exata do frontend, sem barra final, e reinicie a API.
- Se o frontend público não chamar a API correta, confirme `Weddingifts-web/js/api-config.js` e recarregue a página sem cache.
- Se o backend público não responder, confirme que `cloudflared tunnel --url http://localhost:5298` ainda está rodando.
- Se o frontend público não abrir, confirme que `py -m http.server 5500` e o túnel do frontend ainda estão rodando.
- Os links TryCloudflare podem mudar sempre que o túnel for reiniciado.
