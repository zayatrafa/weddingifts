# Roadmap Weddingifts

## Estado Atual

Documento recriado a partir do estado do repositório em 2026-05-16.

O que está confirmado no código hoje:

- cadastro de usuário, login, persistência de sessão JWT e troca de senha
- CRUD privado de eventos
- CRUD privado de convidados com busca por CPF e `maxExtraGuests`
- CRUD privado de presentes com restrições quando há reservas
- página pública do evento por `slug`
- fluxo público de RSVP com acompanhantes e regra de CPF por idade
- página pública de presentes com fluxo de reserva e cancelamento por CPF convidado
- testes de integração backend, smoke frontend e CI

## Prioridades Ativas Do Produto

Estas são as próximas áreas mais críveis com base no repositório atual e nas notas de planejamento existentes:

1. melhorar a utilidade do painel privado do evento
2. melhorar a ergonomia da gestão de convidados e presentes
3. fechar regras restantes de produto sobre exclusão de evento, edição de presente reservado e privacidade
4. fechar lacunas necessárias para um piloto real controlado

## Temas Confirmados De Backlog

Temas que aparecem de forma recorrente no código ativo, README, cobertura smoke e documentação anterior:

- contadores de confirmação e resumos privados de evento mais fortes
- filtros e melhor tratamento de listas na gestão de convidados e presentes
- privacidade por evento e políticas de presentear apenas para convidados
- evolução futura de pagamento e canais de convite

## Não Confirmado Como Implementado

Os itens abaixo ainda devem ser tratados como trabalho futuro, a menos que uma mudança posterior no código prove o contrário:

- envio real de e-mail
- automação de convites por WhatsApp
- confirmação de pagamento
- pagamentos com cartão
- runbook automatizado de deploy para produção
- controles de privacidade por evento

## Regra De Documentação

Novo trabalho futuro só deve ganhar `spec.md`, `design.md` e `tasks.md` em `.specs/features/` quando estiver realmente sendo planejado. A presença de uma ideia neste roadmap não cria uma feature spec por si só.
