using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace Weddingifts.Api.IntegrationTests;

public sealed class ChangePasswordIntegrationTests : IClassFixture<IntegrationTestWebApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly IntegrationTestWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public ChangePasswordIntegrationTests(IntegrationTestWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task ChangePassword_ShouldReturnUnauthorized_WhenNoToken()
    {
        await _factory.ResetDatabaseAsync();

        var response = await _client.PutAsJsonAsync("/api/users/me/password", new
        {
            currentPassword = "Teste@123",
            newPassword = "Nova@123"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ChangePassword_ShouldReturnBadRequest_WhenNewPasswordIsWeak()
    {
        await _factory.ResetDatabaseAsync();

        var session = await CreateAuthenticatedUserSessionAsync();

        var response = await PutAuthorizedJsonAsync("/api/users/me/password", new
        {
            currentPassword = session.Password,
            newPassword = "fraca123"
        }, session.Token);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ProblemDetails>(JsonOptions);
        Assert.NotNull(payload);
        Assert.Equal("Erro de validação", payload.Title);
        Assert.Equal("A nova senha deve ter no mínimo 8 caracteres e conter letras, números e caractere especial.", payload.Detail);
    }

    [Fact]
    public async Task ChangePassword_ShouldReturnBadRequest_WhenNewPasswordMatchesCurrent()
    {
        await _factory.ResetDatabaseAsync();

        var session = await CreateAuthenticatedUserSessionAsync();

        var response = await PutAuthorizedJsonAsync("/api/users/me/password", new
        {
            currentPassword = session.Password,
            newPassword = session.Password
        }, session.Token);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ProblemDetails>(JsonOptions);
        Assert.NotNull(payload);
        Assert.Equal("Erro de validação", payload.Title);
        Assert.Equal("A nova senha deve ser diferente da senha atual.", payload.Detail);
    }

    [Fact]
    public async Task ChangePassword_ShouldReturnUnauthorized_WhenCurrentPasswordIsIncorrect()
    {
        await _factory.ResetDatabaseAsync();

        var session = await CreateAuthenticatedUserSessionAsync();

        var response = await PutAuthorizedJsonAsync("/api/users/me/password", new
        {
            currentPassword = "Errada@123",
            newPassword = "Nova@123"
        }, session.Token);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ProblemDetails>(JsonOptions);
        Assert.NotNull(payload);
        Assert.Equal("Não autorizado", payload.Title);
        Assert.Equal("Senha atual incorreta.", payload.Detail);
    }

    [Fact]
    public async Task ChangePassword_ShouldReturnNoContent_WhenCurrentPasswordIsCorrect()
    {
        await _factory.ResetDatabaseAsync();

        var session = await CreateAuthenticatedUserSessionAsync();

        var response = await PutAuthorizedJsonAsync("/api/users/me/password", new
        {
            currentPassword = session.Password,
            newPassword = "Nova@123"
        }, session.Token);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task ChangePassword_ShouldKeepCurrentTokenValid_AndUseNewPasswordForFutureLogins()
    {
        await _factory.ResetDatabaseAsync();

        var session = await CreateAuthenticatedUserSessionAsync();
        const string newPassword = "Nova@123";

        var changePasswordResponse = await PutAuthorizedJsonAsync("/api/users/me/password", new
        {
            currentPassword = session.Password,
            newPassword
        }, session.Token);

        Assert.Equal(HttpStatusCode.NoContent, changePasswordResponse.StatusCode);

        var stillAuthorizedResponse = await GetAuthorizedAsync("/api/events/mine", session.Token);
        Assert.Equal(HttpStatusCode.OK, stillAuthorizedResponse.StatusCode);

        var oldLoginResponse = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            email = session.Email,
            password = session.Password
        });

        Assert.Equal(HttpStatusCode.Unauthorized, oldLoginResponse.StatusCode);

        var newLoginResponse = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            email = session.Email,
            password = newPassword
        });

        Assert.Equal(HttpStatusCode.OK, newLoginResponse.StatusCode);
    }

    private async Task<AuthSessionContract> CreateAuthenticatedUserSessionAsync()
    {
        var password = "Teste@123";
        var email = $"test-{Guid.NewGuid():N}@weddingifts.local";
        var cpf = GenerateUniqueCpf();

        var createUserResponse = await _client.PostAsJsonAsync("/api/users", new
        {
            name = "Usuário Teste",
            email,
            cpf,
            birthDate = new DateTime(1990, 1, 1),
            password
        });

        var createUserBody = await createUserResponse.Content.ReadAsStringAsync();
        Assert.True(createUserResponse.IsSuccessStatusCode, $"Erro ao criar usuário: {createUserBody}");

        var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            email,
            password
        });

        var loginBody = await loginResponse.Content.ReadAsStringAsync();
        Assert.True(loginResponse.IsSuccessStatusCode, $"Erro ao autenticar usuário: {loginBody}");

        var loginPayload = await loginResponse.Content.ReadFromJsonAsync<LoginResponseContract>(JsonOptions);

        return new AuthSessionContract
        {
            Email = email,
            Password = password,
            Token = loginPayload!.Token
        };
    }

    private static string GenerateUniqueCpf()
    {
        while (true)
        {
            var numbers = new int[11];

            for (var i = 0; i < 9; i++)
            {
                numbers[i] = Random.Shared.Next(0, 10);
            }

            numbers[9] = CalculateCpfVerifier(numbers, 9, 10);
            numbers[10] = CalculateCpfVerifier(numbers, 10, 11);

            if (numbers.All(number => number == numbers[0]))
            {
                continue;
            }

            return string.Concat(numbers);
        }
    }

    private static int CalculateCpfVerifier(int[] numbers, int length, int initialWeight)
    {
        var sum = 0;

        for (var i = 0; i < length; i++)
        {
            sum += numbers[i] * (initialWeight - i);
        }

        var remainder = sum % 11;
        return remainder < 2 ? 0 : 11 - remainder;
    }

    private async Task<HttpResponseMessage> PutAuthorizedJsonAsync(string url, object body, string token)
    {
        var request = new HttpRequestMessage(HttpMethod.Put, url)
        {
            Content = JsonContent.Create(body)
        };

        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return await _client.SendAsync(request);
    }

    private async Task<HttpResponseMessage> GetAuthorizedAsync(string url, string token)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return await _client.SendAsync(request);
    }

    private sealed class AuthSessionContract
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string Token { get; set; } = string.Empty;
    }

    private sealed class LoginResponseContract
    {
        public string Token { get; set; } = string.Empty;
    }
}
