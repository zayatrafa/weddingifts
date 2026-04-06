# Checklist de Testes Mobile (Fluxos Principais)

Objetivo: validar os fluxos críticos do Weddingifts em telas pequenas antes do go-live de testes.

## Escopo

Dispositivos sugeridos:
- Android: largura 360px e 412px
- iPhone: largura 390px e 430px

Navegadores sugeridos:
- Chrome mobile
- Safari iOS

## Fluxo 1: Cadastro até criação de evento

1. `register.html`
- campos visíveis sem sobreposição
- teclado numérico no CPF
- validações e mensagens legíveis
- botão principal sem quebra de texto

2. `login.html`
- login com conta recém-criada
- mensagem de erro amigável em caso de credencial inválida

3. `create-event.html`
- formulário cabe na tela sem quebrar botões
- validação de data futura
- criação com redirecionamento para gerenciamento

4. `my-events.html`
- cards legíveis e ações clicáveis
- botão de copiar link público funcional
- menu de usuário abre/fecha corretamente

## Fluxo 2: Convidado reservando presente

1. `event.html`
- carregar evento por slug
- validação de CPF obrigatório antes da reserva
- reservar e cancelar sem overflow visual
- status de sucesso/erro visível sem rolagem excessiva

## Fluxo 3: Gestão de convidados e presentes

1. `my-guests.html`
- cadastrar, editar e excluir convidado
- CPF/telefone com máscara e limites
- formulário de edição responsivo

2. `my-event.html`
- cadastrar, editar e excluir presente
- preço em BRL exibido corretamente
- ações de edição/cancelamento sem sobreposição

## Critérios de aprovação

- nenhum botão crítico fora da área visível
- nenhum texto crítico quebrado de forma ilegível
- nenhum campo essencial sem feedback de validação
- menu e rodapé funcionando em todas as páginas
- sem erro de JavaScript no console durante os fluxos

## Registro sugerido

Para cada tela testada, registrar:
- dispositivo + navegador
- resultado (`OK` ou `Falhou`)
- evidência (print)
- ação corretiva proposta
