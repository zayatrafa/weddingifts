using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Weddingifts.Api.Data;
using Weddingifts.Api.Entities;
using Weddingifts.Api.Exceptions;
using Weddingifts.Api.Models;

namespace Weddingifts.Api.Services;

public sealed class EventGuestService
{
    private const int MaxNameLength = 120;
    private const int MaxEmailLength = 120;
    private const int MaxPhoneLength = 20;

    private static readonly Regex GuestEmailRegex = new(
        @"^[^@\s]+@[^@\s]+\.[^@\s]{2,}$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private static readonly Regex NameRegex = new(
        @"^[A-Za-zÀ-ÖØ-öø-ÿ'-]+(?:\s+[A-Za-zÀ-ÖØ-öø-ÿ'-]+)*$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private readonly AppDbContext _context;

    public EventGuestService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<EventGuest> CreateGuestForUser(int eventId, int userId, CreateEventGuestRequest request)
    {
        var ev = await GetEventForUser(eventId, userId, "modificar");

        var normalizedCpf = NormalizeCpf(request.Cpf);

        ValidateGuestData(request.Name, request.Email, request.PhoneNumber);

        var guestExists = await _context.EventGuests.AnyAsync(g => g.EventId == eventId && g.Cpf == normalizedCpf);
        if (guestExists)
            throw new DomainValidationException("Já existe convidado com este CPF neste evento.");

        var guest = new EventGuest
        {
            EventId = ev.Id,
            Cpf = normalizedCpf,
            Name = request.Name.Trim(),
            Email = request.Email.Trim().ToLowerInvariant(),
            PhoneNumber = NormalizePhoneNumber(request.PhoneNumber)
        };

        _context.EventGuests.Add(guest);
        await _context.SaveChangesAsync();

        return guest;
    }

    public async Task<EventGuest> UpdateGuestForUser(int eventId, int guestId, int userId, UpdateEventGuestRequest request)
    {
        await GetEventForUser(eventId, userId, "modificar");

        if (guestId <= 0)
            throw new DomainValidationException("Id do convidado deve ser maior que zero.");

        ValidateGuestData(request.Name, request.Email, request.PhoneNumber);

        var guest = await _context.EventGuests
            .FirstOrDefaultAsync(g => g.Id == guestId && g.EventId == eventId);

        if (guest is null)
            throw new ResourceNotFoundException("Convidado não encontrado.");

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var duplicatedEmail = await _context.EventGuests.AnyAsync(g =>
            g.EventId == eventId &&
            g.Id != guestId &&
            g.Email.ToLower() == normalizedEmail);

        if (duplicatedEmail)
            throw new DomainValidationException("Já existe convidado com este e-mail neste evento.");

        guest.Name = request.Name.Trim();
        guest.Email = normalizedEmail;
        guest.PhoneNumber = NormalizePhoneNumber(request.PhoneNumber);

        await _context.SaveChangesAsync();

        return guest;
    }

    public async Task DeleteGuestForUser(int eventId, int guestId, int userId)
    {
        await GetEventForUser(eventId, userId, "modificar");

        if (guestId <= 0)
            throw new DomainValidationException("Id do convidado deve ser maior que zero.");

        var guest = await _context.EventGuests
            .FirstOrDefaultAsync(g => g.Id == guestId && g.EventId == eventId);

        if (guest is null)
            throw new ResourceNotFoundException("Convidado não encontrado.");

        _context.EventGuests.Remove(guest);
        await _context.SaveChangesAsync();
    }

    public async Task<List<EventGuest>> GetGuestsByEventForUser(int eventId, int userId)
    {
        await GetEventForUser(eventId, userId, "visualizar");

        return await _context.EventGuests
            .AsNoTracking()
            .Where(g => g.EventId == eventId)
            .OrderBy(g => g.Name)
            .ToListAsync();
    }

    public async Task<EventGuest?> FindGuestByCpfInEventForUser(int eventId, int userId, string cpf)
    {
        await GetEventForUser(eventId, userId, "visualizar");

        var normalizedCpf = NormalizeCpf(cpf);

        return await _context.EventGuests
            .AsNoTracking()
            .FirstOrDefaultAsync(g => g.EventId == eventId && g.Cpf == normalizedCpf);
    }

    public static string NormalizeCpf(string? rawCpf)
    {
        return CpfValidator.NormalizeAndValidate(rawCpf);
    }

    private async Task<Event> GetEventForUser(int eventId, int userId, string action)
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
            throw new ForbiddenOperationException($"Você não tem permissão para {action} convidados deste evento.");

        return ev;
    }

    private static void ValidateGuestData(string name, string email, string phoneNumber)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainValidationException("Nome do convidado é obrigatório.");

        var normalizedName = name.Trim();
        if (normalizedName.Length > MaxNameLength)
            throw new DomainValidationException("Nome do convidado excede o tamanho máximo permitido.");
        InputThreatValidator.EnsureSafeText(normalizedName, "nome do convidado");

        if (!IsValidPersonName(normalizedName))
            throw new DomainValidationException("Nome do convidado deve conter apenas letras.");

        if (string.IsNullOrWhiteSpace(email))
            throw new DomainValidationException("E-mail do convidado é obrigatório.");

        var normalizedEmail = email.Trim();
        if (normalizedEmail.Length > MaxEmailLength)
            throw new DomainValidationException("E-mail do convidado excede o tamanho máximo permitido.");
        InputThreatValidator.EnsureSafeText(normalizedEmail, "e-mail do convidado");

        if (!IsValidEmail(normalizedEmail))
            throw new DomainValidationException("E-mail do convidado é inválido.");

        if (string.IsNullOrWhiteSpace(phoneNumber))
            throw new DomainValidationException("Telefone do convidado é obrigatório.");

        if (phoneNumber.Trim().Length > MaxPhoneLength)
            throw new DomainValidationException("Telefone do convidado excede o tamanho máximo permitido.");

        _ = NormalizePhoneNumber(phoneNumber);
    }

    private static bool IsValidEmail(string email)
    {
        return GuestEmailRegex.IsMatch(email);
    }

    private static bool IsValidPersonName(string name)
    {
        return NameRegex.IsMatch(name);
    }

    private static string NormalizePhoneNumber(string phoneNumber)
    {
        var digits = new string(phoneNumber.Where(char.IsDigit).ToArray());

        if (digits.Length is < 10 or > 11)
            throw new DomainValidationException("Telefone do convidado deve conter 10 ou 11 dígitos.");

        return digits;
    }
}
