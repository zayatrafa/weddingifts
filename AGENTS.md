# AGENTS.md

## Mission

Manter o Weddingifts com o workflow normal do Codex: inspecionar o suficiente para entender a tarefa, fazer mudanças focadas, validar proporcionalmente e reportar o resultado com clareza.

Preserve os fluxos de usuário que já funcionam e evite rewrites não relacionados.

---

## Visão Do Projeto

Weddingifts é um produto web multipágina para listas de presentes de eventos.

Arquitetura atual:

- Frontend: HTML / CSS / JavaScript puro
- Backend: ASP.NET Core Web API (.NET 8)
- Banco: PostgreSQL (EF Core)
- Autenticação: JWT Bearer
- Testes: testes de integração

Áreas principais:

- páginas públicas de evento
- cadastro e login de usuário
- gestão privada de eventos
- gestão de presentes
- gestão de convidados
- fluxos de reserva de presentes

---

## Mapa Do Repositório

Estrutura típica:

- `/Weddingifts-web` -> aplicação frontend
- `/Weddingifts.Api` -> API backend
- `/Weddingifts.Api.IntegrationTests` -> testes automatizados
- `/.specs` -> documentação ativa do projeto
- `/.github/workflows` -> pipelines de CI
- `/AGENTS.md` -> regras operacionais para agentes de IA

---

## Prioridade De Fonte De Verdade

Quando houver conflito de informação, use esta ordem:

1. Código atual
2. Configs de runtime / comportamento de ambiente
3. Arquivos versionados do projeto
4. Docs ativos em `/.specs`
5. Material arquivado em `/.specs/archive`
6. Notas antigas / chats históricos

Nunca confie em documentação desatualizada acima do código.

---

## Workflow Padrão Do Codex

Use `tlc-spec-driven` como workflow padrão deste projeto, com auto-sizing baseado na complexidade da tarefa.

- Quick Mode se aplica a tarefas descritas em uma frase, tocando no máximo 3 arquivos e sem decisão arquitetural.
- Não force cerimônia completa de spec/design/tasks em trabalho pequeno. Use a menor profundidade TLC que mantenha a tarefa segura e clara.
- A validação deve ser proporcional ao impacto da mudança. Trabalho trivial ou só de documentação usa validação leve; mudanças arriscadas em backend, auth, contrato, dados, rotas ou fluxos críticos de frontend devem usar validação mais forte compatível com `.specs/codebase/TESTING.md`.
- Antes de rodar backend, testes de integração, smoke ou Playwright, verifique se o Docker está ativo e se o PostgreSQL/container necessário para a API está disponível. Se esse pré-requisito falhar, reporte a ausência e não rode smoke nem suíte Playwright.
- Para tarefas pequenas e claras, faça a mudança focada diretamente após uma inspeção rápida.
- Use análise mais profunda quando a mudança tocar fluxos sensíveis, contratos compartilhados, modelos de dados, autenticação, roteamento ou comportamento pouco claro.
- Evite refactors não relacionados, rewrites amplos e mudanças de framework, salvo pedido explícito.
- Se algo importante não estiver confirmado no código, diga isso brevemente em vez de chutar.
- Se testes forem pulados, diga qual validação leve foi feita e por que esse nível foi escolhido.
- Se uma tarefa que parecia simples crescer para mais de 3 arquivos, precisar de mais de 5 passos atômicos, exigir coleta substancial de contexto, provavelmente passar de cerca de 1 hora ou entrar em zona de alto contexto, reporte explicitamente esse aumento de complexidade e mude para a profundidade TLC adequada em vez de continuar tratando como tarefa simples.
- Não use sub-agentes a menos que o usuário peça explicitamente trabalho delegado ou paralelo.

---

## Diretrizes De Backend

Mantenha a arquitetura ASP.NET Core existente:

- Controllers devem permanecer finos.
- A lógica de negócio pertence aos services.
- O acesso a dados deve passar por DbContext / EF Core.
- Preserve limites de auth e erros no estilo ProblemDetails.
- Evite vazar campos sensíveis.

Se uma mudança de backend for funcional, contratual, arriscada ou tocar fluxos críticos, use validação proporcional e siga `.specs/codebase/TESTING.md` para o gate adequado de build/teste.

---

## Diretrizes De Frontend

Mantenha a abordagem multipágina atual em vanilla JS:

- Sem React, Next.js ou build step, salvo pedido explícito.
- Preserve o estilo de texto visível ao usuário em PT-BR.
- Mantenha claros os estados de loading, sucesso e erro.
- Preserve a navegação atual e os fluxos bem-sucedidos, salvo quando a tarefa pedir mudança.
- Toda feature de frontend deve ser pensada para uso em navegador desktop e em navegador mobile.
- Não trate desktop como padrão e mobile como adaptação posterior, nem o contrário.
- Ao desenhar ou alterar uma feature web, considere desde o início responsividade, legibilidade, tocabilidade e navegação em ambos os contextos.

Cheque impacto mobile ao mudar layout, comportamento visual, formulários, navegação, modais ou interações touch.

---

## Fluxos Críticos

Tenha cuidado com:

1. cadastro de usuário
2. login / logout
3. persistência de sessão
4. criação, edição e exclusão de evento
5. CRUD de presentes
6. CRUD de convidados
7. carregamento da página pública do evento
8. reserva / cancelamento de reserva
9. fluxos de redirect
10. navegação mobile

Quando uma mudança tocar esses fluxos, inspecione com mais cuidado, use validação proporcional e mencione qualquer risco remanescente.

Para validação padrão de fluxos web:

1. confirmar Docker/PostgreSQL disponível
2. subir backend e confirmar HTTP 200
3. encerrar backend se a etapa isolada pedir isso ou seguir com controle explícito do processo
4. subir frontend e confirmar HTTP 200
5. encerrar frontend se a etapa isolada pedir isso ou seguir com controle explícito do processo
6. rodar apenas um teste Playwright específico relacionado à mudança
7. encerrar os processos ao final e reportar logs se alguma etapa passar de 60 a 90 segundos

Não rode `npx playwright test` puro neste projeto. A suíte completa só deve ser rodada quando o usuário pedir explicitamente.

---

## Documentação

Os docs ativos do projeto vivem em `/.specs/`. O material histórico arquivado vive em `/.specs/archive/`.

Atualize docs apenas quando a mudança realmente alterar arquitetura, comportamento público, estado do roadmap, padrões de código, orientação mobile ou algum problema conhecido.

Não trate material arquivado como verdade ativa quando o código ou `.specs/` discordarem.
Não recomende publicar docs privados sem pedido explícito.

---

## Fechamento Da Tarefa

As respostas finais padrão devem ser curtas:

- o que mudou
- arquivos alterados
- validação executada ou pulada
- riscos relevantes ou áreas não validadas

Use um relatório mais detalhado apenas quando o usuário pedir ou quando a mudança for ampla, arriscada ou atravessar múltiplas áreas.
