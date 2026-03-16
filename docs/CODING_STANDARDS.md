# Coding Standards

Padrões de código para manter o projeto consistente e sustentável.

## Princípios gerais

- priorizar simplicidade
- manter legibilidade
- evitar abstrações prematuras
- preservar a arquitetura existente

## Backend (.NET)

### Arquitetura

- Controllers devem ser enxutos
- regras de negócio ficam em Services
- acesso a dados via `AppDbContext`
- entidades representam tabelas
- models representam contratos HTTP

### Controllers

- validar formato básico de entrada
- delegar lógica para service
- retornar DTOs, nunca entidade sensível

### Services

- concentrar validações de domínio
- lançar exceções semânticas (`DomainValidationException`, `ResourceNotFoundException`)
- evitar lógica de apresentação

### Erros e HTTP

- usar middleware global de exceção
- mensagens de erro devem ser claras
- mapear corretamente 400/404/500

### Segurança

- senha sempre com hash
- rotas privadas protegidas com JWT
- nunca retornar `PasswordHash`

## Frontend (Weddingifts-web)

### Stack obrigatória atual

- HTML/CSS/JS puro
- sem build step
- sem framework adicional

### Organização

- uma página por responsabilidade
- lógica JS separada por tela em `Weddingifts-web/js`
- utilitários compartilhados em `js/common.js`

### Integração API

- API base fixa local: `http://localhost:5298`
- requests centralizados em helper quando possível
- exibir mensagens do backend (`ProblemDetails.detail`) para feedback de erro
- sempre ter estados de loading/success/error

### UX e acessibilidade

- botões e inputs com estados claros
- navegação consistente entre telas pública/privada
- responsividade obrigatória desktop/mobile

## Testes

- preferir testes de integração para fluxos críticos
- cada novo fluxo relevante deve ter:
  - caminho de sucesso
  - caminho de falha
- manter testes determinísticos

## Git e manutenção

- mudanças pequenas e objetivas
- não quebrar fluxos já existentes
- evitar refatorações arquiteturais sem necessidade explícita
- atualizar documentação quando endpoint, fluxo ou tela mudar
