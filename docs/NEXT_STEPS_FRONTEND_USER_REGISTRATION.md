# Next Steps - Frontend e Backend (Estado Atual)

Este documento descreve o próximo incremento recomendado após a entrega do MVP multi-página.

## Contexto atual já entregue

- cadastro e login funcionando
- sessão JWT no frontend
- criação de evento
- gerenciamento de eventos (listar, editar, excluir)
- gerenciamento de presentes
- página pública com reserva/cancelamento

## Próximo objetivo principal

Fechar o ciclo de conta do usuário com backend real e testes.

## Escopo recomendado

1. Conta do usuário (backend)

- criar endpoint para alterar senha autenticada
- validar senha atual + nova senha (mínimo 6)
- manter padrão de erro via `ProblemDetails`

2. Conta do usuário (frontend)

- integrar `account.html` com endpoint real de troca de senha
- exibir loading/success/error
- validar confirmação de senha no cliente

3. Qualidade

- adicionar testes de integração para:
  - atualizar evento
  - excluir evento
  - alterar senha

4. UX incremental

- mensagens de confirmação mais claras para ações destrutivas
- melhoria de estados vazios e feedbacks no painel privado

## Critérios de aceitação

- usuário autenticado altera senha com sucesso
- senha incorreta ou nova senha inválida retorna erro amigável
- editar/excluir evento segue funcionando
- testes novos passam no CI

## Execução local para desenvolvimento

1. Backend

```powershell
cd Weddingifts.Api
dotnet run
```

2. Frontend

```powershell
cd Weddingifts-web
py -m http.server 5500
```

3. URLs base

- Frontend: `http://localhost:5500`
- API: `http://localhost:5298`
