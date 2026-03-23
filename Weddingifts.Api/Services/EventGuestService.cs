using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Weddingifts.Api.Data;
using Weddingifts.Api.Entities;
using Weddingifts.Api.Exceptions;
using Weddingifts.Api.Models;

namespace Weddingifts.Api.Services;

public sealed class EventGuestService
{
    private static readonly Regex GuestEmailRegex = new(
        @"^[^@\s]+@[^@\s]+\.[^@\s]{2,}$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private readonly AppDbContext _context;

    public EventGuestService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<EventGuest> CreateGuestForUser(int eventId, int userId, CreateEventGuestRequest request)
    {
        if (userId <= 0)
            throw new DomainValidationException("Id do usuário autenticado é inválido.");

        if (eventId <= 0)
            throw new DomainValidationException("Id do evento deve ser maior que zero.");

        var ev = await _context.Events
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == eventId);

        if (ev is null)
            throw new ResourceNotFoundException("Evento não encontrado.");

        if (ev.UserId != userId)
            throw new ForbiddenOperationException("Você não tem permissão para modificar este evento.");

        var normalizedCpf = NormalizeCpf(request.Cpf);

        if (string.IsNullOrWhiteSpace(request.Name))
            throw new DomainValidationException("Nome do convidado é obrigatório.");

        if (string.IsNullOrWhiteSpace(request.Email))
            throw new DomainValidationException("E-mail do convidado é obrigatório.");

        if (!IsValidEmail(request.Email))
            throw new DomainValidationException("E-mail do convidado é inválido.");

        if (string.IsNullOrWhiteSpace(request.PhoneNumber))
            throw new DomainValidationException("Telefone do convidado é obrigatório.");

        var normalizedPhoneNumber = NormalizePhoneNumber(request.PhoneNumber);

        var guestExists = await _context.EventGuests.AnyAsync(g => g.EventId == eventId && g.Cpf == normalizedCpf);
        if (guestExists)
            throw new DomainValidationException("Já existe convidado com este CPF neste evento.");

        var guest = new EventGuest
        {
            EventId = eventId,
            Cpf = normalizedCpf,
            Name = request.Name.Trim(),
            Email = request.Email.Trim().ToLowerInvariant(),
            PhoneNumber = normalizedPhoneNumber
        };

        _context.EventGuests.Add(guest);
        await _context.SaveChangesAsync();

        return guest;
    }

    public async Task<List<EventGuest>> GetGuestsByEventForUser(int eventId, int userId)
    {
        if (userId <= 0)
            throw new DomainValidationException("Id do usuário autenticado é inválido.");

        if (eventId <= 0)
            throw new DomainValidationException("Id do evento deve ser maior que zero.");

        var ev = await _context.Events
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == eventId);

        if (ev is null)
            throw new ResourceNotFoundException("Evento não encontrado.");

        if (ev.UserId != userId)
            throw new ForbiddenOperationException("Você não tem permissão para visualizar convidados deste evento.");

        return await _context.EventGuests
            .AsNoTracking()
            .Where(g => g.EventId == eventId)
            .OrderBy(g => g.Name)
            .ToListAsync();
    }

    public async Task<EventGuest?> FindGuestByCpfInEventForUser(int eventId, int userId, string cpf)
    {
        if (userId <= 0)
            throw new DomainValidationException("Id do usuário autenticado é inválido.");

        if (eventId <= 0)
            throw new DomainValidationException("Id do evento deve ser maior que zero.");

        var normalizedCpf = NormalizeCpf(cpf);

        var ev = await _context.Events
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == eventId);

        if (ev is null)
            throw new ResourceNotFoundException("Evento não encontrado.");

        if (ev.UserId != userId)
            throw new ForbiddenOperationException("Você não tem permissão para visualizar convidados deste evento.");

        return await _context.EventGuests
            .AsNoTracking()
            .FirstOrDefaultAsync(g => g.EventId == eventId && g.Cpf == normalizedCpf);
    }

    public static string NormalizeCpf(string? rawCpf)
    {
        return CpfValidator.NormalizeAndValidate(rawCpf);
    }

    private static bool IsValidEmail(string email)
    {
        return GuestEmailRegex.IsMatch(email.Trim());
    }

    private static string NormalizePhoneNumber(string phoneNumber)
    {
        var digits = new string(phoneNumber.Where(char.IsDigit).ToArray());

        if (digits.Length is < 10 or > 11)
            throw new DomainValidationException("Telefone do convidado deve conter 10 ou 11 dígitos.");

        return digits;
    }
}
