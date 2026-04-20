using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace Weddingifts.Api.IntegrationTests;

public abstract class IntegrationTestBase
{
    protected static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    protected readonly IntegrationTestWebApplicationFactory Factory;
    protected readonly HttpClient Client;

    protected IntegrationTestBase(IntegrationTestWebApplicationFactory factory)
    {
        Factory = factory;
        Client = factory.CreateClient();
    }

    protected async Task<AuthenticatedUserSession> CreateAuthenticatedUserSessionAsync(
        string? name = null,
        string? email = null,
        string? cpf = null,
        string? password = null,
        DateTime? birthDate = null)
    {
        var user = await RegisterUserAsync(name, email, cpf, password, birthDate);
        var loginResponse = await Client.PostAsJsonAsync("/api/auth/login", new
        {
            email = user.Email,
            password = user.Password
        });

        var loginBody = await loginResponse.Content.ReadAsStringAsync();
        Assert.True(loginResponse.IsSuccessStatusCode, $"Erro ao autenticar usuário: {loginBody}");

        var loginPayload = await loginResponse.Content.ReadFromJsonAsync<LoginResponseContract>(JsonOptions);

        return new AuthenticatedUserSession
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Cpf = user.Cpf,
            Password = user.Password,
            Token = loginPayload!.Token
        };
    }

    protected async Task<RegisteredUser> RegisterUserAsync(
        string? name = null,
        string? email = null,
        string? cpf = null,
        string? password = null,
        DateTime? birthDate = null)
    {
        var normalizedEmail = email ?? $"test-{Guid.NewGuid():N}@weddingifts.local";
        var normalizedCpf = cpf ?? GenerateUniqueCpf();
        var normalizedPassword = password ?? "Teste@123";
        var normalizedBirthDate = birthDate ?? new DateTime(1990, 1, 1);
        var normalizedName = name ?? "Usuário Teste";

        var createUserResponse = await Client.PostAsJsonAsync("/api/users", new
        {
            name = normalizedName,
            email = normalizedEmail,
            cpf = normalizedCpf,
            birthDate = normalizedBirthDate,
            password = normalizedPassword
        });

        var createUserBody = await createUserResponse.Content.ReadAsStringAsync();
        Assert.True(createUserResponse.IsSuccessStatusCode, $"Erro ao criar usuário: {createUserBody}");

        var createdUser = await createUserResponse.Content.ReadFromJsonAsync<UserResponseContract>(JsonOptions);

        return new RegisteredUser
        {
            Id = createdUser!.Id,
            Name = createdUser.Name,
            Email = createdUser.Email,
            Password = normalizedPassword,
            Cpf = normalizedCpf,
            BirthDate = normalizedBirthDate,
            CreatedAt = createdUser.CreatedAt
        };
    }

    protected async Task<EventResponseContract> CreateEventAsync(
        string token,
        string? eventName = null,
        DateTime? eventDate = null)
    {
        var response = await PostAuthorizedJsonAsync("/api/events", new
        {
            name = eventName ?? "Casamento Teste",
            eventDate = eventDate ?? DateTime.UtcNow.AddMonths(1)
        }, token);

        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.IsSuccessStatusCode, $"Erro ao criar evento: {body}");

        return (await response.Content.ReadFromJsonAsync<EventResponseContract>(JsonOptions))!;
    }

    protected async Task<EventGuestResponseContract> CreateGuestAsync(
        string token,
        int eventId,
        string? cpf = null,
        string? name = null,
        string? email = null,
        string? phoneNumber = null)
    {
        var response = await PostAuthorizedJsonAsync($"/api/events/{eventId}/guests", new
        {
            cpf = cpf ?? GenerateUniqueCpf(),
            name = name ?? "Convidado Teste",
            email = email ?? $"guest-{Guid.NewGuid():N}@weddingifts.local",
            phoneNumber = phoneNumber ?? "11999990000"
        }, token);

        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.IsSuccessStatusCode, $"Erro ao criar convidado: {body}");

        return (await response.Content.ReadFromJsonAsync<EventGuestResponseContract>(JsonOptions))!;
    }

    protected async Task<HttpResponseMessage> PostAuthorizedJsonAsync(string url, object body, string token)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = JsonContent.Create(body)
        };

        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return await Client.SendAsync(request);
    }

    protected async Task<HttpResponseMessage> PutAuthorizedJsonAsync(string url, object body, string token)
    {
        var request = new HttpRequestMessage(HttpMethod.Put, url)
        {
            Content = JsonContent.Create(body)
        };

        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return await Client.SendAsync(request);
    }

    protected async Task<HttpResponseMessage> GetAuthorizedAsync(string url, string token)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return await Client.SendAsync(request);
    }

    protected async Task<HttpResponseMessage> DeleteAuthorizedAsync(string url, string token)
    {
        var request = new HttpRequestMessage(HttpMethod.Delete, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return await Client.SendAsync(request);
    }

    protected static string GenerateUniqueCpf()
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
}

public class RegisteredUser
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Cpf { get; set; } = string.Empty;
    public DateTime BirthDate { get; set; }
    public DateTime CreatedAt { get; set; }
}

public sealed class AuthenticatedUserSession : RegisteredUser
{
    public int UserId => Id;
    public string Token { get; set; } = string.Empty;
}

public sealed class UserResponseContract
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public sealed class LoginResponseContract
{
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public UserResponseContract User { get; set; } = new();
}

public sealed class EventResponseContract
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime EventDate { get; set; }
    public string Slug { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public List<object> Gifts { get; set; } = [];
    public int GuestCount { get; set; }
}

public sealed class EventGuestResponseContract
{
    public int Id { get; set; }
    public int EventId { get; set; }
    public string Cpf { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
