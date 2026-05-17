# Projeto Weddingifts

## Propósito

Weddingifts é um produto multipágina para listas de presentes de casamento e eventos. Ele atende dois públicos:

- anfitriões que gerenciam eventos, convidados e presentes em telas privadas autenticadas
- convidados que interagem com os fluxos públicos de convite, RSVP e reserva de presentes

O produto atual é um MVP com regras de domínio reais e restrições pensadas para uso prático, não uma demo superficial.

## Fonte De Verdade

Quando documentação e implementação divergirem, use esta ordem:

1. código atual
2. comportamento de runtime e configuração ativa
3. arquivos versionados do projeto
4. documentação ativa em `.specs/`
5. material arquivado em `.specs/archive/`

## Modo De Trabalho

Weddingifts usa `tlc-spec-driven` como workflow padrão, com auto-sizing agressivo:

- Quick Mode para tarefas descritas em uma frase, tocando no máximo 3 arquivos e sem decisão arquitetural
- fluxo breve de especificar e executar para trabalhos médios
- spec/design/tasks mais completos apenas quando escopo ou ambiguidade justificarem

O objetivo é ter clareza sem cerimônia desnecessária. TLC é o workflow ativo, não uma exigência de sobre-documentar trabalho trivial.

## Guardrails

- preservar fluxos públicos e privados que já funcionam, salvo quando a tarefa pedir mudança explícita
- evitar rewrites não relacionados, troca de framework ou mudanças arquiteturais especulativas
- manter a cópia do produto em PT-BR correta
- toda feature web deve nascer pensada para navegador desktop e navegador mobile
- não assumir desktop como padrão com adaptação posterior para mobile, nem mobile como solução isolada
- tratar responsividade, legibilidade, tocabilidade e navegação em telas pequenas e grandes como parte do escopo normal de frontend
- manter controllers finos, regras de negócio em services e acesso a dados em EF Core

## Princípio De Validação

A validação deve ser proporcional à complexidade da mudança:

- tarefas triviais ou só de documentação usam validação leve
- mudanças arriscadas em backend, auth, contratos, dados, rotas e fluxos críticos de frontend exigem validação mais forte
- os gates exatos de validação estão em `.specs/codebase/TESTING.md`

## Regra De Escalada De Complexidade

Se uma tarefa que parecia simples começar a ficar lenta, ampla ou cerimoniosa demais, isso deve ser dito explicitamente antes de aprofundar mais. Uma tarefa deixa de ser simples quando qualquer um destes pontos se torna verdadeiro:

- ela cresce para mais de 3 arquivos
- ela exige mais de 5 passos atômicos
- ela exige coleta substancial de contexto antes de editar com segurança
- ela provavelmente vai levar cerca de 1 hora ou mais
- ela empurra o agente para uma zona de alto contexto com muitos arquivos ou decisões acopladas

Nesse ponto, a complexidade extra deve ser reportada e o trabalho deve mudar para a profundidade TLC adequada, em vez de continuar fingindo que ainda é uma tarefa rápida.
