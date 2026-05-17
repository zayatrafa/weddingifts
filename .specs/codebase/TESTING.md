# Testes

## Princípio

A validação é proporcional ao impacto. Não aplique cerimônia de nível CI em edições triviais, mas também não trate mudanças arriscadas de fluxo como se fossem apenas documentação.

## Pré-Requisitos De Runtime

O backend depende de PostgreSQL via Docker.

Antes de rodar backend, testes de integração, smoke ou Playwright:

- confirme que o Docker está ativo
- confirme que o container/banco PostgreSQL necessário para a API está disponível

Se Docker ou PostgreSQL estiver desligado, indisponível ou recusando conexão:

- reporte isso como pré-requisito ausente
- não rode smoke de frontend
- não rode suíte Playwright
- não trate timeout de inicialização da API como falha de frontend antes de verificar esse pré-requisito

## Validação Leve

Use validação leve para:

- mudanças apenas em documentação
- mudanças apenas de texto sem impacto de comportamento
- edições triviais isoladas com baixo acoplamento

Checagens típicas:

- inspeção direcionada dos arquivos
- busca textual por referências desatualizadas
- revisão de `git diff` ou `git status`

## Gates De Backend

Recomendados quando a mudança afeta comportamento backend, contratos, auth, rotas, regras de dados, middleware ou migrations:

```powershell
dotnet build Weddingifts.Api/Weddingifts.Api.sln
dotnet test Weddingifts.Api/Weddingifts.Api.sln
```

Se o banco exigido pela API não estiver disponível, não execute esses gates e reporte a dependência ausente.

## Gates De Frontend

Recomendados quando a mudança afeta fluxos críticos de frontend, `common.js`, navegação, sessão, formulários ou layout compartilhado:

- validação manual proporcional às telas tocadas
- smoke controlado com backend e frontend verificados isoladamente
- um único teste Playwright específico relacionado à mudança

Fluxo padrão para smoke/Playwright neste projeto:

1. verificar Docker/PostgreSQL antes de qualquer inicialização da API
2. subir o backend e confirmar HTTP 200 no endpoint esperado
3. subir o frontend estático e confirmar HTTP 200 no endpoint esperado
4. rodar apenas um teste Playwright específico, com filtro explícito
5. encerrar os processos ao final
6. se qualquer etapa passar de 60 a 90 segundos, parar e mostrar os logs da etapa

Não rode `npx playwright test` puro como validação padrão. Só rode a suíte completa quando o usuário pedir explicitamente.

## Gate Mobile

Desktop e mobile no navegador são requisitos nativos do frontend. Quando layout, formulários, navegação, modais ou interações touch mudarem, a validação não deve ficar restrita a desktop e não deve presumir app nativo como contexto principal.

Use pelo menos estes viewports como baseline:

- `360px`
- `390px`
- `412px`
- `430px`

Critérios globais de aprovação:

- sem rolagem horizontal inesperada
- sem sobreposição de conteúdo crítico
- botões primários seguem visíveis e tocáveis
- estados de feedback seguem legíveis
- sem erro grave de JavaScript no console durante o fluxo

Fluxos críticos para revalidar quando a mudança tocar frontend compartilhado ou UX:

- login e redirect pós-login
- criar evento
- lista e ações de meus eventos
- CRUD de convidados e máscaras de CPF/telefone
- CRUD de presentes e legibilidade do histórico de reservas
- carregamento público do evento por `slug`
- RSVP com acompanhantes e regra de CPF por idade
- carrinho público de presentes, reserve, unreserve e retorno ao convite
- formulário de troca de senha da conta

Arquivos compartilhados a inspecionar quando houver regressão mobile:

- `Weddingifts-web/styles.css`
- `Weddingifts-web/js/common.js`
- `Weddingifts-web/js/event.js`
- `Weddingifts-web/js/gifts.js`

## Para Esta Migração

A migração de `.specs/` de 2026-05-16 é apenas documental. Ela não exige execução de testes de runtime porque não altera comportamento de backend, frontend, banco ou API.
