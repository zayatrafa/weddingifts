# Estado Weddingifts

## Modelo De Documentação Ativa

- `.specs/` é a árvore de documentação ativa do projeto
- `.specs/archive/docs-backup-2026-05-16/` preserva a antiga pasta raiz `docs/` como backup histórico
- os docs arquivados são apenas material de referência, não a fonte ativa de verdade do processo

## Preferências De Workflow

- usar `tlc-spec-driven` por padrão com auto-sizing
- preferir Quick Mode para tarefas descritas em uma frase, tocando no máximo 3 arquivos e sem decisão arquitetural
- não deixar tarefas pequenas virarem trabalho cerimonioso; escalar só quando o escopo realmente crescer
- sub-agentes são opt-in neste repositório e só devem ser usados quando o usuário pedir explicitamente

## Preferências De Validação

- a validação é proporcional ao impacto
- migrações só de documentação não exigem execução de testes da aplicação
- mudanças que afetam runtime devem seguir os gates de `.specs/codebase/TESTING.md`

## Riscos Atuais Que Devem Permanecer Visíveis

- a cobertura automatizada de frontend ainda é mais estreita que a de backend
- a confiança em mobile ainda depende em parte de validação manual
- alguns arquivos auxiliares continuam no repositório e podem confundir manutenção (`Weddingifts-web/app.js`, `WeatherForecastController`, `TestController`)
- convenções de deploy para produção ainda não estão documentadas a partir de código confirmado

## Nota Da Migração

Esta árvore `.specs/` foi recriada em 2026-05-16 a partir do código atual e dos arquivos ativos do repositório. O commit antigo `47616db` foi usado apenas como referência estrutural, não como fonte para restaurar conteúdo cegamente.
