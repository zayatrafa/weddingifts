using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Weddingifts.Api.Exceptions;
using Weddingifts.Api.Models;
using Weddingifts.Api.Services;

namespace Weddingifts.Api.Controllers;

[ApiController]
[Route("api/events")]
public class EventController : ControllerBase
{
    private readonly EventService _eventService;

    public EventController(EventService eventService)
    {
        _eventService = eventService;
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> CreateEvent([FromBody] CreateEventRequest request)
    {
        var userId = GetAuthenticatedUserId();
        var ev = await _eventService.CreateEventForUser(userId, request);
        var response = EventResponse.FromEntity(ev);

        return Created($"/api/events/{response.Slug}", response);
    }

    [Authorize]
    [HttpGet("mine")]
    public async Task<IActionResult> GetMyEvents()
    {
        var userId = GetAuthenticatedUserId();
        var events = await _eventService.GetEventsByUser(userId);
        var response = events.Select(EventResponse.FromEntity);

        return Ok(response);
    }

    [AllowAnonymous]
    [HttpGet("{slug}")]
    public async Task<IActionResult> GetEvent(string slug)
    {
        var ev = await _eventService.GetEventBySlug(slug);
        var response = EventResponse.FromEntity(ev);

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

