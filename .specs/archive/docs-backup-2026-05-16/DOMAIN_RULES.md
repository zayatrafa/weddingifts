# Domain Rules

Regras de negócio confirmadas no código do Weddingifts. Quando houver conflito entre este documento e o código, o código vence.

## 1. Usuário

Fonte principal:

- `Weddingifts.Api/Services/UserService.cs`

Regras confirmadas:

- nome é obrigatório
- nome tem máximo de 120 caracteres
- nome deve conter apenas letras, com suporte a acentuação e separação por espaços
- e-mail é obrigatório
- e-mail tem máximo de 255 caracteres
- e-mail deve ter formato válido
- e-mail deve ser único
- CPF é obrigatório no cadastro atual
- CPF é normalizado para somente dígitos
- CPF deve ser válido
- CPF deve ser único
- data de nascimento é obrigatória
- data de nascimento não pode ser futura
- senha deve ter no mínimo 8 caracteres
- senha deve ter no máximo 72 caracteres
- senha deve conter letra, número e caractere especial

## 2. Autenticação

Fontes principais:

- `Weddingifts.Api/Services/AuthService.cs`
- `Weddingifts.Api/Security/JwtTokenService.cs`

Regras confirmadas:

- login usa e-mail + senha
- e-mail é normalizado para minúsculas no login
- login inválido retorna erro sem expor detalhe sensível além de credencial inválida
- resposta do login contém token JWT, data de expiração e dados do usuário
- JWT inclui `sub`, `name`, `email` e `cpf`

## 3. Evento

Fonte principal:

- `Weddingifts.Api/Services/EventService.cs`

Regras confirmadas:

- evento precisa de nome
- `foodInfo`, `scheduleInfo` e `galleryImageUrls` sao campos publicos opcionais do evento
- `foodInfo` e `scheduleInfo` tem maximo de 800 caracteres cada
- `galleryImageUrls` aceita no maximo 12 URLs externas `http` ou `https`, com ate 500 caracteres por URL
- nome do evento tem máximo de 120 caracteres
- no fluxo legado, `eventDate` continua aceito e é tratado como data local do evento
- no fluxo enriquecido, `hostNames`, `eventDateTime`, `timeZoneId`, `locationName`, `locationAddress`, `locationMapsUrl`, `ceremonyInfo`, `dressCode` e `coverImageUrl` são obrigatórios
- `eventDateTime` é o instante canônico do evento e é persistido em UTC
- `timeZoneId` é obrigatório no fluxo enriquecido e deve ser um fuso brasileiro suportado
- a data/hora local do evento deve estar no futuro considerando o fuso do próprio evento
- `slug` é gerado automaticamente e precisa ser único
- apenas o dono do evento pode editar ou excluir
- exclusão do evento é bloqueada se houver reserva ativa vinculada ao evento
- alterações administrativas em `eventDateTime` ou `timeZoneId` podem resetar RSVP incompatível para `pending`

## 4. Convidado

Fonte principal:

- `Weddingifts.Api/Services/EventGuestService.cs`

Regras confirmadas:

- convidado pertence a um evento específico
- apenas o dono do evento pode gerenciar convidados
- CPF do convidado é obrigatório
- CPF é normalizado para somente dígitos
- CPF deve ser válido
- CPF deve ser único por evento
- nome do convidado é obrigatório
- nome do convidado tem máximo de 120 caracteres
- nome do convidado aceita apenas letras e espaços
- e-mail do convidado é obrigatório
- e-mail do convidado tem máximo de 120 caracteres
- e-mail do convidado deve ter formato válido
- telefone é obrigatório
- telefone deve ter 10 ou 11 dígitos
- `maxExtraGuests` pertence ao convidado principal
- `maxExtraGuests` default é `0`
- `maxExtraGuests` não pode ser negativo
- reduzir `maxExtraGuests` abaixo da quantidade de acompanhantes salvos reseta o RSVP do convidado para `pending`

## 5. RSVP e acompanhantes

Fontes principais:

- `Weddingifts.Api/Services/EventRsvpService.cs`
- `Weddingifts.Api/Services/EventTimeZoneService.cs`

Regras confirmadas:

