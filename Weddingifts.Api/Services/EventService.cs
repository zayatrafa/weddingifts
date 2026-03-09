using Microsoft.EntityFrameworkCore;
using Weddingifts.Api.Data;
using Weddingifts.Api.Entities;
using Weddingifts.Api.Exceptions;
using Weddingifts.Api.Models;

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
        if (request.UserId <= 0)
            throw new DomainValidationException("UserId must be greater than zero.");

        if (string.IsNullOrWhiteSpace(request.Name))
            throw new DomainValidationException("Event name is required.");

        var userExists = await _context.Users.AnyAsync(u => u.Id == request.UserId);
        if (!userExists)
            throw new ResourceNotFoundException("User not found.");

        var ev = new Event
        {
            UserId = request.UserId,
            Name = request.Name.Trim(),
            EventDate = request.EventDate,
            Slug = await GenerateUniqueSlug()
        };

        _context.Events.Add(ev);
        await _context.SaveChangesAsync();

        return ev;
    }

    public async Task<Event> GetEventBySlug(string slug)
    {
        if (string.IsNullOrWhiteSpace(slug))
            throw new DomainValidationException("Slug is required.");

        var ev = await _context.Events
            .AsNoTracking()
            .Include(e => e.Gifts)
            .FirstOrDefaultAsync(e => e.Slug == slug.Trim());

        if (ev is null)
            throw new ResourceNotFoundException("Event not found.");

        return ev;
    }

    private async Task<string> GenerateUniqueSlug()
    {
        const string letters = "abcdefghijklmnopqrstuvwxyz0123456789";

        for (var attempt = 0; attempt < 5; attempt++)
        {
            var candidate = new string(Enumerable.Range(0, 8)
                .Select(_ => letters[Random.Shared.Next(letters.Length)])
                .ToArray());

            var exists = await _context.Events.AnyAsync(e => e.Slug == candidate);
            if (!exists)
            {
                return candidate;
            }
        }

        return Guid.NewGuid().ToString("N")[..12];
    }
}
