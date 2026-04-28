# Runbook Local Dev

Guia privado para rodar Weddingifts localmente hoje, com comandos realmente presentes no repositório.

## 1. Pré-requisitos

- Windows com PowerShell ou CMD
- `.NET SDK 8`
- Python com módulo `http.server`
- PostgreSQL local acessível para desenvolvimento manual completo
- configuração local de segredos via `dotnet user-secrets` ou variáveis de ambiente para a API em `Development`
- Node.js 18+ para a smoke suite de frontend

## 2. Portas padrão

- frontend estático: `5500`
- API: `5298`
- PostgreSQL local padrão do projeto: `5432`

## 3. Restore, build e testes

Na raiz do repositório:

```powershell
dotnet restore Weddingifts.Api/Weddingifts.Api.sln --configfile Weddingifts.Api/NuGet.Config
dotnet build Weddingifts.Api/Weddingifts.Api.sln
dotnet test Weddingifts.Api/Weddingifts.Api.sln
```

## 4. Configuração local obrigatória do backend em Development

Os arquivos versionados `Weddingifts.Api/appsettings.json` e `Weddingifts.Api/appsettings.Development.json` não carregam mais connection string nem chave JWT reais.

O backend em `Development` agora espera, no mínimo:

- `ConnectionStrings:DefaultConnection`
- `Jwt:Key`

Valores não sensíveis continuam versionados em `Weddingifts.Api/appsettings.json`:

- `Jwt:Issuer`
- `Jwt:Audience`
- `Jwt:ExpiresMinutes`

### Opção recomendada: User Secrets

Na raiz do repositório:

```powershell
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=weddingifts;Username=SEU_USUARIO;Password=SUA_SENHA" --project Weddingifts.Api/Weddingifts.Api.csproj
dotnet user-secrets set "Jwt:Key" "SUA_CHAVE_JWT_ALEATORIA_COM_PELO_MENOS_32_BYTES" --project Weddingifts.Api/Weddingifts.Api.csproj
```

Observações:

- a `Jwt:Key` deve ter pelo menos 32 bytes
- prefira uma string aleatória longa e exclusiva da sua máquina
- `Issuer`, `Audience` e `ExpiresMinutes` já possuem defaults seguros para desenvolvimento

Exemplo para gerar uma chave forte no PowerShell:

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```

### Forma mais segura no PowerShell para desenvolvimento local

Se você quiser evitar digitar a senha do banco em texto puro no comando, use este fluxo:

```powershell
$dbPasswordSecure = Read-Host "Digite a senha do banco" -AsSecureString
$dbPasswordBstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPasswordSecure)
$dbPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($dbPasswordBstr)
$jwtKey = [Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))

dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=weddingifts;Username=SEU_USUARIO;Password=$dbPasswordPlain" --project Weddingifts.Api/Weddingifts.Api.csproj
dotnet user-secrets set "Jwt:Key" $jwtKey --project Weddingifts.Api/Weddingifts.Api.csproj

