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

        if (request.EventDate == default)
            throw new DomainValidationException("Event date is required.");

        var userExists = await _context.Users.AnyAsync(u => u.Id == request.UserId);
        if (!userExists)
            throw new ResourceNotFoundException("User not found.");

        var ev = new Event
        {
            UserId = request.UserId,
            Name = request.Name.Trim(),
            EventDate = NormalizeEventDate(request.EventDate),
            Slug = await GenerateUniqueSlug()
        };

        _context.Events.Add(ev);
        await _context.SaveChangesAsync();

        return ev;
    }

    public async Task<Event> CreateEventForUser(int userId, CreateEventRequest request)
    {
        request.UserId = userId;
        return await CreateEvent(request);
    }

    public async Task<Event> UpdateEventForUser(int userId, int eventId, UpdateEventRequest request)
    {
        if (userId <= 0)
            throw new DomainValidationException("Authenticated user id is invalid.");

        if (eventId <= 0)
            throw new DomainValidationException("Event id must be greater than zero.");

        if (string.IsNullOrWhiteSpace(request.Name))
            throw new DomainValidationException("Event name is required.");

        if (request.EventDate == default)
            throw new DomainValidationException("Event date is required.");

        var ev = await _context.Events.FirstOrDefaultAsync(e => e.Id == eventId && e.UserId == userId);
        if (ev is null)
            throw new ResourceNotFoundException("Event not found.");

        ev.Name = request.Name.Trim();
        ev.EventDate = NormalizeEventDate(request.EventDate);

        await _context.SaveChangesAsync();

        return ev;
    }

    public async Task DeleteEventForUser(int userId, int eventId)
    {
        if (userId <= 0)
            throw new DomainValidationException("Authenticated user id is invalid.");

        if (eventId <= 0)
            throw new DomainValidationException("Event id must be greater than zero.");

        var ev = await _context.Events.FirstOrDefaultAsync(e => e.Id == eventId && e.UserId == userId);
        if (ev is null)
            throw new ResourceNotFoundException("Event not found.");

        _context.Events.Remove(ev);
        await _context.SaveChangesAsync();
    }

    public async Task<List<Event>> GetEventsByUser(int userId)
    {
        if (userId <= 0)
            throw new DomainValidationException("Authenticated user id is invalid.");

        return await _context.Events
            .AsNoTracking()
            .Include(e => e.Gifts)
            .Where(e => e.UserId == userId)
            .OrderByDescending(e => e.CreatedAt)
            .ToListAsync();
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

    private static DateTime NormalizeEventDate(DateTime eventDate)
    {
        return eventDate.Kind switch
        {
            DateTimeKind.Utc => eventDate,
            DateTimeKind.Local => eventDate.ToUniversalTime(),
            _ => DateTime.SpecifyKind(eventDate, DateTimeKind.Utc)
        };
    }
}
