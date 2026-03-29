# Weddingifts

Weddingifts é uma aplicação para criação e gerenciamento de listas de presentes de casamento.

O projeto foi construído para:
- aprendizado técnico com práticas modernas
- portfólio profissional
- evolução futura para produto SaaS
- entrega de um MVP publicável

## Visão geral do fluxo

Fluxo principal atual:
- casal cria conta
- casal faz login
- casal cria eventos
- casal gerencia convidados por evento
- casal gerencia presentes por evento
- convidados acessam página pública por `slug`
- convidados reservam e cancelam presentes com CPF

## Stack

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

Qualidade e entrega:
- testes de integração (`Weddingifts.Api.IntegrationTests`)
- CI no GitHub Actions (`restore`, `build`, `test`)

## Funcionalidades implementadas

Autenticação e usuário:
- cadastro de usuário com `name`, `email`, `password`, `cpf`, `birthDate`
- CPF obrigatório e único
- `birthDate` obrigatório e não pode ser futura
- login com JWT

Eventos:
- criação de evento autenticado
- listagem de eventos do usuário logado
- atualização de evento do usuário logado
- exclusão de evento do usuário logado
- recuperação pública de evento por `slug`

Presentes:
- criação, listagem, edição e exclusão por evento
- validações de preço e quantidade no frontend e backend
- reserva/cancelamento de presente

Convidados:
- criação, listagem, edição e exclusão por evento
- busca por CPF dentro do evento
- validação de CPF, nome, e-mail e telefone

Reserva pública:
- reserva exige CPF válido
- CPF precisa estar na lista de convidados do evento
- controle de `ReservedQuantity`, `ReservedBy` e `ReservedAt`

## Regras de negócio principais

Evento:
- nome obrigatório
- data obrigatória e futura
- `slug` único
- editar/excluir apenas pelo dono autenticado

Presente:
- `price > 0`
- `price < 1000000`
- `quantity >= 1`
- `quantity <= 100000`
- `name` e `description` limitados a 255 caracteres

Convidado:
- CPF com 11 dígitos
- CPF único por evento
- nome, e-mail e telefone obrigatórios

## Arquitetura

Backend em camadas:
- `Controllers` -> HTTP, autenticação/autorização, DTOs e respostas
- `Services` -> regras de negócio e validações
- `Data` (`AppDbContext`) -> persistência com EF Core
- `Entities` -> mapeamento de dados
- `Models` -> contratos de request/response

Estrutura principal:
- `Weddingifts.Api/Controllers`
- `Weddingifts.Api/Services`
- `Weddingifts.Api/Entities`
- `Weddingifts.Api/Models`
- `Weddingifts.Api/Data`
- `Weddingifts.Api/Middleware`
- `Weddingifts.Api/Security`
- `Weddingifts.Api/Migrations`
- `Weddingifts-web`

## Segurança e API

- autenticação JWT em rotas privadas
- middleware global de exceções com `ProblemDetails`
- validações com mensagens em PT-BR no frontend
- CORS liberado para `http://localhost:5500` e `http://127.0.0.1:5500`
- rate limiting global e regras mais restritas para login e criação de usuário
- migrations aplicadas automaticamente ao iniciar a API

## Pré-requisitos

- .NET SDK 8
- PostgreSQL local (ou outro ambiente PostgreSQL acessível)
- Python 3 (para servidor estático do frontend)
- Windows PowerShell (scripts utilitários do projeto)

## Configuração

String de conexão padrão (desenvolvimento local) em `Weddingifts.Api/appsettings.json`:

```json
"ConnectionStrings": {
  "DefaultConnection": "Host=localhost;Port=5432;Database=weddingifts;Username=admin;Password=admin123"
}
```

Se necessário, ajuste a conexão conforme seu ambiente.

## Como executar localmente

Opção recomendada:

```powershell
.\run.bat
```

Alternativa com script PowerShell:

```powershell
.\start-dev.ps1
```

Execução manual:

Backend:

```powershell
cd Weddingifts.Api
dotnet run
```

Frontend:

```powershell
cd Weddingifts-web
py -m http.server 5500
```

URLs:
- Frontend: `http://localhost:5500`
- API: `http://localhost:5298`
- Swagger (desenvolvimento): `http://localhost:5298/swagger`

## Testes

```powershell
dotnet restore Weddingifts.Api/Weddingifts.Api.sln --configfile Weddingifts.Api/NuGet.Config
dotnet test Weddingifts.Api/Weddingifts.Api.sln --no-restore
```

## Frontend e telas principais

- `index.html` (landing)
- `register.html` (cadastro)
- `login.html` (login)
- `create-event.html` (criação de evento)
- `my-events.html` (gerenciamento de eventos)
- `my-guests.html` (gerenciamento de convidados)
- `my-event.html` (gerenciamento de presentes)
- `event.html` (evento público)
- `account.html` (minha conta)

## Status do produto

Situação atual:
- MVP funcional implementado
- projeto em pré-produção
- foco em estabilização para MVP publicável

Focos imediatos para publicação:
- acabamento de UX e consistência de validações/mensagens
- segurança operacional complementar
- setup de deploy, observabilidade e backup

## Próximos passos sugeridos

1. Sprint de estabilização do MVP publicável (UX, validações, i18n PT-BR, limites)
2. Sprint de produção mínima (deploy, domínio, HTTPS, banco gerenciado, secrets, logs)
3. Go-live controlado com poucos usuários e ciclo curto de feedback
4. Pós-MVP: confirmação real por e-mail e convites por e-mail/WhatsApp

## Licença

Este projeto está em desenvolvimento ativo para fins de aprendizado, portfólio e evolução de produto.
