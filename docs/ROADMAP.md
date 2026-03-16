# Weddingifts Development Roadmap

Este roadmap reflete o estado real atual e os próximos passos sugeridos.

## Fase 1 - Núcleo backend (Concluída)

- criação/listagem de usuários
- criação de evento
- criação/listagem de presentes
- recuperação de evento público por slug

## Fase 2 - Reserva de presentes (Concluída)

- reservar presente
- cancelar reserva
- bloqueio de over-reservation

## Fase 3 - Qualidade de API (Concluída)

- validações de domínio
- middleware global com `ProblemDetails`
- CORS para frontend local

## Fase 4 - Qualidade automatizada (Concluída)

- testes de integração backend
- CI GitHub Actions (restore/build/test)

## Fase 5 - Frontend MVP multi-página (Concluída)

- landing page
- cadastro de usuário
- login com JWT
- criação de evento
- gerenciamento de presentes
- página pública do evento

## Fase 6 - Painel privado de eventos (Concluída)

- listar eventos do usuário (`GET /api/events/mine`)
- editar evento (`PUT /api/events/{eventId}`)
- excluir evento (`DELETE /api/events/{eventId}`)
- UX de copiar link público e navegar para gestão de presentes

## Fase 7 - Conta do usuário (Em andamento)

Já implementado:

- tela `account.html` com dados da sessão

Pendente:

- endpoint real para alterar senha
- endpoint real para atualizar dados cadastrais

## Fase 8 - Hardening e observabilidade (Próxima)

- ampliar testes de integração para editar/excluir evento
- revisar cenários de concorrência de reserva
- melhorar logs e rastreabilidade

## Fase 9 - Evolução de produto (Planejada)

- experiência de onboarding do casal
- melhorias visuais e de microinterações
- preparação para migração futura para frontend tipado

## Fase 10 - Deploy e operação (Planejada)

- dockerização completa
- pipeline de entrega
- ambiente de staging/produção

## Visão de longo prazo

Evoluir Weddingifts para uma plataforma SaaS de listas e experiências para eventos.
