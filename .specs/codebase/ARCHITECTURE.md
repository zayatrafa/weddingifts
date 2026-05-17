# Arquitetura

## Forma Do Sistema

Weddingifts é um produto simples desacoplado por HTTP:

`Weddingifts-web` -> `Weddingifts.Api` -> PostgreSQL

Não há camada SSR, runtime de framework frontend nem BFF separado.

## Padrão Do Backend

O código segue um padrão em camadas direto:

- controllers recebem requisições HTTP e delegam
- services aplicam regras de negócio e ownership
- `AppDbContext` persiste via EF Core

O tratamento de erro é centralizado por exceções customizadas convertidas em respostas `ProblemDetails` por middleware.

## Padrão Do Frontend

O frontend é multipágina e, do ponto de vista do produto, sem servidor próprio:

- cada página controla seu próprio comportamento em JS
- `fetch` fala diretamente com a API
- páginas privadas dependem de sessão JWT em `localStorage`
- fluxos públicos de convite e presentes usam `slug` e CPF do convidado em vez de conta autenticada

## Domínios Principais

- autenticação e acesso à conta
- gestão privada de eventos
- gestão privada de convidados
- gestão privada de presentes
- convite público e RSVP
- reserva e cancelamento público de presentes

## Regras De Domínio Confirmadas

### Usuário

- o cadastro exige nome, e-mail, CPF, data de nascimento e senha
- o e-mail deve ser válido e único
- o CPF é normalizado para dígitos, validado e único
- a data de nascimento não pode ser futura
- a senha deve ser forte e a mesma política reaparece na troca de senha

### Auth

- o login usa e-mail mais senha
- login inválido não expõe detalhe sensível além de credenciais inválidas
- a resposta JWT inclui token, expiração e payload do usuário

### Evento

- o ownership do evento pertence ao usuário autenticado
- `slug` é gerado automaticamente e precisa ser único
- os campos enriquecidos do evento já fazem parte do contrato ativo
- `eventDateTime` é o instante canônico persistido em UTC
- `timeZoneId` é obrigatório no fluxo enriquecido e validado contra fusos brasileiros suportados
- a exclusão do evento é bloqueada quando há reservas ativas de presentes

### Convidado

- o convidado pertence a um evento específico
- só o dono do evento pode gerenciar convidados
- o CPF do convidado é obrigatório, validado e único por evento
- e-mail e telefone do convidado são obrigatórios
- `maxExtraGuests` pertence ao registro principal do convidado e não pode ser negativo

### RSVP E Acompanhantes

- o fluxo público de RSVP usa internamente `pending`, `accepted` e `declined`
- o contrato público de escrita só aceita `accepted` e `declined`
- a consulta de RSVP exige `slug` do evento mais CPF do convidado
- acompanhantes só são válidos quando o RSVP está aceito
- o CPF do acompanhante se torna obrigatório a partir de 16 anos na data local do evento
- reduzir restrições de evento ou convidado pode resetar o RSVP para `pending`
- o endpoint de conclusão do convite ainda existe por compatibilidade, mesmo que a UX pública atual esteja centrada em RSVP mais página separada de presentes

### Presentes E Reservas

- só o dono do evento pode criar, atualizar ou excluir presentes
- o preço do presente deve ser positivo e abaixo do limite configurado
- a quantidade deve ficar dentro dos limites configurados
- reservas ativas restringem edição e exclusão
- a reserva é pública e baseada no CPF do convidado
- só convidados do evento podem reservar
- over-reservation é bloqueado
- o cancelamento exige reserva ativa para o mesmo CPF
- o histórico de reservas é mantido para as visões privadas de gestão

## Comportamento De Runtime Confirmado Em `Program.cs`

- PostgreSQL é o provider de banco padrão
- `FrontendSmoke` troca para SQLite
- Swagger fica ativo em `Development` e `FrontendSmoke`
- rate limiting fica ativo fora dos ambientes exclusivos de teste
- a configuração JWT precisa existir e usar chave com pelo menos 32 bytes
- migrations automáticas rodam fora de `Testing` e `FrontendSmoke`

## Modelo De Segurança

- JWT protege rotas privadas
- ownership é reforçado nos services, não só em atributos
- middleware global de headers de segurança está ativo
- rate limiting é aplicado nos pontos críticos de login, criação de usuário e reserve/unreserve de presentes

## Restrição Arquitetural

Este projeto deve continuar evoluindo dentro da arquitetura existente, a menos que o usuário peça explicitamente uma mudança arquitetural mais profunda.
