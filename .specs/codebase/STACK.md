# Stack

## Stack De Runtime

- frontend: HTML, CSS e JavaScript puro em `Weddingifts-web/`
- backend: ASP.NET Core Web API em .NET 8 em `Weddingifts.Api/`
- banco: PostgreSQL via EF Core no runtime normal
- autenticação: JWT Bearer

## Pacotes E Ferramentas Principais

Pacotes de backend confirmados em `Weddingifts.Api/Weddingifts.Api.csproj`:

- `Microsoft.AspNetCore.Authentication.JwtBearer`
- `Microsoft.EntityFrameworkCore`
- `Microsoft.EntityFrameworkCore.Sqlite`
- `Microsoft.EntityFrameworkCore.Design`
- `Microsoft.EntityFrameworkCore.Tools`
- `Npgsql.EntityFrameworkCore.PostgreSQL`
- `Swashbuckle.AspNetCore`

Ferramentas de teste e frontend confirmadas no repositório:

- xUnit + `Microsoft.AspNetCore.Mvc.Testing`
- Playwright via `@playwright/test`
- Python `http.server` para servir o frontend localmente

## Variações De Ambiente

- `Development`: PostgreSQL, Swagger e CORS controlado por origens configuráveis
- `Testing`: caminho de configuração para testes de integração
- `FrontendSmoke`: API iniciada contra arquivo local SQLite com configuração determinística de JWT

## Operação Local

Portas locais confirmadas:

- frontend estático: `5500`
- API: `5298`
- PostgreSQL local padrão: `5432`

Subida manual típica:

```powershell
cd Weddingifts.Api
dotnet run
```

```powershell
cd Weddingifts-web
py -m http.server 5500
```

Helpers versionados para desenvolvimento local:

- `run.bat` sobe backend e frontend e abre o navegador
- `start-dev.ps1` faz bind em `0.0.0.0` para facilitar testes a partir de outro dispositivo na mesma rede

## Configuração E Segredos

O `Development` normal exige configuração local para:

- `ConnectionStrings:DefaultConnection`
- `Jwt:Key`

Os `appsettings` versionados mantêm placeholders para segredos e preservam defaults JWT não sensíveis.

O CORS aceita por padrão `http://localhost:5500` e `http://127.0.0.1:5500`. Origens extras para testes temporários, como um frontend exposto por TryCloudflare, devem ser configuradas por `ALLOWED_ORIGINS`, `AllowedOrigins` ou `Cors:AllowedOrigins`.
