# Weddingifts

Weddingifts e um MVP real de lista de presentes para casamento, construído com foco em **produto utilizavel**, **qualidade de engenharia** e **evolucao para SaaS**.

Este repositorio foi estruturado para mostrar um perfil que entrega ponta a ponta:
- transforma regra de negocio em software funcionando
- escreve backend limpo, testavel e seguro
- constroi frontend funcional sem depender de framework
- pensa em operacao, evolucao e experiencia do usuario

## O Que Este Projeto Prova

- Arquitetura em camadas bem definida (`Controllers -> Services -> DbContext`)
- Regras de negocio consistentes no backend (nao espalhadas no controller)
- API com padrao de erro (`ProblemDetails`) e contrato previsivel
- Seguranca aplicada na pratica (JWT, rate limit, security headers, CORS controlado)
- Integracao backend + frontend com fluxos completos de usuario
- Testes de integracao para proteger comportamento critico
- CI em GitHub Actions com `restore`, `build` e `test`

## Fluxo De Produto Entregue (MVP)

1. casal cria conta
2. casal faz login
3. casal cria e gerencia eventos
4. casal gerencia convidados por evento
5. casal gerencia presentes por evento
6. convidado acessa pagina publica por `slug`
7. convidado reserva e cancela presente com CPF

## Stack Tecnica

Backend:
- .NET 8
- ASP.NET Core Web API
- Entity Framework Core
- PostgreSQL
- JWT Bearer

Frontend:
- HTML, CSS e JavaScript puro
- sem framework
- sem build step

Qualidade:
- testes de integracao (`Weddingifts.Api.IntegrationTests`)
- GitHub Actions (pipeline automatizada)

## Regras De Negocio Relevantes

Usuarios:
- `cpf` obrigatorio e unico
- `birthDate` obrigatorio e nao pode ser futura

Eventos:
- nome obrigatorio
- data obrigatoria
- `slug` unico gerado automaticamente
- edicao/exclusao apenas pelo dono autenticado

Presentes:
- `price > 0` e `price < 1000000`
- `quantity >= 1` e `quantity <= 100000`
- reserva bloqueada quando indisponivel

Convidados:
- CPF com 11 digitos
- CPF unico por evento
- nome, email e telefone obrigatorios

Reservas:
- exige CPF valido
- CPF precisa estar cadastrado no evento
- controle de `ReservedQuantity`, `ReservedBy` e `ReservedAt`

## Arquitetura

Pastas principais:
- `Weddingifts.Api/Controllers`
- `Weddingifts.Api/Services`
- `Weddingifts.Api/Entities`
- `Weddingifts.Api/Models`
- `Weddingifts.Api/Data`
- `Weddingifts.Api/Middleware`
- `Weddingifts.Api/Security`
- `Weddingifts.Api/Migrations`
- `Weddingifts-web`

Principio usado no backend:
- controller enxuto para HTTP
- service como dono da regra de negocio
- persistencia isolada no EF Core

## Seguranca E Confiabilidade

- autenticacao JWT nas rotas privadas
- `ProblemDetails` padronizado para erros
- rate limiting global e reforcado em rotas sensiveis
- headers de seguranca (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `COOP`, `CORP`, `CSP`, `HSTS` em HTTPS)
- migrations aplicadas automaticamente no startup

## Como Rodar

Opcao recomendada:

```powershell
.\run.bat
```

Opcao alternativa:

```powershell
.\start-dev.ps1
```

Manual:

```powershell
cd Weddingifts.Api
dotnet run
```

```powershell
cd Weddingifts-web
py -m http.server 5500
```

URLs:
- Frontend: `http://localhost:5500`
- API: `http://localhost:5298`
- Swagger: `http://localhost:5298/swagger`

## Testes

```powershell
dotnet restore Weddingifts.Api/Weddingifts.Api.sln --configfile Weddingifts.Api/NuGet.Config
dotnet test Weddingifts.Api/Weddingifts.Api.sln --no-restore
```

Checklist mobile:
- [docs/MOBILE_TEST_CHECKLIST.md](docs/MOBILE_TEST_CHECKLIST.md)

## Diferenciais Profissionais Evidenciados

- capacidade de levar produto do zero ate MVP funcional
- dominio de regras de negocio com foco em consistencia
- preocupacao real com seguranca e operacao
- boa separacao de responsabilidades e manutencao futura
- visao de produto, nao apenas de codigo

## Status Atual

- MVP funcional implementado
- pre-producao em andamento
- foco atual em estabilizacao para publicacao

## Contato

Se voce representa empresa ou time tecnico e quer conversar sobre backend, produto e engenharia com ownership de ponta a ponta, estou aberto a oportunidades.

- LinkedIn: **adicione seu link aqui**
- Email: **adicione seu email aqui**

## Licenca

Projeto em desenvolvimento ativo para aprendizado, portfolio e evolucao de produto.
