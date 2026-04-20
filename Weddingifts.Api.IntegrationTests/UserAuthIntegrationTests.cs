using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace Weddingifts.Api.IntegrationTests;

public sealed class UserAuthIntegrationTests : IntegrationTestBase, IClassFixture<IntegrationTestWebApplicationFactory>
{
    public UserAuthIntegrationTests(IntegrationTestWebApplicationFactory factory) : base(factory)
    {
    }

    [Fact]
    public async Task CreateUser_ShouldReturnCreated_WhenRequestIsValid()
    {
        await Factory.ResetDatabaseAsync();

        var email = $"maria-{Guid.NewGuid():N}@weddingifts.local";
        var cpf = GenerateUniqueCpf();

        var response = await Client.PostAsJsonAsync("/api/users", new
        {
            name = "Maria Silva",
            email,
            cpf,
            birthDate = new DateTime(1991, 5, 20),
            password = "Senha@123"
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.NotNull(response.Headers.Location);

        var rawBody = await response.Content.ReadAsStringAsync();
        var payload = JsonSerializer.Deserialize<UserResponseContract>(rawBody, JsonOptions);

        Assert.NotNull(payload);
        Assert.True(payload.Id > 0);
        Assert.Equal("Maria Silva", payload.Name);
        Assert.Equal(email, payload.Email);
        Assert.NotEqual(default, payload.CreatedAt);
        Assert.DoesNotContain("senha", rawBody, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(cpf, rawBody, StringComparison.Ordinal);
    }

    [Fact]
    public async Task CreateUser_ShouldReturnBadRequest_WhenEmailAlreadyExists()
    {
        await Factory.ResetDatabaseAsync();

        var email = $"duplicado-{Guid.NewGuid():N}@weddingifts.local";

        await RegisterUserAsync(email: email);

        var response = await Client.PostAsJsonAsync("/api/users", new
        {
            name = "Outro Usuário",
            email,
            cpf = GenerateUniqueCpf(),
            birthDate = new DateTime(1990, 1, 1),
            password = "Senha@123"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ProblemDetails>(JsonOptions);
        Assert.NotNull(payload);
        Assert.Equal("Erro de validação", payload.Title);
        Assert.Equal("E-mail já cadastrado.", payload.Detail);
    }

    [Fact]
    public async Task CreateUser_ShouldReturnBadRequest_WhenCpfAlreadyExists()
    {
        await Factory.ResetDatabaseAsync();

        var cpf = GenerateUniqueCpf();

        await RegisterUserAsync(cpf: cpf);

        var response = await Client.PostAsJsonAsync("/api/users", new
        {
            name = "Outro Usuário",
            email = $"outro-{Guid.NewGuid():N}@weddingifts.local",
            cpf,
            birthDate = new DateTime(1990, 1, 1),
            password = "Senha@123"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ProblemDetails>(JsonOptions);
        Assert.NotNull(payload);
        Assert.Equal("Erro de validação", payload.Title);
        Assert.Equal("CPF já cadastrado.", payload.Detail);
    }

    [Fact]
    public async Task CreateUser_ShouldReturnBadRequest_WhenBirthDateIsInFuture()
    {
        await Factory.ResetDatabaseAsync();

        var response = await Client.PostAsJsonAsync("/api/users", new
        {
            name = "Maria Silva",
            email = $"future-{Guid.NewGuid():N}@weddingifts.local",
            cpf = GenerateUniqueCpf(),
            birthDate = DateTime.UtcNow.AddDays(1),
            password = "Senha@123"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ProblemDetails>(JsonOptions);
        Assert.NotNull(payload);
        Assert.Equal("Erro de validação", payload.Title);
        Assert.Equal("Data de nascimento não pode ser futura.", payload.Detail);
    }

    [Fact]
    public async Task Login_ShouldReturnOk_WhenCredentialsAreValid()
    {
        await Factory.ResetDatabaseAsync();

        var user = await RegisterUserAsync(email: $"login-{Guid.NewGuid():N}@weddingifts.local", password: "Senha@123");

        var response = await Client.PostAsJsonAsync("/api/auth/login", new
        {
            email = user.Email.ToUpperInvariant(),
            password = user.Password
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<LoginResponseContract>(JsonOptions);

        Assert.NotNull(payload);
        Assert.False(string.IsNullOrWhiteSpace(payload.Token));
        Assert.True(payload.ExpiresAt > DateTime.UtcNow);
        Assert.NotNull(payload.User);
        Assert.Equal(user.Id, payload.User.Id);
        Assert.Equal(user.Name, payload.User.Name);
        Assert.Equal(user.Email, payload.User.Email);
        Assert.NotEqual(default, payload.User.CreatedAt);
    }

    [Fact]
    public async Task Login_ShouldReturnUnauthorized_WhenCredentialsAreInvalid()
    {
        await Factory.ResetDatabaseAsync();

        var user = await RegisterUserAsync(password: "Senha@123");

        var response = await Client.PostAsJsonAsync("/api/auth/login", new
        {
            email = user.Email,
            password = "Errada@123"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ProblemDetails>(JsonOptions);
        Assert.NotNull(payload);
        Assert.Equal("Não autorizado", payload.Title);
        Assert.Equal("E-mail ou senha inválidos.", payload.Detail);
    }
}
