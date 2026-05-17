# Convenções

## Geral

- o código é a fonte primária de verdade
- preservar fluxos que já funcionam e evitar rewrites não relacionados
- manter a cópia do produto em PT-BR correta
- considerar desktop e mobile como escopos nativos de toda feature web

## Uso Do TLC

- `tlc-spec-driven` é o workflow padrão
- Quick Mode se aplica a tarefas descritas em uma frase, tocando no máximo 3 arquivos e sem decisão arquitetural
- se o trabalho crescer além disso, a expansão de escopo deve ser reconhecida e o nível correto de TLC deve ser usado

## Backend

- manter controllers finos
- manter regras de negócio em services
- manter acesso a dados via EF Core através de `AppDbContext`
- manter erros no estilo `ProblemDetails`
- preferir mudanças aditivas em contratos em vez de renomeações ou remoções breaking
- não vazar campos sensíveis

## Frontend

- manter HTML/CSS/JS sem adicionar framework nem build step
- preferir helpers compartilhados em `common.js` para API, auth, redirect e comportamento de status
- preservar estados claros de loading, sucesso, vazio e erro
- usar inferência da base da API em runtime em vez de hard-code de outro modelo de host
- toda implementação de frontend deve funcionar bem em navegador desktop e em navegador mobile
- evitar interações que dependam exclusivamente de hover, largura ampla ou precisão de mouse
- garantir que formulários, CTAs, navegação, feedbacks e áreas clicáveis continuem utilizáveis em telas pequenas e grandes

## Documentação

- a documentação ativa vive em `.specs/`
- os docs arquivados em `.specs/archive/` são apenas históricos
- atualizar a documentação ativa quando arquitetura, comportamento, roadmap, padrões ou concerns conhecidos mudarem de forma material

## Sub-Agentes

- sub-agentes não são o padrão neste repositório
- só devem ser usados quando o usuário pedir explicitamente trabalho delegado ou paralelo
