using System.Net.Mail;
using Microsoft.EntityFrameworkCore;
using Weddingifts.Api.Data;
using Weddingifts.Api.Entities;
using Weddingifts.Api.Exceptions;
using Weddingifts.Api.Models;

namespace Weddingifts.Api.Services;

public sealed class EventGuestService
{
    private readonly AppDbContext _context;

    public EventGuestService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<EventGuest> CreateGuestForUser(int eventId, int userId, CreateEventGuestRequest request)
    {
        if (userId <= 0)
            throw new DomainValidationException("Authenticated user id is invalid.");

        if (eventId <= 0)
            throw new DomainValidationException("Event id must be greater than zero.");

        var ev = await _context.Events
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == eventId);

        if (ev is null)
            throw new ResourceNotFoundException("Event not found.");

        if (ev.UserId != userId)
            throw new ForbiddenOperationException("You do not have permission to modify this event.");

        var normalizedCpf = NormalizeCpf(request.Cpf);

        if (string.IsNullOrWhiteSpace(request.Name))
            throw new DomainValidationException("Guest name is required.");

        if (string.IsNullOrWhiteSpace(request.Email))
            throw new DomainValidationException("Guest email is required.");

        if (!IsValidEmail(request.Email))
            throw new DomainValidationException("Guest email is invalid.");

        if (string.IsNullOrWhiteSpace(request.PhoneNumber))
            throw new DomainValidationException("Guest phone number is required.");

        var guestExists = await _context.EventGuests.AnyAsync(g => g.EventId == eventId && g.Cpf == normalizedCpf);
        if (guestExists)
            throw new DomainValidationException("Guest with this CPF is already registered in this event.");

        var guest = new EventGuest
        {
            EventId = eventId,
            Cpf = normalizedCpf,
            Name = request.Name.Trim(),
            Email = request.Email.Trim().ToLowerInvariant(),
            PhoneNumber = request.PhoneNumber.Trim()
        };

        _context.EventGuests.Add(guest);
        await _context.SaveChangesAsync();

        return guest;
    }

    public async Task<List<EventGuest>> GetGuestsByEventForUser(int eventId, int userId)
    {
        if (userId <= 0)
            throw new DomainValidationException("Authenticated user id is invalid.");

        if (eventId <= 0)
            throw new DomainValidationException("Event id must be greater than zero.");

        var ev = await _context.Events
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == eventId);

        if (ev is null)
            throw new ResourceNotFoundException("Event not found.");

        if (ev.UserId != userId)
            throw new ForbiddenOperationException("You do not have permission to view guests from this event.");

        return await _context.EventGuests
            .AsNoTracking()
            .Where(g => g.EventId == eventId)
            .OrderBy(g => g.Name)
            .ToListAsync();
    }

    public async Task<EventGuest?> FindGuestByCpfInEventForUser(int eventId, int userId, string cpf)
    {
        if (userId <= 0)
            throw new DomainValidationException("Authenticated user id is invalid.");

        if (eventId <= 0)
            throw new DomainValidationException("Event id must be greater than zero.");

        var normalizedCpf = NormalizeCpf(cpf);

        var ev = await _context.Events
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == eventId);

        if (ev is null)
            throw new ResourceNotFoundException("Event not found.");

        if (ev.UserId != userId)
            throw new ForbiddenOperationException("You do not have permission to view guests from this event.");

        return await _context.EventGuests
            .AsNoTracking()
            .FirstOrDefaultAsync(g => g.EventId == eventId && g.Cpf == normalizedCpf);
    }

    public static string NormalizeCpf(string? rawCpf)
    {
        var digits = new string((rawCpf ?? string.Empty).Where(char.IsDigit).ToArray());

        if (digits.Length != 11)
            throw new DomainValidationException("CPF must contain exactly 11 digits.");

        return digits;
    }

    private static bool IsValidEmail(string email)
    {
        try
        {
            _ = new MailAddress(email.Trim());
            return true;
        }
        catch
        {
            return false;
        }
    }
}
