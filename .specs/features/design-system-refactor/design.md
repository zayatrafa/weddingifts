# Design

## Direcao Visual

O `DESIGN.md` sera usado como sistema visual, nao como categoria de produto. A adaptacao mantem o Weddingifts como plataforma clara, acolhedora e confiavel para cerimonias.

## Tokens

- Fonte: `"Airbnb Cereal VF", Circular, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`.
- Canvas: branco e `#f7f7f7`, com superfices elevadas brancas.
- Texto: `#222222`, `#6a6a6a`, `#929292`.
- Acento principal: `#ff385c`, hover `#e00b41`, soft `#fff1f4`.
- Apoio de cerimonia: vinho suave `#7c3f4f`, usado com parcimonia para preservar contexto de casamento.
- Bordas: `#dddddd` e `#c1c1c1`.
- Raios: 8px, 14px, 20px, 32px e pill.

## Componentes

- Nav e drawer mobile: limpos, tocaveis, com links orientados a convite/evento e painel.
- Botoes: primario em `#ff385c`; secundarios brancos com borda; estados hover/focus consistentes.
- Inputs: brancos, borda neutra, foco visivel com anel do acento.
- Cards: superficies brancas, borda neutra, sombra leve e conteudo respirado.
- Status: info neutro, sucesso verde funcional, erro `#c13515`.
- Footer: extensao discreta do shell, sem peso visual excessivo.

## Paginas

- Publicas: landing e evento publico devem comunicar convite, RSVP, informacoes da cerimonia e lista de presentes.
- Privadas: paginas autenticadas devem comunicar organizacao do casamento e gerenciamento de evento, convidados e presentes.
- Mobile: manter drawer global, CTAs com minimo tocavel e carrinho de presentes como bottom sheet.

## Riscos

- `styles.css` e compartilhado por todos os fluxos; regressao visual pode afetar paginas nao abertas manualmente.
- O baseline atual contem alteracoes locais preexistentes em frontend e docs; diffs devem ser revisados sem reverter trabalho do usuario.
