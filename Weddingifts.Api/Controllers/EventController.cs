using Microsoft.AspNetCore.Mvc;
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

    [HttpPost]
    public async Task<IActionResult> CreateEvent([FromBody] CreateEventRequest request)
    {
        var ev = await _eventService.CreateEvent(request);
        var response = EventResponse.FromEntity(ev);

        return Created($"/api/events/{response.Slug}", response);
    }

    [HttpGet("{slug}")]
    public async Task<IActionResult> GetEvent(string slug)
    {
        var ev = await _eventService.GetEventBySlug(slug);
        var response = EventResponse.FromEntity(ev);

        return Ok(response);
    }
}
