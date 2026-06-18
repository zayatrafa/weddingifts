using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace Weddingifts.Api.IntegrationTests;

public sealed class EventIntegrationTests : IntegrationTestBase, IClassFixture<IntegrationTestWebApplicationFactory>
{
    public EventIntegrationTests(IntegrationTestWebApplicationFactory factory) : base(factory)
    {
    }

    [Fact]
    public async Task CreateEvent_ShouldReturnCreated_WhenAuthenticatedAndPayloadIsValid()
    {
        await Factory.ResetDatabaseAsync();

        var session = await CreateAuthenticatedUserSessionAsync();
        var eventDate = DateTime.UtcNow.AddMonths(2);

        var response = await PostAuthorizedJsonAsync("/api/events", new
        {
            name = "Casamento Primavera",
            eventDate
        }, session.Token);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<EventResponseContract>(JsonOptions);

        Assert.NotNull(payload);
        Assert.True(payload.Id > 0);
        Assert.Equal(session.UserId, payload.UserId);
        Assert.Equal("Casamento Primavera", payload.Name);
        Assert.Equal(DateTime.SpecifyKind(eventDate.Date, DateTimeKind.Utc), payload.EventDate);
        Assert.Equal("Casamento Primavera", payload.HostNames);
        Assert.Equal("America/Sao_Paulo", payload.TimeZoneId);
        Assert.Equal(string.Empty, payload.InvitationMessage);
        Assert.Equal(string.Empty, payload.FoodInfo);
        Assert.Equal(string.Empty, payload.ScheduleInfo);
        Assert.Empty(payload.GalleryImageUrls);
        Assert.False(string.IsNullOrWhiteSpace(payload.Slug));
        Assert.Empty(payload.Gifts);
        Assert.Equal(0, payload.GuestCount);
        Assert.Null(payload.StatusSummary);
    }

