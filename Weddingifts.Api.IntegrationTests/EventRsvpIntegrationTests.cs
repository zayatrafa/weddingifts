using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace Weddingifts.Api.IntegrationTests;

public sealed class EventRsvpIntegrationTests : IntegrationTestBase, IClassFixture<IntegrationTestWebApplicationFactory>
{
    public EventRsvpIntegrationTests(IntegrationTestWebApplicationFactory factory) : base(factory)
    {
    }

    [Fact]
    public async Task GetRsvp_ShouldReturnCurrentPendingState_WhenGuestBelongsToEvent()
    {
        await Factory.ResetDatabaseAsync();

        var session = await CreateAuthenticatedUserSessionAsync();
        var ev = await CreateRichEventAsync(session.Token);
        var guest = await CreateGuestAsync(session.Token, ev.Id, maxExtraGuests: 2);

        var response = await Client.GetAsync($"/api/events/{ev.Slug}/rsvp?guestCpf={guest.Cpf}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        using var document = JsonDocument.Parse(body);
        Assert.True(document.RootElement.TryGetProperty("hasCompletedInvitationFlow", out var hasCompletedProperty));
        Assert.False(hasCompletedProperty.GetBoolean());
        Assert.True(document.RootElement.TryGetProperty("invitationFlowCompletedAt", out var completedAtProperty));
        Assert.Equal(JsonValueKind.Null, completedAtProperty.ValueKind);

        var payload = JsonSerializer.Deserialize<EventGuestRsvpResponseContract>(body, JsonOptions);
        Assert.NotNull(payload);
        Assert.Equal(ev.Id, payload.EventId);
        Assert.Equal(ev.Slug, payload.EventSlug);
        Assert.Equal(guest.Id, payload.GuestId);
        Assert.Equal(guest.Cpf, payload.GuestCpf);
        Assert.Equal(guest.Name, payload.GuestName);
        Assert.Equal(2, payload.MaxExtraGuests);
        Assert.Equal("pending", payload.RsvpStatus);
        Assert.Null(payload.RsvpRespondedAt);
        Assert.False(payload.HasCompletedInvitationFlow);
        Assert.Null(payload.InvitationFlowCompletedAt);
        Assert.Empty(payload.Companions);
    }

    [Fact]
    public async Task ConfirmRsvp_ShouldReturnBadRequest_WhenCompanionCountExceedsLimit()
    {
        await Factory.ResetDatabaseAsync();

        var session = await CreateAuthenticatedUserSessionAsync();
        var ev = await CreateRichEventAsync(session.Token);
        var guest = await CreateGuestAsync(session.Token, ev.Id, maxExtraGuests: 1);

        var response = await Client.PostAsJsonAsync($"/api/events/{ev.Slug}/rsvp", new
        {
            guestCpf = guest.Cpf,
            status = "accepted",
            companions = new object[]
            {
                new { name = "Ana Silva", birthDate = new DateOnly(2020, 1, 10), cpf = (string?)null },
                new { name = "Bruno Costa", birthDate = new DateOnly(2021, 2, 11), cpf = (string?)null }
            }
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ProblemDetails>(JsonOptions);
        Assert.NotNull(payload);
        Assert.Equal("Erro de valida\u00E7\u00E3o", payload.Title);
        Assert.Equal("A quantidade de acompanhantes excede o limite permitido para este convidado.", payload.Detail);
    }

    [Fact]
    public async Task CompleteInvitationFlow_ShouldReturnBadRequest_WhenGuestCpfIsInvalid()
    {
        await Factory.ResetDatabaseAsync();

        var session = await CreateAuthenticatedUserSessionAsync();
        var ev = await CreateRichEventAsync(session.Token);

        var response = await CompleteInvitationFlowAsync(ev.Slug, "123");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ProblemDetails>(JsonOptions);
        Assert.NotNull(payload);
        Assert.Equal("Erro de valida\u00E7\u00E3o", payload.Title);
        Assert.Equal("CPF deve conter exatamente 11 d\u00EDgitos.", payload.Detail);
    }

    [Fact]
    public async Task CompleteInvitationFlow_ShouldReturnBadRequest_WhenGuestCpfIsNotInvited()
    {
        await Factory.ResetDatabaseAsync();

        var session = await CreateAuthenticatedUserSessionAsync();
        var ev = await CreateRichEventAsync(session.Token);

        var response = await CompleteInvitationFlowAsync(ev.Slug, GenerateUniqueCpf());

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ProblemDetails>(JsonOptions);
        Assert.NotNull(payload);
        Assert.Equal("Erro de valida\u00E7\u00E3o", payload.Title);
        Assert.Equal("Este CPF n\u00E3o est\u00E1 convidado para este evento.", payload.Detail);
    }

    [Fact]
    public async Task CompleteInvitationFlow_ShouldReturnBadRequest_WhenRsvpIsPending()
    {
        await Factory.ResetDatabaseAsync();

        var session = await CreateAuthenticatedUserSessionAsync();
        var ev = await CreateRichEventAsync(session.Token);
        var guest = await CreateGuestAsync(session.Token, ev.Id);

        var response = await CompleteInvitationFlowAsync(ev.Slug, guest.Cpf);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ProblemDetails>(JsonOptions);
        Assert.NotNull(payload);
        Assert.Equal("Erro de valida\u00E7\u00E3o", payload.Title);
        Assert.Equal("Para concluir o convite, confirme ou recuse sua presen\u00E7a primeiro.", payload.Detail);
    }

    [Fact]
    public async Task CompleteInvitationFlow_ShouldReturnOk_WhenRsvpIsAccepted()
    {
        await Factory.ResetDatabaseAsync();

        var session = await CreateAuthenticatedUserSessionAsync();
        var ev = await CreateRichEventAsync(session.Token);
        var guest = await CreateGuestAsync(session.Token, ev.Id);

        var confirmResponse = await Client.PostAsJsonAsync($"/api/events/{ev.Slug}/rsvp", new
        {
            guestCpf = guest.Cpf,
            status = "accepted"
        });

        Assert.Equal(HttpStatusCode.OK, confirmResponse.StatusCode);

        var response = await CompleteInvitationFlowAsync(ev.Slug, guest.Cpf);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<EventGuestRsvpResponseContract>(JsonOptions);
        Assert.NotNull(payload);
        Assert.Equal("accepted", payload.RsvpStatus);
        Assert.True(payload.HasCompletedInvitationFlow);
        Assert.NotNull(payload.InvitationFlowCompletedAt);

        var lookupResponse = await Client.GetAsync($"/api/events/{ev.Slug}/rsvp?guestCpf={guest.Cpf}");
        var lookupPayload = await lookupResponse.Content.ReadFromJsonAsync<EventGuestRsvpResponseContract>(JsonOptions);

        Assert.NotNull(lookupPayload);
        Assert.True(lookupPayload.HasCompletedInvitationFlow);
        Assert.Equal(payload.InvitationFlowCompletedAt, lookupPayload.InvitationFlowCompletedAt);
    }

    [Fact]
    public async Task CompleteInvitationFlow_ShouldReturnOk_WhenRsvpIsDeclined()
    {
        await Factory.ResetDatabaseAsync();

        var session = await CreateAuthenticatedUserSessionAsync();
        var ev = await CreateRichEventAsync(session.Token);
        var guest = await CreateGuestAsync(session.Token, ev.Id);

        var declineResponse = await Client.PostAsJsonAsync($"/api/events/{ev.Slug}/rsvp", new
        {
            guestCpf = guest.Cpf,
            status = "declined",
            messageToCouple = "N\u00E3o poderemos comparecer."
        });

        Assert.Equal(HttpStatusCode.OK, declineResponse.StatusCode);

        var response = await CompleteInvitationFlowAsync(ev.Slug, guest.Cpf);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<EventGuestRsvpResponseContract>(JsonOptions);
        Assert.NotNull(payload);
        Assert.Equal("declined", payload.RsvpStatus);
        Assert.True(payload.HasCompletedInvitationFlow);
        Assert.NotNull(payload.InvitationFlowCompletedAt);
    }

    [Fact]
    public async Task CompleteInvitationFlow_ShouldKeepOriginalTimestamp_WhenAlreadyCompleted()
    {
        await Factory.ResetDatabaseAsync();

        var session = await CreateAuthenticatedUserSessionAsync();
        var ev = await CreateRichEventAsync(session.Token);
        var guest = await CreateGuestAsync(session.Token, ev.Id);

        var confirmResponse = await Client.PostAsJsonAsync($"/api/events/{ev.Slug}/rsvp", new
        {
            guestCpf = guest.Cpf,
            status = "accepted"
        });

        Assert.Equal(HttpStatusCode.OK, confirmResponse.StatusCode);

        var firstResponse = await CompleteInvitationFlowAsync(ev.Slug, guest.Cpf);
        var firstPayload = await firstResponse.Content.ReadFromJsonAsync<EventGuestRsvpResponseContract>(JsonOptions);

        var secondResponse = await CompleteInvitationFlowAsync(ev.Slug, guest.Cpf);
        var secondPayload = await secondResponse.Content.ReadFromJsonAsync<EventGuestRsvpResponseContract>(JsonOptions);

        Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);
        Assert.Equal(HttpStatusCode.OK, secondResponse.StatusCode);
        Assert.NotNull(firstPayload);
        Assert.NotNull(secondPayload);
        Assert.True(secondPayload.HasCompletedInvitationFlow);
        Assert.Equal(firstPayload.InvitationFlowCompletedAt, secondPayload.InvitationFlowCompletedAt);
    }

    [Fact]
    public async Task ConfirmRsvp_ShouldRequireCompanionCpf_WhenAgeIs16OnEventLocalDate()
    {
        await Factory.ResetDatabaseAsync();

        var session = await CreateAuthenticatedUserSessionAsync();
        var ev = await CreateRichEventAsync(
            session.Token,
            eventDateTime: CreateEventDateTimeOffset(
                "America/Sao_Paulo",
                new DateTime(2030, 8, 10, 0, 30, 0, DateTimeKind.Unspecified)),
            timeZoneId: "America/Sao_Paulo");
        var guest = await CreateGuestAsync(session.Token, ev.Id, maxExtraGuests: 1);

        var response = await Client.PostAsJsonAsync($"/api/events/{ev.Slug}/rsvp", new
        {
            guestCpf = guest.Cpf,
            status = "accepted",
            companions = new object[]
            {
                new { name = "Ana Silva", birthDate = new DateOnly(2014, 8, 10), cpf = (string?)null }
            }
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ProblemDetails>(JsonOptions);
        Assert.NotNull(payload);
        Assert.Equal("Erro de valida\u00E7\u00E3o", payload.Title);
        Assert.Equal("CPF do acompanhante \u00E9 obrigat\u00F3rio para idade igual ou superior a 16 anos na data do evento.", payload.Detail);
    }

    [Fact]
    public async Task ConfirmRsvp_ShouldUseEventTimeZone_WhenEvaluatingCompanionAge()
    {
        await Factory.ResetDatabaseAsync();

        var session = await CreateAuthenticatedUserSessionAsync();
        var ev = await CreateRichEventAsync(
            session.Token,
            eventDateTime: CreateEventDateTimeOffset(
                "America/Rio_Branco",
                new DateTime(2030, 8, 9, 22, 30, 0, DateTimeKind.Unspecified)),
            timeZoneId: "America/Rio_Branco");
        var guest = await CreateGuestAsync(session.Token, ev.Id, maxExtraGuests: 1);

        var response = await Client.PostAsJsonAsync($"/api/events/{ev.Slug}/rsvp", new
        {
            guestCpf = guest.Cpf,
            status = "accepted",
            messageToCouple = "Nos vemos em breve.",
            dietaryRestrictions = "Vegetariano",
            companions = new object[]
            {
                new { name = "Ana Silva", birthDate = new DateOnly(2014, 8, 10), cpf = (string?)null }
            }
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<EventGuestRsvpResponseContract>(JsonOptions);
        Assert.NotNull(payload);
        Assert.Equal("accepted", payload.RsvpStatus);
        Assert.NotNull(payload.RsvpRespondedAt);
        Assert.Equal("Nos vemos em breve.", payload.MessageToCouple);
        Assert.Equal("Vegetariano", payload.DietaryRestrictions);
        Assert.Single(payload.Companions);
        Assert.Equal(new DateOnly(2014, 8, 10), payload.Companions[0].BirthDate);
        Assert.Null(payload.Companions[0].Cpf);
    }

    [Fact]
    public async Task UpdateRsvp_ShouldReturnOk_AndClearCompanionsWhenDeclined()
    {
        await Factory.ResetDatabaseAsync();

        var session = await CreateAuthenticatedUserSessionAsync();
        var ev = await CreateRichEventAsync(session.Token);
        var guest = await CreateGuestAsync(session.Token, ev.Id, maxExtraGuests: 1);

        var confirmResponse = await Client.PostAsJsonAsync($"/api/events/{ev.Slug}/rsvp", new
        {
            guestCpf = guest.Cpf,
            status = "accepted",
            messageToCouple = "Confirmado.",
            dietaryRestrictions = "Sem gluten",
            companions = new object[]
            {
                new { name = "Ana Silva", birthDate = new DateOnly(2020, 3, 15), cpf = (string?)null }
            }
        });

        Assert.Equal(HttpStatusCode.OK, confirmResponse.StatusCode);

        var updateResponse = await Client.PutAsJsonAsync($"/api/events/{ev.Slug}/rsvp", new
        {
            guestCpf = guest.Cpf,
            status = "declined",
            messageToCouple = "N\u00E3o conseguiremos comparecer.",
            dietaryRestrictions = "Ignorar",
            companions = Array.Empty<object>()
        });

        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

        var payload = await updateResponse.Content.ReadFromJsonAsync<EventGuestRsvpResponseContract>(JsonOptions);
        Assert.NotNull(payload);
        Assert.Equal("declined", payload.RsvpStatus);
        Assert.NotNull(payload.RsvpRespondedAt);
        Assert.Equal("N\u00E3o conseguiremos comparecer.", payload.MessageToCouple);
        Assert.Null(payload.DietaryRestrictions);
        Assert.Empty(payload.Companions);

        var getResponse = await Client.GetAsync($"/api/events/{ev.Slug}/rsvp?guestCpf={guest.Cpf}");
        var getPayload = await getResponse.Content.ReadFromJsonAsync<EventGuestRsvpResponseContract>(JsonOptions);

        Assert.NotNull(getPayload);
        Assert.Equal("declined", getPayload.RsvpStatus);
        Assert.Null(getPayload.DietaryRestrictions);
        Assert.Empty(getPayload.Companions);
    }

    [Fact]
    public async Task UpdateGuest_ShouldResetRsvpToPending_WhenMaxExtraGuestsIsReducedBelowSavedCompanions()
    {
        await Factory.ResetDatabaseAsync();

        var session = await CreateAuthenticatedUserSessionAsync();
        var ev = await CreateRichEventAsync(session.Token);
        var guest = await CreateGuestAsync(session.Token, ev.Id, maxExtraGuests: 1);

        var confirmResponse = await Client.PostAsJsonAsync($"/api/events/{ev.Slug}/rsvp", new
        {
            guestCpf = guest.Cpf,
            status = "accepted",
            messageToCouple = "Confirmado.",
            dietaryRestrictions = "Sem lactose",
            companions = new object[]
            {
                new { name = "Ana Silva", birthDate = new DateOnly(2020, 1, 20), cpf = (string?)null }
            }
        });

        Assert.Equal(HttpStatusCode.OK, confirmResponse.StatusCode);

        var updateGuestResponse = await PutAuthorizedJsonAsync($"/api/events/{ev.Id}/guests/{guest.Id}", new
        {
            name = guest.Name,
            email = guest.Email,
            phoneNumber = guest.PhoneNumber,
            maxExtraGuests = 0
        }, session.Token);

        Assert.Equal(HttpStatusCode.OK, updateGuestResponse.StatusCode);

        var payload = await updateGuestResponse.Content.ReadFromJsonAsync<EventGuestResponseContract>(JsonOptions);
        Assert.NotNull(payload);
        Assert.Equal(0, payload.MaxExtraGuests);
        Assert.Equal("pending", payload.RsvpStatus);
        Assert.Null(payload.RsvpRespondedAt);
        Assert.Null(payload.MessageToCouple);
        Assert.Null(payload.DietaryRestrictions);
        Assert.Empty(payload.Companions);
    }

    [Fact]
    public async Task UpdateEvent_ShouldResetRsvpToPending_WhenTemporalChangeMakesCpfRequired()
    {
        await Factory.ResetDatabaseAsync();

        var session = await CreateAuthenticatedUserSessionAsync();
        var ev = await CreateRichEventAsync(
            session.Token,
            eventDateTime: CreateEventDateTimeOffset(
                "America/Rio_Branco",
                new DateTime(2030, 8, 9, 22, 30, 0, DateTimeKind.Unspecified)),
            timeZoneId: "America/Rio_Branco");
        var guest = await CreateGuestAsync(session.Token, ev.Id, maxExtraGuests: 1);

        var confirmResponse = await Client.PostAsJsonAsync($"/api/events/{ev.Slug}/rsvp", new
        {
            guestCpf = guest.Cpf,
            status = "accepted",
            companions = new object[]
            {
                new { name = "Ana Silva", birthDate = new DateOnly(2014, 8, 10), cpf = (string?)null }
            }
        });

        Assert.Equal(HttpStatusCode.OK, confirmResponse.StatusCode);

        var updateEventResponse = await PutAuthorizedJsonAsync($"/api/events/{ev.Id}", new
        {
            name = ev.Name,
            hostNames = ev.HostNames,
            eventDateTime = CreateEventDateTimeOffset(
                "America/Sao_Paulo",
                new DateTime(2030, 8, 10, 0, 30, 0, DateTimeKind.Unspecified)),
            timeZoneId = "America/Sao_Paulo",
            locationName = ev.LocationName,
            locationAddress = ev.LocationAddress,
            locationMapsUrl = ev.LocationMapsUrl,
            ceremonyInfo = ev.CeremonyInfo,
            dressCode = ev.DressCode,
            coverImageUrl = ev.CoverImageUrl
        }, session.Token);

        Assert.Equal(HttpStatusCode.OK, updateEventResponse.StatusCode);

        var rsvpResponse = await Client.GetAsync($"/api/events/{ev.Slug}/rsvp?guestCpf={guest.Cpf}");
        var payload = await rsvpResponse.Content.ReadFromJsonAsync<EventGuestRsvpResponseContract>(JsonOptions);

        Assert.NotNull(payload);
        Assert.Equal("pending", payload.RsvpStatus);
        Assert.Null(payload.RsvpRespondedAt);
        Assert.Null(payload.MessageToCouple);
        Assert.Null(payload.DietaryRestrictions);
        Assert.Empty(payload.Companions);
    }

    [Fact]
    public async Task UpdateEvent_ShouldClearInvitationCompletion_WhenTemporalChangeResetsRsvp()
    {
        await Factory.ResetDatabaseAsync();

        var session = await CreateAuthenticatedUserSessionAsync();
        var ev = await CreateRichEventAsync(
            session.Token,
            eventDateTime: CreateEventDateTimeOffset(
                "America/Rio_Branco",
                new DateTime(2030, 8, 9, 22, 30, 0, DateTimeKind.Unspecified)),
            timeZoneId: "America/Rio_Branco");
        var guest = await CreateGuestAsync(session.Token, ev.Id, maxExtraGuests: 1);

        var confirmResponse = await Client.PostAsJsonAsync($"/api/events/{ev.Slug}/rsvp", new
        {
            guestCpf = guest.Cpf,
            status = "accepted",
            companions = new object[]
            {
                new { name = "Ana Silva", birthDate = new DateOnly(2014, 8, 10), cpf = (string?)null }
            }
        });

        Assert.Equal(HttpStatusCode.OK, confirmResponse.StatusCode);

        var completeResponse = await CompleteInvitationFlowAsync(ev.Slug, guest.Cpf);
        var completePayload = await completeResponse.Content.ReadFromJsonAsync<EventGuestRsvpResponseContract>(JsonOptions);

        Assert.Equal(HttpStatusCode.OK, completeResponse.StatusCode);
        Assert.NotNull(completePayload);
        Assert.True(completePayload.HasCompletedInvitationFlow);
        Assert.NotNull(completePayload.InvitationFlowCompletedAt);

        var updateEventResponse = await PutAuthorizedJsonAsync($"/api/events/{ev.Id}", new
        {
            name = ev.Name,
            hostNames = ev.HostNames,
            eventDateTime = CreateEventDateTimeOffset(
                "America/Sao_Paulo",
                new DateTime(2030, 8, 10, 0, 30, 0, DateTimeKind.Unspecified)),
            timeZoneId = "America/Sao_Paulo",
            locationName = ev.LocationName,
            locationAddress = ev.LocationAddress,
            locationMapsUrl = ev.LocationMapsUrl,
            ceremonyInfo = ev.CeremonyInfo,
            dressCode = ev.DressCode,
            coverImageUrl = ev.CoverImageUrl
        }, session.Token);

        Assert.Equal(HttpStatusCode.OK, updateEventResponse.StatusCode);

        var rsvpResponse = await Client.GetAsync($"/api/events/{ev.Slug}/rsvp?guestCpf={guest.Cpf}");
        var payload = await rsvpResponse.Content.ReadFromJsonAsync<EventGuestRsvpResponseContract>(JsonOptions);

        Assert.NotNull(payload);
        Assert.Equal("pending", payload.RsvpStatus);
        Assert.False(payload.HasCompletedInvitationFlow);
        Assert.Null(payload.InvitationFlowCompletedAt);
    }
}
