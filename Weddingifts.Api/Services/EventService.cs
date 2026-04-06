using Microsoft.EntityFrameworkCore;
using Weddingifts.Api.Data;
using Weddingifts.Api.Entities;
using Weddingifts.Api.Exceptions;
using Weddingifts.Api.Models;

namespace Weddingifts.Api.Services;

public class EventService
{
    private const int MaxEventNameLength = 120;
    private const int MaxSlugLength = 24;

    private readonly AppDbContext _context;

    public EventService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Event> CreateEvent(CreateEventRequest request)
    {
        if (request.UserId <= 0)
            throw new DomainValidationException("Id do usuário deve ser maior que zero.");

        if (string.IsNullOrWhiteSpace(request.Name))
            throw new DomainValidationException("Nome do evento é obrigatório.");

        var normalizedName = request.Name.Trim();
        if (normalizedName.Length > MaxEventNameLength)
            throw new DomainValidationException("Nome do evento excede o tamanho máximo permitido.");
        InputThreatValidator.EnsureSafeText(normalizedName, "nome do evento");

        if (request.EventDate == default)
            throw new DomainValidationException("Data do evento é obrigatória.");

        var userExists = await _context.Users.AnyAsync(u => u.Id == request.UserId);
        if (!userExists)
            throw new ResourceNotFoundException("Usuário não encontrado.");

        var ev = new Event
        {
            UserId = request.UserId,
            Name = normalizedName,
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
            throw new DomainValidationException("Id do usuário autenticado é inválido.");

        if (eventId <= 0)
            throw new DomainValidationException("Id do evento deve ser maior que zero.");

        if (string.IsNullOrWhiteSpace(request.Name))
            throw new DomainValidationException("Nome do evento é obrigatório.");

        var normalizedName = request.Name.Trim();
        if (normalizedName.Length > MaxEventNameLength)
            throw new DomainValidationException("Nome do evento excede o tamanho máximo permitido.");
        InputThreatValidator.EnsureSafeText(normalizedName, "nome do evento");

        if (request.EventDate == default)
            throw new DomainValidationException("Data do evento é obrigatória.");

        var ev = await _context.Events.FirstOrDefaultAsync(e => e.Id == eventId && e.UserId == userId);
        if (ev is null)
            throw new ResourceNotFoundException("Evento não encontrado.");

        ev.Name = normalizedName;
        ev.EventDate = NormalizeEventDate(request.EventDate);

        await _context.SaveChangesAsync();

        return ev;
    }

    public async Task DeleteEventForUser(int userId, int eventId)
    {
        if (userId <= 0)
            throw new DomainValidationException("Id do usuário autenticado é inválido.");

        if (eventId <= 0)
            throw new DomainValidationException("Id do evento deve ser maior que zero.");

        var ev = await _context.Events.FirstOrDefaultAsync(e => e.Id == eventId && e.UserId == userId);
        if (ev is null)
            throw new ResourceNotFoundException("Evento não encontrado.");

        var hasActiveReservations = await _context.GiftReservations
            .AnyAsync(r => r.EventId == eventId && r.ReservedQuantity > r.UnreservedQuantity);

        if (hasActiveReservations)
        {
            throw new DomainValidationException(
                "Não é possível excluir o evento com reservas ativas. Cancele as reservas primeiro.");
        }

        _context.Events.Remove(ev);
        await _context.SaveChangesAsync();
    }

    public async Task<List<Event>> GetEventsByUser(int userId)
    {
        if (userId <= 0)
            throw new DomainValidationException("Id do usuário autenticado é inválido.");

        return await _context.Events
            .AsNoTracking()
            .Include(e => e.Gifts)
            .Include(e => e.Guests)
            .Where(e => e.UserId == userId)
            .OrderByDescending(e => e.CreatedAt)
            .ToListAsync();
    }

    public async Task<Event> GetEventBySlug(string slug)
    {
        if (string.IsNullOrWhiteSpace(slug))
            throw new DomainValidationException("Slug é obrigatório.");

        var normalizedSlug = slug.Trim();
        if (normalizedSlug.Length > MaxSlugLength)
            throw new DomainValidationException("Slug excede o tamanho máximo permitido.");
        InputThreatValidator.EnsureSafeText(normalizedSlug, "slug");

        var ev = await _context.Events
            .AsNoTracking()
            .Include(e => e.Gifts)
            .FirstOrDefaultAsync(e => e.Slug == normalizedSlug);

        if (ev is null)
            throw new ResourceNotFoundException("Evento não encontrado.");

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
        var normalized = eventDate.Kind switch
        {
            DateTimeKind.Utc => eventDate,
            DateTimeKind.Local => eventDate.ToUniversalTime(),
            _ => DateTime.SpecifyKind(eventDate, DateTimeKind.Utc)
        };

        if (normalized.Date <= DateTime.UtcNow.Date)
            throw new DomainValidationException("A data do evento deve ser futura.");

        return normalized;
    }
}
