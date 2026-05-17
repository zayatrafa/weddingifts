# Design System Refactor

## Objetivo

Aplicar o `DESIGN.md` como referencia de tokens, componentes e qualidade visual para o Weddingifts, preservando o posicionamento do produto como plataforma de organizacao de cerimonia de casamento, convidados, RSVP e presentes.

## Requisitos

- DSR-R01: A identidade visual deve usar canvas claro, tipografia sans limpa, raios suaves, espacamento generoso e acento principal `#ff385c`.
- DSR-R02: A interface nao deve adotar linguagem literal de marketplace, busca global sem funcao real, cards de imoveis ou navegacao do tipo Homes/Experiences/Services.
- DSR-R03: `Weddingifts-web/styles.css` deve concentrar tokens e estilos compartilhados para cores, tipografia, botoes, inputs, cards, status, navegacao, footer e responsividade.
- DSR-R04: As paginas publicas devem parecer convite/hub de cerimonia, incluindo landing, convite publico, RSVP e lista de presentes.
- DSR-R05: As paginas privadas devem parecer painel de organizacao do casamento, incluindo criacao/listagem/edicao de eventos, convidados, presentes/reservas e conta.
- DSR-R06: IDs, classes funcionais, scripts vanilla JS, contratos HTTP e fluxos existentes devem ser preservados.
- DSR-R07: Textos visiveis ao usuario devem permanecer em PT-BR e evitar reposicionar o produto como marketplace.
- DSR-R08: A experiencia deve ser responsiva desde o desenho inicial, com atencao a legibilidade, tocabilidade, ausencia de overflow horizontal e drawer/carrinho mobile.
- DSR-R09: A validacao deve seguir `.specs/codebase/TESTING.md`, confirmando Docker/PostgreSQL antes de smoke ou Playwright.

## Fora de Escopo

- Mudancas de backend, banco, autenticacao, regras de dominio ou contratos HTTP.
- Migracao para framework frontend ou build step.
- Criacao de busca global ou navegacao de marketplace sem funcao real.
