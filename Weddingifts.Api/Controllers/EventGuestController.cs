using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Weddingifts.Api.Exceptions;
using Weddingifts.Api.Models;
using Weddingifts.Api.Services;

namespace Weddingifts.Api.Controllers;

[ApiController]
[Route("api/events")]
public class EventGuestController : ControllerBase
{
    private readonly EventGuestService _eventGuestService;

    public EventGuestController(EventGuestService eventGuestService)
    {
        _eventGuestService = eventGuestService;
    }

    [Authorize]
    [HttpPost("{eventId:int}/guests")]
    public async Task<IActionResult> CreateGuest(int eventId, [FromBody] CreateEventGuestRequest request)
    {
        var userId = GetAuthenticatedUserId();
        var guest = await _eventGuestService.CreateGuestForUser(eventId, userId, request);
        var response = EventGuestResponse.FromEntity(guest);

        return Created($"/api/events/{eventId}/guests/{response.Id}", response);
    }

    [Authorize]
    [HttpGet("{eventId:int}/guests")]
    public async Task<IActionResult> GetGuests(int eventId)
    {
        var userId = GetAuthenticatedUserId();
        var guests = await _eventGuestService.GetGuestsByEventForUser(eventId, userId);
        var response = guests.Select(EventGuestResponse.FromEntity);

        return Ok(response);
    }

    [Authorize]
    [HttpGet("{eventId:int}/guests/by-cpf/{cpf}")]
    public async Task<IActionResult> FindGuestByCpf(int eventId, string cpf)
    {
        var userId = GetAuthenticatedUserId();
        var guest = await _eventGuestService.FindGuestByCpfInEventForUser(eventId, userId, cpf);

        if (guest is null)
            return NotFound();

        var response = EventGuestResponse.FromEntity(guest);
        return Ok(response);
    }

    private int GetAuthenticatedUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!int.TryParse(claim, out var userId) || userId <= 0)
        {
            throw new DomainValidationException("Authenticated user id is invalid.");
        }

        return userId;
    }
}