[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($dbPasswordBstr)
Remove-Variable dbPasswordSecure, dbPasswordBstr, dbPasswordPlain, jwtKey
```

Esse fluxo é melhor que colocar a senha direto no comando porque:

- evita deixar o valor visível na tela ao digitar
- evita copiar o segredo para arquivo versionado
- concentra o segredo no store correto de desenvolvimento local

Ainda assim, trate a sua máquina como ambiente confiável. Para produção, o padrão profissional é usar um gerenciador de segredos do ambiente, não `User Secrets`.

### Erro comum: `JWT signing key must be configured with at least 32 bytes`

Se a API falhar no startup com esse erro, o cenário real costuma ser um destes:

- `Jwt:Key` ainda não foi definida na sua máquina
- `Jwt:Key` foi definida com uma string curta demais
- `Jwt:Key` ficou salva com valor placeholder ou antigo

Passo a passo seguro para corrigir:

```powershell
dotnet user-secrets remove "Jwt:Key" --project Weddingifts.Api/Weddingifts.Api.csproj
dotnet user-secrets remove "ConnectionStrings:DefaultConnection" --project Weddingifts.Api/Weddingifts.Api.csproj
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=weddingifts;Username=SEU_USUARIO;Password=SUA_SENHA" --project Weddingifts.Api/Weddingifts.Api.csproj
dotnet user-secrets set "Jwt:Key" "SUA_CHAVE_JWT_ALEATORIA_COM_PELO_MENOS_32_BYTES" --project Weddingifts.Api/Weddingifts.Api.csproj
dotnet user-secrets list --project Weddingifts.Api/Weddingifts.Api.csproj
```

Depois disso, suba a API novamente:

```powershell
dotnet run --project Weddingifts.Api/Weddingifts.Api.csproj
```

Importante:

- não grave esses valores em `appsettings.json`
- não grave esses valores em `appsettings.Development.json`
- não grave esses valores em `Properties/launchSettings.json`
- para desenvolvimento local, o lugar correto hoje é `User Secrets` ou variável de ambiente

### Opção alternativa: variáveis de ambiente

PowerShell:

```powershell
$env:ConnectionStrings__DefaultConnection="Host=localhost;Port=5432;Database=weddingifts;Username=SEU_USUARIO;Password=SUA_SENHA"
$env:Jwt__Key="SUA_CHAVE_JWT_ALEATORIA_COM_PELO_MENOS_32_BYTES"
```

CMD:

```cmd
set ConnectionStrings__DefaultConnection=Host=localhost;Port=5432;Database=weddingifts;Username=SEU_USUARIO;Password=SUA_SENHA
set Jwt__Key=SUA_CHAVE_JWT_ALEATORIA_COM_PELO_MENOS_32_BYTES
```

## 5. Como validar a configuração local de Development

Se você estiver usando User Secrets:

```powershell
dotnet user-secrets list --project Weddingifts.Api/Weddingifts.Api.csproj
```

Você deve ver pelo menos:

- `ConnectionStrings:DefaultConnection`
- `Jwt:Key`

A cadeia de configuração esperada em `Development` é:

1. `Weddingifts.Api/appsettings.json`
2. `Weddingifts.Api/appsettings.Development.json`
3. User Secrets
4. variáveis de ambiente

Na prática:

- os arquivos versionados mantêm apenas placeholders seguros e valores não sensíveis
- os segredos locais devem sobrescrever os placeholders
- variáveis de ambiente também podem sobrescrever tudo, se você preferir

Ao subir a API com `dotnet run`, o comportamento esperado é:

- a aplicação inicia sem erro de configuração
- migrations são executadas normalmente
- `http://localhost:5298/swagger` abre em `Development`

Se `ConnectionStrings:DefaultConnection` ou `Jwt:Key` não estiverem configurados corretamente, a API falha cedo com erro explícito de configuração.

## 6. Subir backend manualmente em Development

```powershell
cd Weddingifts.Api
dotnet run
```

URL padrão:

- `http://localhost:5298`

Swagger (quando `ASPNETCORE_ENVIRONMENT=Development`):

- `http://localhost:5298/swagger`

## 7. Subir frontend manualmente

```powershell
cd Weddingifts-web
py -m http.server 5500
```

URL padrão:

- `http://localhost:5500`

## 8. Atalhos oficiais do repositório

### `run.bat`

Objetivo:

- encerrar listeners antigos nas portas `5298` e `5500`
- subir backend e frontend localmente
- abrir navegador em `http://localhost:5500`

Uso:

```cmd
run.bat
```

### `start-dev.ps1`

Objetivo:

- subir backend em `0.0.0.0:5298`
- subir frontend em `0.0.0.0:5500`
- facilitar teste em celular na mesma rede

Uso:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-dev.ps1
```

Observação:

- se o PowerShell bloquear execução de script, usar o comando acima com `-ExecutionPolicy Bypass`
- esses atalhos continuam funcionando, desde que a configuração local obrigatória do backend já esteja definida

## 9. Teste em celular na mesma rede

### Passo a passo

1. Garanta que PC e celular estão na mesma rede Wi-Fi.
2. Rode:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-dev.ps1
```

3. Descubra o IP local do PC:

```powershell
ipconfig
```

4. No celular, abra:

```text
http://SEU_IP:5500
```

5. Para validar a API diretamente, abra também:

```text
http://SEU_IP:5298/swagger
```

### Problemas comuns

- firewall bloqueando `5298` ou `5500`
- celular e PC em redes diferentes ou rede guest
- VPN ativa no PC ou no celular
- cache do navegador mobile; nesse caso, usar aba anônima ou adicionar `?v=1`
- API iniciando sem User Secrets ou variáveis de ambiente obrigatórias

## 10. Fluxos mínimos para smoke test local

Depois de subir o ambiente de desenvolvimento manual, validar pelo menos:

- cadastro
- login
- criação de evento
- listagem de eventos
- CRUD básico de convidados
- CRUD básico de presentes
- reserva pública por CPF convidado
- cancelamento da reserva

Para mobile, complementar com:

- `docs/MOBILE_TEST_CHECKLIST.md`

## 11. Smoke test automatizado de frontend

O repositório agora possui uma smoke suite mínima de frontend com Playwright para proteger regressões nos fluxos:

- login
- create-event
- my-events
- reserve / unreserve

Arquivos principais:

- `package.json`
- `playwright.config.js`
- `frontend-smoke/weddingifts.smoke.spec.js`
- `frontend-smoke/support/api-helpers.js`

### Instalação inicial

Na raiz do repositório:

```powershell
cmd /c npm install
cmd /c npx playwright install chromium
```

### Como executar no modo padrão

Na raiz do repositório:

```powershell
dotnet restore Weddingifts.Api/Weddingifts.Api.sln --configfile Weddingifts.Api/NuGet.Config
dotnet build Weddingifts.Api/Weddingifts.Api.csproj /p:UseAppHost=false
cmd /c npm run test:frontend-smoke
```

Esse comando faz o seguinte automaticamente:

1. usa o build já gerado da API
2. sobe um backend próprio em `ASPNETCORE_ENVIRONMENT=FrontendSmoke`
3. usa SQLite local temporário em vez de PostgreSQL
4. sobe o frontend estático em `http://127.0.0.1:5500`
5. executa a smoke suite
6. encerra os servidores ao final

Importante:

- o modo `FrontendSmoke` não depende de `User Secrets`
- o objetivo é validar fluxos críticos do frontend com setup mínimo e reproduzível
- os dados são reinicializados a cada execução do backend `FrontendSmoke`

Versão com navegador visível:

```powershell
cmd /c npm run test:frontend-smoke:headed
```

### Como apontar para um ambiente já em execução

Se você quiser rodar a smoke suite contra um backend/frontend já iniciados manualmente, defina:

- `WG_FRONTEND_BASE_URL`
- `WG_API_BASE_URL`
- `WG_DISABLE_MANAGED_SERVERS=1`

Exemplo em PowerShell:

```powershell
$env:WG_FRONTEND_BASE_URL="http://127.0.0.1:5500"
$env:WG_API_BASE_URL="http://127.0.0.1:5298"
$env:WG_DISABLE_MANAGED_SERVERS="1"
cmd /c npm run test:frontend-smoke
```

### O que a automação faz

- cria dados de teste via API real
- executa login via browser
- valida criação de evento via UI
- valida listagem e ações principais de `my-events`
- valida reserva e cancelamento na página pública

### Limitações atuais

- cobre apenas os fluxos críticos definidos nesta rodada
- não substitui os testes de integração backend
- não cobre mobile automaticamente; mobile continua no checklist manual
- a suíte roda no GitHub Actions em `push` e `pull_request` usando `windows-latest`
- o CI publica `test-results` como artifact quando a smoke falha

## 12. Observações operacionais

- o frontend infere a base da API a partir do host atual e da porta `5298`
- se a API não estiver rodando, o frontend pode mostrar erros de rede ou comportamento de servidor estático para rotas POST
- em `Development`, a API habilita Swagger e aceita CORS mais flexível
- `User Secrets` é a estratégia preferida para desenvolvimento local do backend real; a smoke suite `FrontendSmoke` existe para reduzir setup quando o objetivo é apenas proteção de regressão de frontend
- tratamento profissional de segredo local:
  - senha de banco e chave JWT não devem entrar em Git
  - use um usuário de banco próprio para desenvolvimento, com permissões mínimas necessárias
  - mantenha uma credencial diferente por ambiente
  - quando possível, rotacione a senha se ela tiver sido compartilhada fora do fluxo seguro
