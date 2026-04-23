using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Weddingifts.Api.Models;
using Weddingifts.Api.Services;

namespace Weddingifts.Api.Controllers;

[ApiController]
[Route("api/events")]
public sealed class EventRsvpController : ControllerBase
{
    private readonly EventRsvpService _eventRsvpService;

    public EventRsvpController(EventRsvpService eventRsvpService)
    {
        _eventRsvpService = eventRsvpService;
    }

    [AllowAnonymous]
    [HttpGet("{slug}/rsvp")]
    public async Task<IActionResult> GetRsvp(string slug, [FromQuery] string guestCpf)
    {
        var response = await _eventRsvpService.GetRsvpAsync(slug, guestCpf);
        return Ok(response);
    }

    [AllowAnonymous]
    [HttpPost("{slug}/rsvp")]
    public async Task<IActionResult> ConfirmRsvp(string slug, [FromBody] UpsertEventGuestRsvpRequest? request)
    {
        var response = await _eventRsvpService.ConfirmRsvpAsync(slug, request ?? new UpsertEventGuestRsvpRequest());
        return Ok(response);
    }

    [AllowAnonymous]
    [HttpPut("{slug}/rsvp")]
    public async Task<IActionResult> UpdateRsvp(string slug, [FromBody] UpsertEventGuestRsvpRequest? request)
    {
        var response = await _eventRsvpService.UpdateRsvpAsync(slug, request ?? new UpsertEventGuestRsvpRequest());
        return Ok(response);
    }
}
