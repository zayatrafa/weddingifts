using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace Weddingifts.Api.IntegrationTests;

public sealed class EventGuestIntegrationTests : IntegrationTestBase, IClassFixture<IntegrationTestWebApplicationFactory>
{
    public EventGuestIntegrationTests(IntegrationTestWebApplicationFactory factory) : base(factory)
    {
    }

    [Fact]
    public async Task CreateGuest_ShouldReturnCreated_WhenAuthenticatedAndPayloadIsValid()
    {
        await Factory.ResetDatabaseAsync();

        var session = await CreateAuthenticatedUserSessionAsync();
        var ev = await CreateEventAsync(session.Token);
        var cpf = GenerateUniqueCpf();

        var response = await PostAuthorizedJsonAsync($"/api/events/{ev.Id}/guests", new
        {
            cpf,
            name = "Ana Souza",
            email = $"ana-{Guid.NewGuid():N}@weddingifts.local",
            phoneNumber = "(11) 99888-7766"
        }, session.Token);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<EventGuestResponseContract>(JsonOptions);

        Assert.NotNull(payload);
        Assert.True(payload.Id > 0);
        Assert.Equal(ev.Id, payload.EventId);
        Assert.Equal(cpf, payload.Cpf);
        Assert.Equal("Ana Souza", payload.Name);
        Assert.Equal("11998887766", payload.PhoneNumber);
    }

