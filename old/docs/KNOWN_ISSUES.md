# Known Issues

Problemas, lacunas e riscos confirmados no estado atual do Weddingifts.

## Alto

### 1. Documentação privada não é versionada

- `docs/` está ignorado no `.gitignore`
- `AGENTS.md` também está ignorado
- efeito: contexto operacional e memória técnica local podem divergir entre máquinas e sessões

Arquivos relacionados:

- `.gitignore`
- `AGENTS.md`
- `docs/*`

### 2. Segredos antigos já passaram pelo histórico do Git

Arquivos afetados historicamente:

- `Weddingifts.Api/appsettings.json`
- `Weddingifts.Api/appsettings.Development.json`

Risco:

- connection string local de PostgreSQL e chave JWT de desenvolvimento já ficaram rastreadas
- os arquivos atuais foram saneados para usar placeholders + configuração por ambiente, mas qualquer valor antigo deve ser tratado como comprometido
- se essas credenciais ou chaves foram reutilizadas fora de ambiente local controlado, precisam ser trocadas

## Médio

### 3. Cobertura automatizada de frontend ainda é estreita

- testes automatizados atuais continuam concentrados em `Weddingifts.Api.IntegrationTests/`
- existe uma smoke suite mínima em `frontend-smoke/`
- mobile ainda depende de checklist manual

Risco:

- regressões fora dos fluxos críticos automatizados ainda podem entrar sem cobertura automatizada

### 4. Possível código legado ou auxiliar pode confundir manutenção

Arquivos com sinal de baixa aderência ao fluxo principal atual:

- `Weddingifts-web/app.js`
- `Weddingifts.Api/Controllers/TestController.cs`
- `Weddingifts.Api/Controllers/WeatherForecastController.cs`

Risco:

- agentes ou novos mantenedores podem supor incorretamente que esses arquivos fazem parte do produto principal

### 5. CORS fora de `Development` ainda é localista

- fora de `Development`, `Program.cs` permite apenas origens `localhost:5500` e `127.0.0.1:5500`

Risco:

- qualquer cenário real de staging/produção exigirá ajuste explícito antes do deploy

## Baixo

### 6. A base documental já sofreu drift histórico

- vários arquivos em `docs/` estavam parcialmente desatualizados antes desta revisão
- como continuam privados e fora do Git, o risco de novo drift permanece

### 7. Há roteiro antigo mantido só por compatibilidade histórica

Arquivos:

- `docs/NEXT_STEPS_FRONTEND_USER_REGISTRATION.md`
- `docs/historico-chatgpt.md`

Risco:

- baixo, desde que continuem claramente marcados como históricos e não operacionais

## Incertos

- não foi encontrado pipeline de deploy confiável o suficiente para documentar produção
- não há confirmação de intenção de manter ou remover os arquivos legados/auxiliares citados acima
