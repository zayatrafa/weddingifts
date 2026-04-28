# Weddingifts Roadmap

Roadmap privado de produto e engenharia. Este documento combina duas coisas:

- o que já está confirmado no código atual
- o backlog operacional acordado para as próximas ondas

Quando houver divergência entre este arquivo e o código, o código vence.

## 1. Estado atual

Status geral em 2026-04-24:

- Onda 1 consolidada no código
- Onda 2 em andamento no código
- Onda 3 e Onda 4 seguem planejadas, sem implementação confirmada

## 2. O que já está entregue no código

### Onda 1 - Consolidação do MVP (`Concluída`)

Entregas confirmadas:

- cadastro de usuário com CPF, data de nascimento e senha forte
- login com JWT
- páginas privadas protegidas por sessão válida
- sincronização de sessão entre abas e detecção de expiração
- criação, listagem, edição e exclusão de eventos
- criação, edição e exclusão de presentes
- criação, edição e exclusão de convidados
- página pública do evento por `slug`
- reserva e cancelamento público por CPF
- exigência de convidado válido para reservar presente
- histórico de reservas no painel privado
- indicador de reserva na lista de convidados
- padronização principal de mensagens em PT-BR no frontend
- revisão de fluxos de redirecionamento (`login`, `logout`, `pós-cadastro`, `pós-criação`, `returnTo`)
- estabilização mobile dos fluxos principais
- troca de senha autenticada com senha atual obrigatória
- testes de integração backend e CI ativos

Evidências:

- `Weddingifts.Api/Controllers/*`
- `Weddingifts.Api/Services/*`
- `Weddingifts.Api.IntegrationTests/*`
- `Weddingifts-web/js/*`
- `.github/workflows/dotnet-ci.yml`

### Onda 2 - Núcleo do casamento (`Parcial`)

Entregas confirmadas:

- eventos enriquecidos persistidos e exibidos no frontend privado e público
- `timeZoneId` por evento e exibição temporal no fuso do evento
- limite de acompanhantes (`maxExtraGuests`) na gestão privada de convidados
- backend de RSVP público com acompanhantes e CPF condicional por idade
- frontend público de RSVP em `event.html` com consulta por CPF, confirmação, recusa e atualização
- smoke frontend cobrindo RSVP público, acompanhantes e manutenção do fluxo de reserva/cancelamento

Evidências:

- `Weddingifts.Api/Services/EventRsvpService.cs`
- `Weddingifts-web/js/event.js`
- `Weddingifts-web/js/event-contract.js`
- `Weddingifts-web/js/my-guests.js`
- `frontend-smoke/weddingifts.smoke.spec.js`

## 3. Próxima onda de implementação

### Onda 2 - Núcleo do casamento (`Em andamento`)

Objetivo: enriquecer o evento e tornar a página pública mais útil para uso real.

Itens restantes planejados:

- mostrar contagem de confirmados no painel privado
- adicionar filtros na gestão de presentes
- adicionar filtros na gestão de convidados
- adicionar filtros na página pública de presentes
- fechar política de edição de presente reservado
- fechar política de exclusão de evento

## 4. Ondas seguintes acordadas internamente

### Onda 3 - Regras de produto e privacidade (`Planejada`)

Itens planejados:

- privacidade configurável por evento
- regra de “só convidados podem presentear” configurável
- fluxo CPF-first de convidado
- confirmação por senha para exclusão de evento
- lista facilitada de reservas para os noivos

### Onda 4 - Convite, pagamento e fechamento (`Planejada`)

Itens planejados:

- convites por WhatsApp e e-mail
- PIX direto para conta do casal
- validação de pagamento para confirmar reserva
- integração de cartão
- regra de evento finalizado
- contagem regressiva

Importante:

- essas ondas representam planejamento interno, não features confirmadas no código de hoje

## 5. Itens fora do código atual, mas já visíveis como lacuna

- não há integração real de e-mail no código atual
- não há runbook de deploy confiável o suficiente para documentação formal nesta fase

## 6. Critérios para considerar a Onda 2 concluída

- evento com campos adicionais persistidos e exibidos no frontend
- página pública com RSVP funcional
- painel privado mostrando confirmados com clareza
- filtros úteis em convidados/presentes no desktop e no mobile
- regras de produto atualizadas em `docs/DOMAIN_RULES.md`
- arquitetura e mapa de features atualizados em `docs/ARCHITECTURE.md` e `docs/FEATURE_MAP.md`

## 7. Fontes de verdade para evolução

Use em conjunto:

- `README.md` -> visão geral rastreada do projeto
- `docs/ARCHITECTURE.md` -> estado técnico atual
- `docs/FEATURE_MAP.md` -> o que existe hoje
- `docs/DOMAIN_RULES.md` -> regras de negócio atuais
- `docs/CODING_STANDARDS.md` -> como evoluir sem quebrar
