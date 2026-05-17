# Tasks

## T1 Specify/Design Docs

- Status: Done
- Requisitos: DSR-R01..DSR-R09
- Verificacao: arquivos `spec.md`, `design.md` e `tasks.md` criados nesta pasta.

## T2 Foundation CSS

- Status: Done
- Requisitos: DSR-R01, DSR-R03
- Verificacao: tokens, fonte, botoes, inputs, cards e status atualizados em `Weddingifts-web/styles.css`.

## T3 Shell Compartilhado

- Status: Done
- Requisitos: DSR-R02, DSR-R03, DSR-R07, DSR-R08
- Verificacao: nav, drawer mobile, menu de usuario e footer usam linguagem de evento/convite e estilos compartilhados.

## T4 Fluxos Publicos

- Status: Done
- Requisitos: DSR-R04, DSR-R07
- Verificacao: landing, convite publico e presentes usam linguagem de cerimonia e acento visual consistente.

## T5 Fluxos Privados

- Status: Done
- Requisitos: DSR-R05, DSR-R06
- Verificacao: paginas privadas preservam IDs/classes/JS e herdam sistema visual compartilhado.

## T6 Testes Frontend

- Status: Done
- Requisitos: DSR-R08, DSR-R09
- Verificacao: Docker/PostgreSQL disponivel; `node --check Weddingifts-web/js/common.js`; `node frontend-smoke/run-smoke.mjs --grep=publico`; QA visual local em desktop e viewports 360/390/412/430 sem overflow horizontal.

## T7 Validacao Final

- Status: Done
- Requisitos: DSR-R06, DSR-R08, DSR-R09
- Verificacao: diff revisado de forma direcionada; IDs/classes funcionais preservados; backend/contratos nao foram alterados.
