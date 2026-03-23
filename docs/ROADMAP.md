# Weddingifts Development Roadmap

Este roadmap reflete o estado real atual e os próximos passos para chegar ao MVP publicável.

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

## Fase 7 - Convidados e reserva por CPF (Concluída)

- CRUD inicial de convidados por evento (criar/listar + lookup por CPF)
- reserva pública exige CPF
- validação: CPF precisa estar convidado no evento

## Fase 8 - Cadastro reforçado (Concluída)

- cadastro com CPF e data de nascimento
- CPF único no usuário
- confirmação de senha no frontend
- redirecionamento de cadastro para login com aviso contextual

## Fase 9 - Regras de presentes e UX pontual (Concluída)

- preço em BRL no frontend de gestão de presentes
- limites de preço/quantidade no frontend e backend
- redirecionamento após criação de evento
- ajustes de menu com subitens de gerenciamento

## Fase 10 - Estabilização MVP publicável (Próxima)

- consolidar limites de tamanho em todos os campos de entrada
- padronizar mensagens de erro em PT-BR
- revisar redirecionamentos finais de cadastro/login/eventos
- validar consistência de formatação BR (datas/valores)
- adicionar rodapé global em todas as páginas

## Fase 11 - Produção mínima (Próxima)

- ambiente de staging e produção
- banco gerenciado e estratégia de backup
- gestão de secrets e variáveis de ambiente
- domínio e HTTPS
- logs e monitoramento básico

## Fase 12 - Go-live controlado (Planejada)

- liberar acesso para grupo pequeno de usuários
- coletar feedback real
- corrigir bugs de uso real em ciclos curtos

## Fase 13 - Pós-MVP (Planejada)

- confirmação real por email
- envio de convites por WhatsApp/email
- redesign visual completo
- evolução para produto SaaS

## Visão de longo prazo

Evoluir Weddingifts para uma plataforma SaaS de listas e experiências para eventos.
