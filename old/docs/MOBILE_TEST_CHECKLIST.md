# Checklist de Testes Mobile

Checklist privado para validar os fluxos mobile realmente críticos do Weddingifts. Use este arquivo como baseline antes de considerar uma alteração de frontend estável.

## 1. Escopo mínimo

Viewports sugeridos:

- Android pequeno: `360px`
- Android médio: `412px`
- iPhone padrão: `390px`
- iPhone maior: `430px`

Navegadores sugeridos:

- Chrome mobile
- Safari iOS

Sempre que possível, validar em dispositivo real além da emulação do navegador.

## 2. Critérios globais de aprovação

- sem rolagem horizontal inesperada
- sem conteúdo sobreposto
- sem botão crítico fora da área visível
- áreas de toque confortáveis
- textos legíveis e com contraste suficiente
- feedback de erro/sucesso/loading visível sem ambiguidade
- sem erro JavaScript crítico no console durante o fluxo

## 3. Header e navegação global

Validar em páginas públicas e privadas:

- header mobile sticky renderiza corretamente
- drawer abre acima do conteúdo, sem mistura visual com a hero
- botão hambúrguer está alinhado e animando corretamente
- fechar por clique fora, botão de fechar e tecla `Esc`
- scroll do `body` trava com menu aberto
- links do drawer respeitam sessão logada/deslogada
- safe-area do iPhone não quebra espaçamento no topo

Arquivos relacionados:

- `Weddingifts-web/js/common.js`
- `Weddingifts-web/styles.css`

## 4. Fluxos por página

### 4.1 Home (`index.html`)

- header mobile alinhado
- CTA principal e links do menu fazem sentido para usuário logado e deslogado
- hero, cards e blocos não sofrem overflow

### 4.2 Cadastro (`register.html`)

- todos os campos visíveis sem sobreposição
- CPF abre teclado numérico
- data de nascimento fica alinhada com os demais campos
- sem aumento indevido de largura em campo de data
- mensagens de validação são legíveis
- botão principal não quebra texto

### 4.3 Login (`login.html`)

- mensagens de sessão expirada/logout/cadastro concluído cabem bem na tela
- inputs e botão principal mantêm proporção boa
- login válido redireciona corretamente

### 4.4 Criar evento (`create-event.html`)

- formulário cabe integralmente na tela
- campo de data não causa overflow horizontal
- estado de loading e erro fica visível
- pós-criação redireciona corretamente

### 4.5 Meus eventos (`my-events.html`)

- cards continuam legíveis
- CTA principal da página não compete com as ações do card
- ações rápidas do topo do card não sobrepõem título/status
- `Convidados`, `Presentes` e `Histórico de reservas` mantêm área de toque adequada
- copiar link continua funcional
- feedback de lista carregada não domina a tela

### 4.6 Convidados (`my-guests.html`)

- criar, editar e excluir convidado funciona sem quebra de layout
- máscara de CPF e telefone funciona no mobile
- badge/metadado de reserva ativa permanece legível
- ícone destrutivo não cola visualmente na tag adjacente

### 4.7 Presentes (`my-event.html`)

- criar, editar e excluir presente funciona sem sobreposição
- nome/descrição com emoji renderizam bem
- botão destrutivo mantém espaçamento correto em relação à tag verde
- histórico de reservas mostra nome + CPF sem poluir o card

### 4.8 Evento público (`event.html`)

- evento carrega por `slug`
- dados enriquecidos do evento não geram overflow
- consulta de RSVP por CPF fica clara antes da lista de presentes
- formulário de RSVP accepted/declined cabe em telas pequenas
- campos dinâmicos de acompanhantes mantêm área de toque adequada
- dica de CPF obrigatório/opcional por idade fica legível
- filtros funcionam em telas pequenas
- reservar/cancelar não gera overflow
- erro de CPF ausente ou inválido fica claramente visível

### 4.9 Conta (`account.html`)

- dados da conta ficam legíveis
- formulário de troca de senha não quebra layout
- mensagem de backend pendente cabe corretamente

## 5. Sessão e redirecionamento

Validar com duas abas sempre que a mudança envolver `common.js`, auth ou navegação:

- logout em uma aba invalida a outra
- aba antiga redireciona ao tentar ação protegida
- login volta corretamente para `returnTo` seguro
- abrir rota privada sem sessão leva ao login

## 6. Registro de execução sugerido

Para cada rodada, anotar:

- data
- dispositivo + navegador
- telas/fluxos executados
- resultado (`OK` ou `Falhou`)
- evidência (print, vídeo curto, observação)
- ação corretiva proposta

## 7. Quando este checklist deve ser reexecutado

- alteração em `common.js`
- alteração em `styles.css`
- mudança em header, drawer, menu, sessão ou redirecionamento
- mudança em formulários principais
- mudança em cards/listas de eventos, convidados ou presentes
- qualquer correção que antes exigiu remendo mobile específico
