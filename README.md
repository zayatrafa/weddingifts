# Weddingifts

Weddingifts é um MVP real de lista de presentes para casamento, construído com foco em **produto utilizável**, **qualidade de engenharia** e **evolução para SaaS**.

Este repositório demonstra um perfil completo de engenharia, capaz de:
- transformar regras de negócio em software funcional
- construir backend limpo, testável e seguro
- desenvolver frontend funcional sem dependência de frameworks
- pensar em operação, escalabilidade e experiência do usuário

---

## O Que Este Projeto Prova

- Arquitetura em camadas bem definida (`Controllers -> Services -> DbContext`)
- Regras de negócio centralizadas no backend (não espalhadas nos controllers)
- API com padrão de erro consistente (`ProblemDetails`)
- Segurança aplicada na prática (JWT, rate limit, security headers, CORS controlado)
- Integração completa entre backend e frontend
- Testes de integração protegendo fluxos críticos
- CI com GitHub Actions (`restore`, `build`, `test`)

---

## Fluxo de Produto (MVP)

1. Casal cria conta  
2. Casal realiza login  
3. Casal cria e gerencia eventos  
4. Casal gerencia convidados por evento  
5. Casal gerencia presentes por evento  
6. Convidado acessa página pública via `slug`  
7. Convidado reserva ou cancela presente usando CPF  

---

## Stack Técnica

### Backend
- .NET 8  
- ASP.NET Core Web API  
- Entity Framework Core  
- PostgreSQL  
- JWT Bearer  

### Frontend
- HTML, CSS e JavaScript puro  
- Sem frameworks  
- Sem build step  

### Qualidade
- Testes de integração (`Weddingifts.Api.IntegrationTests`)  
- CI com GitHub Actions  

---

## Regras de Negócio

### Usuários
- `cpf` obrigatório e único  
- `birthDate` obrigatório e não pode ser futuro  

### Eventos
- Nome obrigatório  
- Data obrigatória  
- `slug` único gerado automaticamente  
- Edição/exclusão permitida apenas ao dono autenticado  

### Presentes
- `price > 0` e `< 1.000.000`  
- `quantity >= 1` e `<= 100.000`  
- Reserva bloqueada quando indisponível  

### Convidados
- CPF com 11 dígitos  
- CPF único por evento  
- Nome, e-mail e telefone obrigatórios  

### Reservas
- Exige CPF válido  
- CPF deve estar cadastrado no evento  
- Controle de `ReservedQuantity`, `ReservedBy` e `ReservedAt`  

---

## Arquitetura

Principais pastas:

- `Weddingifts.Api/Controllers`  
- `Weddingifts.Api/Services`  
- `Weddingifts.Api/Entities`  
- `Weddingifts.Api/Models`  
- `Weddingifts.Api/Data`  
- `Weddingifts.Api/Middleware`  
- `Weddingifts.Api/Security`  
- `Weddingifts.Api/Migrations`  
- `Weddingifts-web`  

### Princípios adotados:
- Controllers enxutos (responsáveis apenas por HTTP)
- Services como núcleo das regras de negócio
- Persistência isolada via EF Core

---

## Segurança e Confiabilidade

- Autenticação JWT nas rotas privadas  
- Padronização de erros com `ProblemDetails`  
- Rate limiting global + reforço em rotas sensíveis  
- Security headers:
  - `X-Content-Type-Options`
  - `X-Frame-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`
  - `COOP`, `CORP`, `CSP`
  - `HSTS` (em HTTPS)
- Migrations aplicadas automaticamente no startup  

---

## Como Rodar o Projeto

### Opção recomendada
```powershell
.\run.bat
