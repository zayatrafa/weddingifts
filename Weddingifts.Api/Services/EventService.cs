using Microsoft.EntityFrameworkCore;
using Weddingifts.Api.Data;
using Weddingifts.Api.Entities;

namespace Weddingifts.Api.Services;

public class EventService
{
    private readonly AppDbContext _context;

    public EventService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Event> CreateEvent(CreateEventRequest request)
    {
        var slug = Guid.NewGuid().ToString()[..8];

        var ev = new Event
        {
            UserId = request.UserId,
            Name = request.Name,
            EventDate = request.EventDate,
            Slug = slug
        };

        _context.Events.Add(ev);

        await _context.SaveChangesAsync();

        return ev;
    }

    public async Task<Event?> GetEventBySlug(string slug)
    {
        return await _context.Events
            .Include(e => e.Gifts)
            .FirstOrDefaultAsync(e => e.Slug == slug);
    }
}