    [Fact]
    public async Task CreateGuest_ShouldReturnUnauthorized_WhenNoToken()
    {
        await Factory.ResetDatabaseAsync();

        var session = await CreateAuthenticatedUserSessionAsync();
        var ev = await CreateEventAsync(session.Token);

        var response = await Client.PostAsJsonAsync($"/api/events/{ev.Id}/guests", new
        {
            cpf = GenerateUniqueCpf(),
            name = "Sem Token",
            email = $"guest-{Guid.NewGuid():N}@weddingifts.local",
            phoneNumber = "11999990000"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task CreateGuest_ShouldReturnBadRequest_WhenCpfAlreadyExistsInEvent()
    {
        await Factory.ResetDatabaseAsync();

        var session = await CreateAuthenticatedUserSessionAsync();
        var ev = await CreateEventAsync(session.Token);
        var cpf = GenerateUniqueCpf();

        await CreateGuestAsync(session.Token, ev.Id, cpf: cpf, email: $"primeiro-{Guid.NewGuid():N}@weddingifts.local");

        var response = await PostAuthorizedJsonAsync($"/api/events/{ev.Id}/guests", new
        {
            cpf,
            name = "Convidado Duplicado",
            email = $"segundo-{Guid.NewGuid():N}@weddingifts.local",
            phoneNumber = "11999990000"
        }, session.Token);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ProblemDetails>(JsonOptions);
        Assert.NotNull(payload);
        Assert.Equal("Erro de validação", payload.Title);
        Assert.Equal("Já existe convidado com este CPF neste evento.", payload.Detail);
    }

    [Fact]
    public async Task GetGuests_ShouldReturnOk_WhenEventBelongsToAuthenticatedUser()
    {
        await Factory.ResetDatabaseAsync();

        var session = await CreateAuthenticatedUserSessionAsync();
        var ev = await CreateEventAsync(session.Token);

        var guestA = await CreateGuestAsync(session.Token, ev.Id, name: "Beatriz Lima");
        var guestB = await CreateGuestAsync(session.Token, ev.Id, name: "Carlos Souza");

        var response = await GetAuthorizedAsync($"/api/events/{ev.Id}/guests", session.Token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<List<EventGuestResponseContract>>(JsonOptions);

        Assert.NotNull(payload);
        Assert.Equal(2, payload.Count);
        Assert.Contains(payload, guest => guest.Id == guestA.Id);
        Assert.Contains(payload, guest => guest.Id == guestB.Id);
    }

    [Fact]
    public async Task UpdateGuest_ShouldReturnOk_WhenGuestBelongsToAuthenticatedUserEvent()
    {
        await Factory.ResetDatabaseAsync();

        var session = await CreateAuthenticatedUserSessionAsync();
        var ev = await CreateEventAsync(session.Token);
        var guest = await CreateGuestAsync(session.Token, ev.Id);

        var response = await PutAuthorizedJsonAsync($"/api/events/{ev.Id}/guests/{guest.Id}", new
        {
            name = "Convidado Atualizado",
            email = $"atualizado-{Guid.NewGuid():N}@weddingifts.local",
            phoneNumber = "(11) 97777-6655"
        }, session.Token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<EventGuestResponseContract>(JsonOptions);
        Assert.NotNull(payload);
        Assert.Equal(guest.Id, payload.Id);
        Assert.Equal("Convidado Atualizado", payload.Name);
        Assert.Equal("11977776655", payload.PhoneNumber);
    }

    [Fact]
    public async Task UpdateGuest_ShouldReturnBadRequest_WhenEmailAlreadyExistsInEvent()
    {
        await Factory.ResetDatabaseAsync();

        var session = await CreateAuthenticatedUserSessionAsync();
        var ev = await CreateEventAsync(session.Token);
        var guestA = await CreateGuestAsync(session.Token, ev.Id, email: $"a-{Guid.NewGuid():N}@weddingifts.local");
        var guestB = await CreateGuestAsync(session.Token, ev.Id, email: $"b-{Guid.NewGuid():N}@weddingifts.local");

        var response = await PutAuthorizedJsonAsync($"/api/events/{ev.Id}/guests/{guestB.Id}", new
        {
            name = guestB.Name,
            email = guestA.Email,
            phoneNumber = guestB.PhoneNumber
        }, session.Token);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ProblemDetails>(JsonOptions);
        Assert.NotNull(payload);
        Assert.Equal("Erro de validação", payload.Title);
        Assert.Equal("Já existe convidado com este e-mail neste evento.", payload.Detail);
    }

    [Fact]
    public async Task DeleteGuest_ShouldReturnNoContent_AndRemoveGuestFromListAndCpfLookup()
    {
        await Factory.ResetDatabaseAsync();

        var session = await CreateAuthenticatedUserSessionAsync();
        var ev = await CreateEventAsync(session.Token);
        var guest = await CreateGuestAsync(session.Token, ev.Id, cpf: GenerateUniqueCpf());

        var deleteResponse = await DeleteAuthorizedAsync($"/api/events/{ev.Id}/guests/{guest.Id}", session.Token);

        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var listResponse = await GetAuthorizedAsync($"/api/events/{ev.Id}/guests", session.Token);
        var guests = await listResponse.Content.ReadFromJsonAsync<List<EventGuestResponseContract>>(JsonOptions);

        Assert.NotNull(guests);
        Assert.DoesNotContain(guests, current => current.Id == guest.Id);

        var lookupResponse = await GetAuthorizedAsync($"/api/events/{ev.Id}/guests/by-cpf/{guest.Cpf}", session.Token);
        Assert.Equal(HttpStatusCode.NotFound, lookupResponse.StatusCode);
    }

    [Fact]
    public async Task DeleteGuest_ShouldReturnForbidden_WhenEventBelongsToAnotherUser()
    {
        await Factory.ResetDatabaseAsync();

        var owner = await CreateAuthenticatedUserSessionAsync();
        var intruder = await CreateAuthenticatedUserSessionAsync();
        var ev = await CreateEventAsync(owner.Token);
        var guest = await CreateGuestAsync(owner.Token, ev.Id);

        var response = await DeleteAuthorizedAsync($"/api/events/{ev.Id}/guests/{guest.Id}", intruder.Token);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ProblemDetails>(JsonOptions);
        Assert.NotNull(payload);
        Assert.Equal("Acesso negado", payload.Title);
        Assert.Equal("Você não tem permissão para modificar convidados deste evento.", payload.Detail);
    }
}