- RSVP do convidado principal usa `pending | accepted | declined`
- o contrato público de escrita aceita apenas `accepted` e `declined`
- `GET /api/events/{slug}/rsvp` exige `guestCpf` convidado para o evento
- a pagina publica do evento mostra as informacoes cadastradas antes do CPF; CPF e exigido apenas para RSVP e reserva de presentes
- `POST /api/events/{slug}/invitation-flow/complete` continua disponivel por compatibilidade, mas a UX publica atual nao depende mais da conclusao do convite
- `POST /api/events/{slug}/rsvp` exige convidado em `pending`
- `PUT /api/events/{slug}/rsvp` exige convidado já respondido
- `POST /api/events/{slug}/invitation-flow/complete` conclui o convite após RSVP aceito ou recusado
- convidado com convite já concluído volta para um menu público de retorno ao informar CPF novamente
- `accepted` permite acompanhantes até `maxExtraGuests`
- `declined` remove acompanhantes e limpa restrições alimentares
- `messageToCouple` é opcional
- `dietaryRestrictions` é opcional apenas quando o RSVP fica `accepted`
- acompanhante pertence a um convidado principal especifico
- nome do acompanhante é obrigatório, tem máximo de 120 caracteres e aceita apenas letras e espaços
- `birthDate` do acompanhante é obrigatória
- `birthDate` não pode ser futura
- `birthDate` não pode ser posterior à data local do evento
- a idade do acompanhante e calculada na data local do evento usando o `timeZoneId` do proprio evento
- CPF do acompanhante é obrigatório quando a idade na data local do evento for maior ou igual a 16 anos
- CPF do acompanhante é opcional quando a idade na data local do evento for menor que 16 anos
- se informado, CPF do acompanhante deve ser válido
- CPF de acompanhante não pode se repetir no mesmo RSVP
- CPF de acompanhante não pode coincidir com CPF de convidado principal do evento
- CPF de acompanhante não pode coincidir com outro acompanhante já salvo no mesmo evento
- mudanças administrativas no evento que tornem acompanhantes inválidos resetam o RSVP para `pending`

## 6. Presente

Fonte principal:

- `Weddingifts.Api/Services/GiftService.cs`

Regras confirmadas:

- presente pertence a um evento específico
- apenas o dono do evento pode criar, editar ou excluir
- nome do presente é obrigatório
- nome do presente tem máximo de 255 caracteres
- descrição é opcional
- descrição tem máximo de 120 caracteres
- preço deve ser maior que zero
- preço deve ser menor que 1.000.000
- quantidade deve ser pelo menos 1
- quantidade deve ser no máximo 100.000

### Regras adicionais quando há reserva ativa

- se existir reserva ativa, nome não pode ser alterado
- se existir reserva ativa, descrição não pode ser alterada
- se existir reserva ativa, preço não pode ser alterado
- se existir reserva ativa, quantidade não pode ficar abaixo do total já reservado
- presente com reserva ativa não pode ser excluído

## 7. Reserva de presente

Fonte principal:

- `Weddingifts.Api/Services/GiftService.cs`

Regras confirmadas:

- reserva é feita por CPF, sem login do convidado
- CPF usado na reserva deve pertencer a um convidado do evento
- presente precisa pertencer ao evento correto
- não é possível reservar acima da quantidade disponível
- não é possível reservar presente totalmente indisponível
- cancelamento exige reserva ativa para o mesmo CPF
- histórico mantém quantidade reservada, cancelada e ativa
- `ReservedBy` e `ReservedAt` do presente refletem a última reserva ativa conhecida

## 8. Histórico e agregações

Fontes principais:

- `Weddingifts.Api/Models/GiftReservationResponse.cs`
- `Weddingifts-web/js/my-event.js`
- `Weddingifts-web/js/my-guests.js`

Regras confirmadas:

- o histórico autenticado de reservas é por evento
- o payload inclui `giftPrice`
- a lista de convidados agrega reservas ativas por CPF
- o valor exibido por convidado na gestão corresponde ao total ativo reservado por esse CPF no evento
- o histórico privado cruza CPF com lista de convidados para mostrar nome + CPF quando possível

## 9. Sessao e navegacao privada

Fontes principais:

- `Weddingifts-web/js/common.js`
- `Weddingifts-web/js/login.js`
- `Weddingifts-web/js/register.js`
- `Weddingifts-web/js/create-event.js`

Regras confirmadas:

- páginas privadas exigem sessão JWT válida
- sessão expirada remove dados locais e redireciona para login
- `returnTo` aceita apenas destino interno seguro
- `returnTo` não pode apontar para `login.html`
- pós-cadastro redireciona para login com `returnTo` seguro para criação de evento
- pós-login sem `returnTo` seguro leva para `my-events.html` se já houver eventos; caso contrário, leva para `create-event.html`
- pós-criação de evento redireciona para `my-events.html?focusEventId=...`

## 10. Regras ainda nao implementadas

Não há implementação confirmada hoje para:

- upload/gestao visual de foto de capa do evento no frontend
- confirmação real por e-mail
- pagamento
- privacidade por evento

Observação:

- a presença de UI ou texto no frontend não prova implementação completa no backend

## 11. Troca de senha autenticada

Fontes principais:

- `Weddingifts.Api/Controllers/UserController.cs`
- `Weddingifts.Api/Services/UserService.cs`
- `Weddingifts-web/js/account.js`

Regras confirmadas:

- a troca de senha exige sessão autenticada
- a troca de senha exige a senha atual correta
- a nova senha deve seguir a mesma política forte do cadastro
- a nova senha não pode ser igual à senha atual
- a alteração não invalida a sessão atual nesta rodada

