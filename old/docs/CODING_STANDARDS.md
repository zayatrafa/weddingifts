# Coding Standards

Padrões privados de engenharia para evoluir Weddingifts sem quebrar comportamento, UX ou consistência entre frontend, backend e documentação.

## 1. Princípios obrigatórios

- preservar funcionalidade existente
- preservar UX existente, salvo pedido explícito
- preferir mudanças incrementais e controladas
- não renomear ou reorganizar estrutura sem necessidade técnica clara
- tratar o código atual como fonte primária
- declarar riscos e incertezas quando a confiança for baixa
- manter PT-BR correto como padrão do produto
- tratar mobile como requisito nativo, não ajuste posterior

## 2. Regras de alteração

Antes de editar qualquer coisa:

- identificar quais fluxos podem quebrar
- revisar arquivos compartilhados envolvidos (`common.js`, CSS global, DTOs, services, middleware)
- decidir a menor mudança capaz de resolver o problema
- evitar refactor amplo sem ganho claro e imediato

Sempre que uma task terminar, registrar:

- arquivos alterados
- validações executadas
- docs atualizados
- riscos restantes

## 3. Backend (.NET)

### 3.1 Arquitetura

Manter o padrão atual:

- controllers finos
- regras de negócio em services
- `AppDbContext` como acesso principal ao banco
- entidades em `Entities/`
- contratos HTTP em `Models/`

### 3.2 Controllers

- validar formato básico de entrada quando necessário
- delegar regra de negócio ao service
- não duplicar regra de domínio já centralizada
- retornar modelos de resposta, não entidades sensíveis
- respeitar autenticação/autorização existente

### 3.3 Services

- concentrar validações de domínio
- lançar exceções semânticas (`DomainValidationException`, `UnauthorizedRequestException`, `ForbiddenOperationException`, `ResourceNotFoundException`)
- não colocar lógica de apresentação
- considerar impacto em testes de integração antes de alterar contratos

### 3.4 DTOs e contratos

- qualquer mudança em `Weddingifts.Api/Models/*` deve ser tratada como potencial breaking change para o frontend
- ao adicionar campo novo, preferir mudança aditiva
- remover ou renomear campo exige revisão explícita dos consumidores em `Weddingifts-web/js/*`

### 3.5 Erros e HTTP

- manter `ProblemDetails` e `ValidationProblemDetails`
- mensagens de erro devem ficar em PT-BR correto
- usar códigos HTTP coerentes com a exceção lançada

### 3.6 Segurança

- nunca retornar `PasswordHash`
- não enfraquecer validações de senha, CPF, ownership ou reserva ativa
- manter JWT Bearer nas rotas privadas
- qualquer mudança em auth exige revisão de `common.js`, `login.js` e páginas privadas

## 4. Frontend (Weddingifts-web)

### 4.1 Stack obrigatória atual

- HTML/CSS/JS puro
- sem framework
- sem build step
- sem assumir tooling Node inexistente

### 4.2 Organização

- uma página por responsabilidade principal
- um script principal por tela em `Weddingifts-web/js/`
- utilitários compartilhados em `Weddingifts-web/js/common.js`
- mudanças em `common.js` exigem revisão cruzada das páginas públicas e privadas

### 4.3 Integração com a API

- a base da API não é fixa em `localhost`; ela é inferida em runtime pelo host atual e pela porta `5298`
- requests devem usar os helpers compartilhados quando fizer sentido (`getApiBase`, `requestJson`, `authHeaders`, etc.)
- erros do backend devem priorizar `ProblemDetails.detail` quando disponível
- estados de loading, sucesso, erro e vazio precisam continuar claros

### 4.4 UX e cópia do produto

- não introduzir texto sem revisão de acentuação, pontuação e tom
- evitar mensagens futuras sem backend real por trás
- preservar consistência do catálogo de mensagens compartilhadas em `common.js`
- botões, labels, placeholders, confirmações e mensagens devem ser objetivos e coerentes entre telas

### 4.5 Responsividade

- toda alteração de frontend deve revisar impacto mobile
- não usar largura total como solução automática quando isso piora a hierarquia visual
- evitar overflow horizontal, sobreposição, áreas de toque ruins e texto ilegível
- desktop e mobile devem continuar funcionais após cada mudança

### 4.6 CSS compartilhado

- mudanças em `styles.css` devem ser pensadas como sistema, não como remendo local isolado
- antes de adicionar regra específica, verificar se o problema é recorrente e merece padrão reutilizável
- evitar alterar estilos globais sem revisar páginas principais (`index`, `login`, `register`, `create-event`, `my-events`, `my-guests`, `my-event`, `event`, `account`)

## 5. Testes e validação

### 5.1 Backend

Ao tocar em:

- controllers
- services
- models
- middleware
- auth
- banco ou migrations

rodar, no mínimo:

```powershell
dotnet build Weddingifts.Api/Weddingifts.Api.sln
dotnet test Weddingifts.Api/Weddingifts.Api.sln
```

### 5.2 Frontend

Ao tocar em:

- `common.js`
- navegação
- sessão
- layout
- responsividade
- formulários
- páginas críticas

fazer validação manual compatível com o impacto.

Quando a mudança tocar fluxos críticos já cobertos pela suíte mínima, rodar também:

```powershell
npm run test:frontend-smoke
```

Para mobile, usar `docs/MOBILE_TEST_CHECKLIST.md` como base.

## 6. Documentação viva

Toda mudança relevante deve revisar os docs impactados no mesmo trabalho.

Mapa mínimo:

- arquitetura/fluxos -> `docs/ARCHITECTURE.md`
- regras de negócio -> `docs/DOMAIN_RULES.md`
- mapa funcional -> `docs/FEATURE_MAP.md`
- próximos passos -> `docs/ROADMAP.md`
- padrões de implementação -> `docs/CODING_STANDARDS.md`
- execução local -> `docs/RUNBOOK_LOCAL_DEV.md`
- problemas conhecidos -> `docs/KNOWN_ISSUES.md`
- visão geral pública -> `README.md`

Importante:

- `docs/` é privado e atualmente está fora do versionamento por política local
- isso aumenta o risco de drift
- por esse motivo, toda atualização de código relevante deve considerar também atualização documental local

## 7. O que evitar

- refactor estrutural sem pedido ou sem ganho claro
- mudar naming apenas por preferência
- alterar fluxo privado sem revisar sessão e `returnTo`
- alterar UX só porque “parece melhor” sem objetivo funcional claro
- assumir integrações inexistentes (e-mail, pagamento, deploy, analytics)
- documentar comportamento não confirmado no código
