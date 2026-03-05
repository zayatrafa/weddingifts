using Microsoft.AspNetCore.Mvc;
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
    public async Task<IActionResult> CreateEvent(CreateEventRequest request)
    {
        var ev = await _eventService.CreateEvent(request);

        return Ok(ev);
    }

    [HttpGet("{slug}")]
    public async Task<IActionResult> GetEvent(string slug)
    {
        var ev = await _eventService.GetEventBySlug(slug);

        if (ev == null)
            return NotFound();

        return Ok(ev);
    }
}