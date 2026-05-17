# Integrações

## Integrações Confirmadas

- PostgreSQL no runtime normal
- emissão e validação de token JWT
- Swagger / OpenAPI para inspeção local da API
- GitHub Actions para CI
- Playwright para automação smoke do frontend

## CI E Automação De Verificação

`.github/workflows/dotnet-ci.yml` executa:

- restore, build e testes de backend em `ubuntu-latest`
- smoke frontend em `windows-latest` com .NET, Node, Python e Playwright Chromium

O frontend smoke confirmado no repositório:

- é disparado por `npm run test:frontend-smoke`
- sobe a API em `FrontendSmoke`
- usa arquivo local SQLite em vez de segredos PostgreSQL
- publica `test-results` como artifact do GitHub Actions em caso de falha

Observação importante: o runner real de smoke é `frontend-smoke/run-smoke.mjs`, que gerencia backend e frontend localmente antes de chamar Playwright.

## Helpers De Desenvolvimento Local

- Python `http.server` para hospedar o frontend
- `run.bat` e `start-dev.ps1` como atalhos de subida local

## Não Confirmado No Código

Nenhuma integração de produção está confirmada hoje para:

- envio de e-mail
- envio por WhatsApp
- processamento de pagamento
- armazenamento de arquivos
- analytics
- plataformas externas de observabilidade
- filas ou workers em background

Não documente esses pontos como capacidades ativas, a menos que código posterior prove isso.
