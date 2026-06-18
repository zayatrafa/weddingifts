# Concerns

## Riscos Ativos

1. A cobertura automatizada de frontend ainda é mais estreita que a cobertura de backend.
2. A confiança em mobile ainda depende em parte de validação manual.
3. Alguns arquivos do repositório parecem auxiliares ou legados e podem induzir manutenção ao erro.
4. As convenções de deploy para produção ainda não estão confirmadas com força suficiente no código para um runbook formal.
5. A política definitiva de CORS para staging/produção ainda precisa ser validada em ambiente real; para teste público temporário há configuração explícita por origem.

## Risco De Documentação

O repositório sofreu drift depois que `.specs/` foi removido anteriormente. O objetivo desta migração é tornar `.specs/` novamente a camada documental ativa e versionada do projeto, reduzindo essa pressão de drift.

## Áreas De Atenção Para Manutenção

Inspecione com mais cuidado antes de editar:

- cadastro e login
- tratamento de sessão JWT e redirects
- criação, atualização e exclusão de evento
- CRUD de convidados
- CRUD de presentes
- carregamento público de evento por `slug`
- regras de RSVP e acompanhantes
- fluxos de reserve e unreserve
- navegação mobile