    [Fact]
    public async Task CreateEvent_ShouldReturnUnauthorized_WhenNoToken()
    {
        await Factory.ResetDatabaseAsync();

        var response = await Client.PostAsJsonAsync("/api/events", new
        {
            name = "Casamento Sem Token",
            eventDate = DateTime.UtcNow.AddMonths(1)
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task CreateEvent_ShouldReturnBadRequest_WhenEventDateIsNotFuture()
    {
        await Factory.ResetDatabaseAsync();

        var session = await CreateAuthenticatedUserSessionAsync();

        var response = await PostAuthorizedJsonAsync("/api/events", new
        {
            name = "Casamento Inv\u00E1lido",
            eventDate = GetCurrentLegacyEventDateRequestValue()
        }, session.Token);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ProblemDetails>(JsonOptions);
        Assert.NotNull(payload);
        Assert.Equal("Erro de valida\u00E7\u00E3o", payload.Title);
        Assert.Equal("A data do evento deve ser futura.", payload.Detail);
    }

    [Fact]
    public async Task CreateEvent_ShouldReturnCreated_WithInvitationMessage()
    {
        await Factory.ResetDatabaseAsync();

        var session = await CreateAuthenticatedUserSessionAsync();

        var response = await PostAuthorizedJsonAsync("/api/events", new
        {
            name = "Casamento com Convite",
            eventDate = DateTime.UtcNow.AddMonths(2),
            invitationMessage = "Venha celebrar este dia especial com a gente."
        }, session.Token);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<EventResponseContract>(JsonOptions);

        Assert.NotNull(payload);
        Assert.Equal("Casamento com Convite", payload.Name);
        Assert.Equal("Venha celebrar este dia especial com a gente.", payload.InvitationMessage);
    }

    [Fact]
    public async Task UpdateEvent_ShouldReturnOk_WithInvitationMessage()
    {
        await Factory.ResetDatabaseAsync();

        var session = await CreateAuthenticatedUserSessionAsync();
        var createdEvent = await CreateEventAsync(session.Token);

        var response = await PutAuthorizedJsonAsync($"/api/events/{createdEvent.Id}", new
        {
            name = "Casamento Atualizado",
            eventDate = DateTime.UtcNow.AddMonths(4),
            invitationMessage = "Atualizamos nosso convite para voce."
        }, session.Token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<EventResponseContract>(JsonOptions);
        Assert.NotNull(payload);
        Assert.Equal(createdEvent.Id, payload.Id);
        Assert.Equal("Atualizamos nosso convite para voce.", payload.InvitationMessage);
    }

    [Fact]
    public async Task UpdateEvent_ShouldReturnOk_WhenEventBelongsToAuthenticatedUser()
    {
        await Factory.ResetDatabaseAsync();

        var session = await CreateAuthenticatedUserSessionAsync();
        var createdEvent = await CreateEventAsync(session.Token);
        var updatedDate = DateTime.UtcNow.AddMonths(3);

        var response = await PutAuthorizedJsonAsync($"/api/events/{createdEvent.Id}", new
        {
            name = "Casamento Atualizado",
            eventDate = updatedDate
        }, session.Token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<EventResponseContract>(JsonOptions);
        Assert.NotNull(payload);
        Assert.Equal(createdEvent.Id, payload.Id);
        Assert.Equal("Casamento Atualizado", payload.Name);
        Assert.Equal(DateTime.SpecifyKind(updatedDate.Date, DateTimeKind.Utc), payload.EventDate);
        Assert.Equal(createdEvent.Slug, payload.Slug);
    }

    [Fact]
    public async Task CreateEvent_ShouldReturnCreated_WithEnrichedFieldsAndTimeZone()
    {
        await Factory.ResetDatabaseAsync();

        var session = await CreateAuthenticatedUserSessionAsync();
        var eventDateTime = CreateEventDateTimeOffset(
            "America/Manaus",
            new DateTime(2030, 8, 10, 19, 30, 0, DateTimeKind.Unspecified));

        var response = await PostAuthorizedJsonAsync("/api/events", new
        {
            name = "Casamento Enriquecido",
            hostNames = "Ana e Bruno",
            eventDateTime,
            timeZoneId = "America/Manaus",
            locationName = "Solar das Aguas",
            locationAddress = "Av. das Palmeiras, 500",
            locationMapsUrl = "https://maps.example.com/solar-das-aguas",
            ceremonyInfo = "Cerimonia ao por do sol.",
            dressCode = "Social",
            coverImageUrl = "https://images.example.com/casamento-enriquecido.jpg",
            foodInfo = "Jantar, sobremesas e bebidas sem alcool.",
            scheduleInfo = "Recepcao as 19h30 e pista de danca as 22h.",
            galleryImageUrls = new[]
            {
                "https://images.example.com/galeria/entrada.jpg",
                "https://images.example.com/galeria/salao.jpg"
            }
        }, session.Token);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<EventResponseContract>(JsonOptions);

        Assert.NotNull(payload);
        Assert.Equal("Casamento Enriquecido", payload.Name);
        Assert.Equal("Ana e Bruno", payload.HostNames);
        Assert.Equal("America/Manaus", payload.TimeZoneId);
        Assert.Equal(eventDateTime.UtcDateTime, payload.EventDateTime);
        Assert.Equal("Solar das Aguas", payload.LocationName);
        Assert.Equal("Av. das Palmeiras, 500", payload.LocationAddress);
        Assert.Equal("https://maps.example.com/solar-das-aguas", payload.LocationMapsUrl);
        Assert.Equal("Cerimonia ao por do sol.", payload.CeremonyInfo);
        Assert.Equal("Social", payload.DressCode);
        Assert.Equal("https://images.example.com/casamento-enriquecido.jpg", payload.CoverImageUrl);
        Assert.Equal("Jantar, sobremesas e bebidas sem alcool.", payload.FoodInfo);
        Assert.Equal("Recepcao as 19h30 e pista de danca as 22h.", payload.ScheduleInfo);
        Assert.Equal(new[]
        {
            "https://images.example.com/galeria/entrada.jpg",
            "https://images.example.com/galeria/salao.jpg"
        }, payload.GalleryImageUrls);
    }

    [Fact]
    public async Task CreateEvent_ShouldReturnCreated_WithRequiredEnrichedFieldsAndDateOnly()
    {
        await Factory.ResetDatabaseAsync();

        var session = await CreateAuthenticatedUserSessionAsync();
        var eventDate = new DateTime(2030, 8, 10);
        var expectedEventDateTime = CreateEventDateTimeOffset(
            "America/Manaus",
            new DateTime(2030, 8, 10, 12, 0, 0, DateTimeKind.Unspecified));

        var response = await PostAuthorizedJsonAsync("/api/events", new
        {
            name = "Casamento Minimo",
            hostNames = "Ana e Bruno",
            eventDate,
            timeZoneId = "America/Manaus"
        }, session.Token);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<EventResponseContract>(JsonOptions);

        Assert.NotNull(payload);
        Assert.Equal("Casamento Minimo", payload.Name);
        Assert.Equal("Ana e Bruno", payload.HostNames);
        Assert.Equal(DateTime.SpecifyKind(eventDate.Date, DateTimeKind.Utc), payload.EventDate);
        Assert.Equal(expectedEventDateTime.UtcDateTime, payload.EventDateTime);
        Assert.Equal("America/Manaus", payload.TimeZoneId);
        Assert.Equal(string.Empty, payload.LocationName);
        Assert.Equal(string.Empty, payload.LocationAddress);
        Assert.Equal(string.Empty, payload.LocationMapsUrl);
        Assert.Equal(string.Empty, payload.CeremonyInfo);
        Assert.Equal(string.Empty, payload.DressCode);
    }

    [Fact]
    public async Task CreateEvent_ShouldReturnBadRequest_WhenGalleryImageUrlIsInvalid()
    {
        await Factory.ResetDatabaseAsync();

        var session = await CreateAuthenticatedUserSessionAsync();
        var eventDateTime = CreateEventDateTimeOffset(
            "America/Sao_Paulo",
            new DateTime(2030, 9, 12, 17, 0, 0, DateTimeKind.Unspecified));

        var response = await PostAuthorizedJsonAsync("/api/events", new
        {
            name = "Casamento Galeria Invalida",
            hostNames = "Clara e Daniel",
            eventDateTime,
            timeZoneId = "America/Sao_Paulo",
            locationName = "Casa Jardim",
            locationAddress = "Rua Central, 100",
            locationMapsUrl = "https://maps.example.com/casa-jardim",
            ceremonyInfo = "Recepcao no jardim.",
            dressCode = "Passeio completo",
            galleryImageUrls = new[] { "ftp://images.example.com/foto.jpg" }
        }, session.Token);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ProblemDetails>(JsonOptions);
        Assert.NotNull(payload);
        Assert.Equal("Erro de valida\u00E7\u00E3o", payload.Title);
        Assert.Contains("galeria", payload.Detail, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CreateEvent_ShouldReturnCreated_WithEnrichedFieldsAndBlankCoverImageUrl()
    {
        await Factory.ResetDatabaseAsync();

        var session = await CreateAuthenticatedUserSessionAsync();
        var eventDateTime = CreateEventDateTimeOffset(
            "America/Sao_Paulo",
            new DateTime(2030, 9, 12, 17, 0, 0, DateTimeKind.Unspecified));

        var response = await PostAuthorizedJsonAsync("/api/events", new
        {
            name = "Casamento Sem Capa",
            hostNames = "Clara e Daniel",
            eventDateTime,
            timeZoneId = "America/Sao_Paulo",
            locationName = "Casa Jardim",
            locationAddress = "Rua Central, 100",
            locationMapsUrl = "https://maps.example.com/casa-jardim",
            ceremonyInfo = "Recepcao no jardim.",
            dressCode = "Passeio completo",
            coverImageUrl = " "
        }, session.Token);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<EventResponseContract>(JsonOptions);

        Assert.NotNull(payload);
        Assert.Equal("Casamento Sem Capa", payload.Name);
        Assert.Equal(string.Empty, payload.CoverImageUrl);
    }

    [Fact]
    public async Task UpdateEvent_ShouldReturnOk_WithBlankCoverImageUrl()
    {
        await Factory.ResetDatabaseAsync();

        var session = await CreateAuthenticatedUserSessionAsync();
        var createdEvent = await CreateRichEventAsync(session.Token);
        var eventDateTime = CreateEventDateTimeOffset(
            createdEvent.TimeZoneId,
            new DateTime(2030, 10, 20, 18, 30, 0, DateTimeKind.Unspecified));

        var response = await PutAuthorizedJsonAsync($"/api/events/{createdEvent.Id}", new
        {
            name = createdEvent.Name,
            hostNames = createdEvent.HostNames,
            eventDateTime,
            timeZoneId = createdEvent.TimeZoneId,
            locationName = createdEvent.LocationName,
            locationAddress = createdEvent.LocationAddress,
            locationMapsUrl = createdEvent.LocationMapsUrl,
            ceremonyInfo = createdEvent.CeremonyInfo,
            dressCode = createdEvent.DressCode,
            coverImageUrl = "",
            foodInfo = "Buffet atualizado.",
            scheduleInfo = "Cerimonia e recepcao no mesmo espaco.",
            galleryImageUrls = new[] { "https://images.example.com/foto-atualizada.jpg" }
        }, session.Token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<EventResponseContract>(JsonOptions);
        Assert.NotNull(payload);
        Assert.Equal(string.Empty, payload.CoverImageUrl);
        Assert.Equal("Buffet atualizado.", payload.FoodInfo);
        Assert.Equal("Cerimonia e recepcao no mesmo espaco.", payload.ScheduleInfo);
        Assert.Equal(new[] { "https://images.example.com/foto-atualizada.jpg" }, payload.GalleryImageUrls);
    }

    [Fact]
    public async Task UpdateEvent_ShouldReturnNotFound_WhenEventBelongsToAnotherUser()
    {
        await Factory.ResetDatabaseAsync();

        var owner = await CreateAuthenticatedUserSessionAsync();
        var intruder = await CreateAuthenticatedUserSessionAsync();
        var ownerEvent = await CreateEventAsync(owner.Token);

        var response = await PutAuthorizedJsonAsync($"/api/events/{ownerEvent.Id}", new
        {
            name = "Tentativa Indevida",
            eventDate = DateTime.UtcNow.AddMonths(4)
        }, intruder.Token);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ProblemDetails>(JsonOptions);
        Assert.NotNull(payload);
        Assert.Equal("Recurso n\u00E3o encontrado", payload.Title);
        Assert.Equal("Evento n\u00E3o encontrado.", payload.Detail);
    }

    [Fact]
    public async Task DeleteEvent_ShouldReturnNoContent_AndRemoveEventFromMine_WhenEventBelongsToAuthenticatedUser()
    {
        await Factory.ResetDatabaseAsync();

        var session = await CreateAuthenticatedUserSessionAsync();
        var createdEvent = await CreateEventAsync(session.Token, "Evento para Excluir");

        var deleteResponse = await DeleteAuthorizedAsync($"/api/events/{createdEvent.Id}", session.Token);

        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var mineResponse = await GetAuthorizedAsync("/api/events/mine", session.Token);

        Assert.Equal(HttpStatusCode.OK, mineResponse.StatusCode);

        var payload = await mineResponse.Content.ReadFromJsonAsync<List<EventResponseContract>>(JsonOptions);
        Assert.NotNull(payload);
        Assert.DoesNotContain(payload, ev => ev.Id == createdEvent.Id);
    }

    [Fact]
    public async Task GetMyEvents_ShouldReturnStatusSummary_WithGuestAndGiftCounters()
    {
        await Factory.ResetDatabaseAsync();

        var session = await CreateAuthenticatedUserSessionAsync();
        var emptyEvent = await CreateRichEventAsync(session.Token, "Evento Sem Dados");
        var eventWithSummary = await CreateRichEventAsync(session.Token, "Evento Com Resumo");

        var acceptedGuest = await CreateGuestAsync(session.Token, eventWithSummary.Id, name: "Convidado Confirmado", maxExtraGuests: 2);
        var declinedGuest = await CreateGuestAsync(session.Token, eventWithSummary.Id, name: "Convidado Recusado");
        await CreateGuestAsync(session.Token, eventWithSummary.Id, name: "Convidado Pendente");

        var acceptedRsvpResponse = await Client.PostAsJsonAsync($"/api/events/{eventWithSummary.Slug}/rsvp", new
        {
            guestCpf = acceptedGuest.Cpf,
            status = "accepted",
            companions = new object[]
            {
                new { name = "Acompanhante Um", birthDate = new DateOnly(2018, 1, 10), cpf = (string?)null },
                new { name = "Acompanhante Dois", birthDate = new DateOnly(2019, 2, 20), cpf = (string?)null }
            }
        });
        Assert.Equal(HttpStatusCode.OK, acceptedRsvpResponse.StatusCode);

        var declinedRsvpResponse = await Client.PostAsJsonAsync($"/api/events/{eventWithSummary.Slug}/rsvp", new
        {
            guestCpf = declinedGuest.Cpf,
            status = "declined"
        });
        Assert.Equal(HttpStatusCode.OK, declinedRsvpResponse.StatusCode);

        var reservedGift = await CreateGiftAsync(session.Token, eventWithSummary.Id, quantity: 1);
        var partialGift = await CreateGiftAsync(session.Token, eventWithSummary.Id, name: "Presente Parcial", quantity: 2);

        await Client.PostAsJsonAsync($"/api/gifts/{reservedGift.Id}/reserve", new { guestCpf = acceptedGuest.Cpf });
        await Client.PostAsJsonAsync($"/api/gifts/{partialGift.Id}/reserve", new { guestCpf = declinedGuest.Cpf });

        var mineResponse = await GetAuthorizedAsync("/api/events/mine", session.Token);

        Assert.Equal(HttpStatusCode.OK, mineResponse.StatusCode);

        var payload = await mineResponse.Content.ReadFromJsonAsync<List<EventResponseContract>>(JsonOptions);
        Assert.NotNull(payload);

        var emptySummary = Assert.Single(payload, ev => ev.Id == emptyEvent.Id).StatusSummary;
        Assert.NotNull(emptySummary);
        Assert.Equal(0, emptySummary.ConfirmedGuestCount);
        Assert.Equal(0, emptySummary.DeclinedGuestCount);
        Assert.Equal(0, emptySummary.PendingGuestCount);
        Assert.Equal(0, emptySummary.CompanionCount);
        Assert.Equal(0, emptySummary.ReservedGiftCount);
        Assert.Equal(0, emptySummary.AvailableGiftCount);
        Assert.Equal(0m, emptySummary.TotalRaisedAmount);

        var summary = Assert.Single(payload, ev => ev.Id == eventWithSummary.Id).StatusSummary;
        Assert.NotNull(summary);
        Assert.Equal(1, summary.ConfirmedGuestCount);
        Assert.Equal(1, summary.DeclinedGuestCount);
        Assert.Equal(1, summary.PendingGuestCount);
        Assert.Equal(2, summary.CompanionCount);
        Assert.Equal(2, summary.ReservedGiftCount);
        Assert.Equal(1, summary.AvailableGiftCount);
        Assert.Equal(599.80m, summary.TotalRaisedAmount);

        var publicResponse = await Client.GetAsync($"/api/events/{eventWithSummary.Slug}");
        var publicBody = await publicResponse.Content.ReadAsStringAsync();
        using var publicDocument = JsonDocument.Parse(publicBody);
        Assert.False(publicDocument.RootElement.TryGetProperty("statusSummary", out _));
    }

    [Fact]
    public async Task DeleteEvent_ShouldReturnNotFound_WhenEventBelongsToAnotherUser()
    {
        await Factory.ResetDatabaseAsync();

        var owner = await CreateAuthenticatedUserSessionAsync();
        var intruder = await CreateAuthenticatedUserSessionAsync();
        var ownerEvent = await CreateEventAsync(owner.Token);

        var response = await DeleteAuthorizedAsync($"/api/events/{ownerEvent.Id}", intruder.Token);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ProblemDetails>(JsonOptions);
        Assert.NotNull(payload);
        Assert.Equal("Recurso n\u00E3o encontrado", payload.Title);
        Assert.Equal("Evento n\u00E3o encontrado.", payload.Detail);
    }
}
