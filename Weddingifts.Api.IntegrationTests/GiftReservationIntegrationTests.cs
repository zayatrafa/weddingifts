using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace Weddingifts.Api.IntegrationTests;

public sealed class GiftReservationIntegrationTests : IClassFixture<IntegrationTestWebApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly IntegrationTestWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public GiftReservationIntegrationTests(IntegrationTestWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task CreateEvent_ShouldReturnUnauthorized_WhenNoToken()
    {
        await _factory.ResetDatabaseAsync();

        var response = await _client.PostAsJsonAsync("/api/events", new
        {
            name = "Casamento Sem Token",
            eventDate = DateTime.UtcNow.AddMonths(1)
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task CreateGift_ShouldReturnForbidden_WhenEventBelongsToAnotherUser()
    {
        await _factory.ResetDatabaseAsync();

        var ownerSession = await CreateAuthenticatedUserSessionAsync();
        var intruderSession = await CreateAuthenticatedUserSessionAsync();
        var ownerEventId = await CreateEventAsync(ownerSession.Token, "Evento do dono");

        var response = await PostAuthorizedJsonAsync($"/api/events/{ownerEventId}/gifts", new
        {
            name = "Aspirador",
            description = "Nao deveria ser permitido",
            price = 199.90m,
            quantity = 1
        }, intruderSession.Token);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ProblemDetails>(JsonOptions);
        Assert.NotNull(payload);
        Assert.Equal("Acesso negado", payload.Title);
        Assert.Equal("Você não tem permissão para modificar este evento.", payload.Detail);
    }

    [Fact]
    public async Task ReserveGift_ShouldReturnOk_WhenGuestCpfIsInvited()
    {
        await _factory.ResetDatabaseAsync();

        var session = await CreateAuthenticatedUserSessionAsync();
        var eventId = await CreateEventAsync(session.Token);
        var giftId = await CreateGiftAsync(session.Token, eventId, quantity: 2);
        const string guestCpf = "52998224725";

        await CreateGuestAsync(session.Token, eventId, guestCpf);

        var response = await _client.PostAsJsonAsync($"/api/gifts/{giftId}/reserve", new { guestCpf });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<GiftResponseContract>(JsonOptions);
        Assert.NotNull(payload);
        Assert.Equal(1, payload.ReservedQuantity);
        Assert.Equal(guestCpf, payload.ReservedBy);
        Assert.False(payload.IsFullyReserved);
    }

    [Fact]
    public async Task ReserveGift_ShouldReturnBadRequest_WhenGiftIsFullyReserved()
    {
        await _factory.ResetDatabaseAsync();

        var session = await CreateAuthenticatedUserSessionAsync();
        var eventId = await CreateEventAsync(session.Token);
        var giftId = await CreateGiftAsync(session.Token, eventId, quantity: 1);
        const string guestCpf = "52998224725";

        await CreateGuestAsync(session.Token, eventId, guestCpf);

        await _client.PostAsJsonAsync($"/api/gifts/{giftId}/reserve", new { guestCpf });
        var response = await _client.PostAsJsonAsync($"/api/gifts/{giftId}/reserve", new { guestCpf });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ProblemDetails>(JsonOptions);
        Assert.NotNull(payload);
        Assert.Equal("Erro de validação", payload.Title);
        Assert.Equal("Este presente já está totalmente reservado.", payload.Detail);
    }

    [Fact]
    public async Task ReserveGift_ShouldReturnBadRequest_WhenCpfIsNotInvited()
    {
        await _factory.ResetDatabaseAsync();

        var session = await CreateAuthenticatedUserSessionAsync();
        var eventId = await CreateEventAsync(session.Token);
        var giftId = await CreateGiftAsync(session.Token, eventId, quantity: 1);

        var response = await _client.PostAsJsonAsync($"/api/gifts/{giftId}/reserve", new { guestCpf = "52998224725" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ProblemDetails>(JsonOptions);
        Assert.NotNull(payload);
        Assert.Equal("Erro de validação", payload.Title);
        Assert.Equal("Este CPF não está convidado para este evento.", payload.Detail);
    }

    [Fact]
    public async Task UnreserveGift_ShouldReturnOk_WhenGiftHasReservation()
    {
        await _factory.ResetDatabaseAsync();

        var session = await CreateAuthenticatedUserSessionAsync();
        var eventId = await CreateEventAsync(session.Token);
        var giftId = await CreateGiftAsync(session.Token, eventId, quantity: 1);
        const string guestCpf = "52998224725";

        await CreateGuestAsync(session.Token, eventId, guestCpf);

        await _client.PostAsJsonAsync($"/api/gifts/{giftId}/reserve", new { guestCpf });
        var response = await _client.PostAsync($"/api/gifts/{giftId}/unreserve", content: null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<GiftResponseContract>(JsonOptions);
        Assert.NotNull(payload);
        Assert.Equal(0, payload.ReservedQuantity);
        Assert.Null(payload.ReservedBy);
        Assert.Null(payload.ReservedAt);
    }

    [Fact]
    public async Task UnreserveGift_ShouldReturnBadRequest_WhenGiftHasNoReservation()
    {
        await _factory.ResetDatabaseAsync();
        var session = await CreateAuthenticatedUserSessionAsync();
        var eventId = await CreateEventAsync(session.Token);
        var giftId = await CreateGiftAsync(session.Token, eventId, quantity: 1);

        var response = await _client.PostAsync($"/api/gifts/{giftId}/unreserve", content: null);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ProblemDetails>(JsonOptions);
        Assert.NotNull(payload);
        Assert.Equal("Erro de validação", payload.Title);
        Assert.Equal("Este presente não possui reserva ativa.", payload.Detail);
    }

    [Theory]
    [InlineData(0, 1, "Preço deve ser maior que zero.")]
    [InlineData(1000000, 1, "Preço deve ser menor que 1000000.")]
    [InlineData(10, 0, "Quantidade deve ser maior ou igual a 1.")]
    [InlineData(10, 100001, "Quantidade deve ser menor ou igual a 100000.")]
    public async Task CreateGift_ShouldReturnBadRequest_WhenValidationFails(decimal price, int quantity, string expectedDetail)
    {
        await _factory.ResetDatabaseAsync();
        var session = await CreateAuthenticatedUserSessionAsync();
        var eventId = await CreateEventAsync(session.Token);

        var response = await PostAuthorizedJsonAsync($"/api/events/{eventId}/gifts", new
        {
            name = "Liquidificador",
            description = "Cozinha",
            price,
            quantity
        }, session.Token);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ProblemDetails>(JsonOptions);
        Assert.NotNull(payload);
        Assert.Equal("Erro de validação", payload.Title);
        Assert.Equal(expectedDetail, payload.Detail);
    }

    private async Task<int> CreateGiftAsync(string token, int eventId, int quantity)
    {
        var response = await PostAuthorizedJsonAsync($"/api/events/{eventId}/gifts", new
        {
            name = "Jogo de pratos",
            description = "6 pecas",
            price = 299.90m,
            quantity
        }, token);

        response.EnsureSuccessStatusCode();

        var payload = await response.Content.ReadFromJsonAsync<GiftResponseContract>(JsonOptions);
        return payload!.Id;
    }

    private async Task CreateGuestAsync(string token, int eventId, string cpf)
    {
        var response = await PostAuthorizedJsonAsync($"/api/events/{eventId}/guests", new
        {
            cpf,
            name = "Convidado Teste",
            email = "convidado@weddingifts.local",
            phoneNumber = "11999990000"
        }, token);

        response.EnsureSuccessStatusCode();
    }

    private async Task<int> CreateEventAsync(string token, string? eventName = null)
    {
        var response = await PostAuthorizedJsonAsync("/api/events", new
        {
            name = eventName ?? "Casamento Teste",
            eventDate = DateTime.UtcNow.AddMonths(1)
        }, token);

        response.EnsureSuccessStatusCode();

        var payload = await response.Content.ReadFromJsonAsync<EventResponseContract>(JsonOptions);
        return payload!.Id;
    }

    private async Task<AuthSessionContract> CreateAuthenticatedUserSessionAsync()
    {
        var password = "123456";
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

        var createdUser = await createUserResponse.Content.ReadFromJsonAsync<UserResponseContract>(JsonOptions);

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
            UserId = createdUser!.Id,
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

    private async Task<HttpResponseMessage> PostAuthorizedJsonAsync(string url, object body, string token)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = JsonContent.Create(body)
        };

        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return await _client.SendAsync(request);
    }

    private sealed class AuthSessionContract
    {
        public int UserId { get; set; }
        public string Token { get; set; } = string.Empty;
    }

    private sealed class UserResponseContract
    {
        public int Id { get; set; }
    }

    private sealed class LoginResponseContract
    {
        public string Token { get; set; } = string.Empty;
    }

    private sealed class EventResponseContract
    {
        public int Id { get; set; }
    }

    private sealed class GiftResponseContract
    {
        public int Id { get; set; }
        public int ReservedQuantity { get; set; }
        public bool IsFullyReserved { get; set; }
        public string? ReservedBy { get; set; }
        public DateTime? ReservedAt { get; set; }
    }
}

















