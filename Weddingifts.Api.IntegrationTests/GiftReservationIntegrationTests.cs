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
        Assert.Equal("Forbidden", payload.Title);
        Assert.Equal("You do not have permission to modify this event.", payload.Detail);
    }

    [Fact]
    public async Task ReserveGift_ShouldReturnOk_WhenGiftHasAvailability()
    {
        await _factory.ResetDatabaseAsync();
        var giftId = await CreateGiftAsync(quantity: 2);

        var response = await _client.PostAsJsonAsync($"/api/gifts/{giftId}/reserve", new { guestName = "Carlos" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<GiftResponseContract>(JsonOptions);
        Assert.NotNull(payload);
        Assert.Equal(1, payload.ReservedQuantity);
        Assert.Equal("Carlos", payload.ReservedBy);
        Assert.False(payload.IsFullyReserved);
    }

    [Fact]
    public async Task ReserveGift_ShouldReturnBadRequest_WhenGiftIsFullyReserved()
    {
        await _factory.ResetDatabaseAsync();
        var giftId = await CreateGiftAsync(quantity: 1);

        await _client.PostAsJsonAsync($"/api/gifts/{giftId}/reserve", new { guestName = "Ana" });
        var response = await _client.PostAsJsonAsync($"/api/gifts/{giftId}/reserve", new { guestName = "Bruno" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ProblemDetails>(JsonOptions);
        Assert.NotNull(payload);
        Assert.Equal("Validation error", payload.Title);
        Assert.Equal("Gift is already fully reserved.", payload.Detail);
    }

    [Fact]
    public async Task UnreserveGift_ShouldReturnOk_WhenGiftHasReservation()
    {
        await _factory.ResetDatabaseAsync();
        var giftId = await CreateGiftAsync(quantity: 1);

        await _client.PostAsJsonAsync($"/api/gifts/{giftId}/reserve", new { guestName = "Marina" });
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
        var giftId = await CreateGiftAsync(quantity: 1);

        var response = await _client.PostAsync($"/api/gifts/{giftId}/unreserve", content: null);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ProblemDetails>(JsonOptions);
        Assert.NotNull(payload);
        Assert.Equal("Validation error", payload.Title);
        Assert.Equal("Gift has no active reservation.", payload.Detail);
    }

    [Theory]
    [InlineData(-1, 1, "Price must be greater than or equal to zero.")]
    [InlineData(10, 0, "Quantity must be greater than or equal to 1.")]
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
        Assert.Equal("Validation error", payload.Title);
        Assert.Equal(expectedDetail, payload.Detail);
    }

    private async Task<int> CreateGiftAsync(int quantity)
    {
        var session = await CreateAuthenticatedUserSessionAsync();
        var eventId = await CreateEventAsync(session.Token);

        var response = await PostAuthorizedJsonAsync($"/api/events/{eventId}/gifts", new
        {
            name = "Jogo de pratos",
            description = "6 pecas",
            price = 299.90m,
            quantity
        }, session.Token);

        response.EnsureSuccessStatusCode();

        var payload = await response.Content.ReadFromJsonAsync<GiftResponseContract>(JsonOptions);
        return payload!.Id;
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

        var createUserResponse = await _client.PostAsJsonAsync("/api/users", new
        {
            name = "Usuario Teste",
            email,
            password
        });

        createUserResponse.EnsureSuccessStatusCode();

        var createdUser = await createUserResponse.Content.ReadFromJsonAsync<UserResponseContract>(JsonOptions);

        var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            email,
            password
        });

        loginResponse.EnsureSuccessStatusCode();

        var loginPayload = await loginResponse.Content.ReadFromJsonAsync<LoginResponseContract>(JsonOptions);

        return new AuthSessionContract
        {
            UserId = createdUser!.Id,
            Token = loginPayload!.Token
        };
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
