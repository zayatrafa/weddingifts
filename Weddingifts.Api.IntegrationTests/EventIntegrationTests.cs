using System.Net;
using System.Net.Http.Json;
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
        Assert.Equal(eventDate, payload.EventDate);
        Assert.False(string.IsNullOrWhiteSpace(payload.Slug));
        Assert.Empty(payload.Gifts);
        Assert.Equal(0, payload.GuestCount);
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
            name = "Casamento Inválido",
            eventDate = DateTime.UtcNow.Date
        }, session.Token);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ProblemDetails>(JsonOptions);
        Assert.NotNull(payload);
        Assert.Equal("Erro de validação", payload.Title);
        Assert.Equal("A data do evento deve ser futura.", payload.Detail);
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
        Assert.Equal(updatedDate, payload.EventDate);
        Assert.Equal(createdEvent.Slug, payload.Slug);
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
        Assert.Equal("Recurso não encontrado", payload.Title);
        Assert.Equal("Evento não encontrado.", payload.Detail);
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
        Assert.Equal("Recurso não encontrado", payload.Title);
        Assert.Equal("Evento não encontrado.", payload.Detail);
    }
}
