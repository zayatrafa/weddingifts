using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Weddingifts.Api.Data;
using Weddingifts.Api.Entities;
using Weddingifts.Api.Exceptions;
using Weddingifts.Api.Models;

namespace Weddingifts.Api.Services;

public sealed class EventRsvpService
{
    private const int MaxMessageLength = 500;
    private const int MaxDietaryRestrictionsLength = 500;
    private const int MaxCompanionNameLength = 120;

    private static readonly Regex CompanionNameRegex = new(
        @"^[A-Za-zÀ-ÖØ-öø-ÿ'-]+(?:\s+[A-Za-zÀ-ÖØ-öø-ÿ'-]+)*$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private readonly AppDbContext _context;
    private readonly EventTimeZoneService _eventTimeZoneService;

    public EventRsvpService(AppDbContext context, EventTimeZoneService eventTimeZoneService)
    {
        _context = context;
        _eventTimeZoneService = eventTimeZoneService;
    }

    public async Task<EventGuestRsvpResponse> GetRsvpAsync(string slug, string guestCpf)
    {
        var (ev, guest) = await LoadEventAndGuestAsync(slug, guestCpf);
        return EventGuestRsvpResponse.FromEntity(ev, guest);
    }

    public async Task<EventGuestRsvpResponse> ConfirmRsvpAsync(string slug, UpsertEventGuestRsvpRequest request)
    {
        var (ev, guest) = await LoadEventAndGuestAsync(slug, request.GuestCpf);

        if (guest.RsvpStatus != RsvpStatus.Pending)
            throw new DomainValidationException("O RSVP deste convidado já foi respondido. Use a atualização do RSVP.");

        await ApplyRsvpAsync(ev, guest, request);
        await _context.SaveChangesAsync();

        return EventGuestRsvpResponse.FromEntity(ev, guest);
    }

    public async Task<EventGuestRsvpResponse> UpdateRsvpAsync(string slug, UpsertEventGuestRsvpRequest request)
    {
        var (ev, guest) = await LoadEventAndGuestAsync(slug, request.GuestCpf);

        if (guest.RsvpStatus == RsvpStatus.Pending)
            throw new DomainValidationException("O RSVP deste convidado ainda não foi respondido. Use a confirmação inicial.");

        await ApplyRsvpAsync(ev, guest, request);
        await _context.SaveChangesAsync();

        return EventGuestRsvpResponse.FromEntity(ev, guest);
    }

    public async Task ResetGuestsForEventTemporalChangeAsync(Event ev)
    {
        var guests = await _context.EventGuests
            .Include(guest => guest.Companions)
            .Where(guest => guest.EventId == ev.Id)
            .ToListAsync();

        foreach (var guest in guests)
        {
            if (!ShouldResetGuestForCurrentEvent(ev, guest))
                continue;

            ResetGuestToPending(guest);
        }
    }

    public void ResetGuestIfNeededAfterMaxExtraGuestsReduction(Event ev, EventGuest guest)
    {
        if (!ShouldResetGuestForCurrentEvent(ev, guest))
            return;

        ResetGuestToPending(guest);
    }

    private async Task ApplyRsvpAsync(Event ev, EventGuest guest, UpsertEventGuestRsvpRequest request)
    {
        var status = ParsePublicStatus(request.Status);
        var normalizedMessage = NormalizeOptionalText(request.MessageToCouple, "mensagem para o casal", MaxMessageLength);
        var requestedCompanions = request.Companions ?? [];

        if (status == RsvpStatus.Declined)
        {
            if (requestedCompanions.Count > 0)
                throw new DomainValidationException("Acompanhantes não podem ser enviados quando o RSVP for recusado.");

            guest.RsvpStatus = RsvpStatus.Declined;
            guest.RsvpRespondedAt = DateTime.UtcNow;
            guest.MessageToCouple = normalizedMessage;
            guest.DietaryRestrictions = null;

            if (guest.Companions.Count > 0)
            {
                _context.EventGuestCompanions.RemoveRange(guest.Companions);
                guest.Companions.Clear();
            }

            return;
        }

        var normalizedDietaryRestrictions = NormalizeOptionalText(
            request.DietaryRestrictions,
            "restrições alimentares",
            MaxDietaryRestrictionsLength);

        var companions = await BuildValidatedCompanionsAsync(ev, guest, requestedCompanions);

        if (guest.Companions.Count > 0)
        {
            _context.EventGuestCompanions.RemoveRange(guest.Companions);
            guest.Companions.Clear();
        }

        foreach (var companion in companions)
        {
            guest.Companions.Add(companion);
        }

        guest.RsvpStatus = RsvpStatus.Accepted;
        guest.RsvpRespondedAt = DateTime.UtcNow;
        guest.MessageToCouple = normalizedMessage;
        guest.DietaryRestrictions = normalizedDietaryRestrictions;
    }

    private async Task<List<EventGuestCompanion>> BuildValidatedCompanionsAsync(
        Event ev,
        EventGuest guest,
        IReadOnlyCollection<EventGuestCompanionRequest> requestedCompanions)
    {
        if (requestedCompanions.Count > guest.MaxExtraGuests)
        {
            throw new DomainValidationException("A quantidade de acompanhantes excede o limite permitido para este convidado.");
        }

        var eventLocalDate = _eventTimeZoneService.GetEventLocalDate(ev.EventDateTime, ev.TimeZoneId);
        var normalizedCompanions = new List<EventGuestCompanion>(requestedCompanions.Count);
        var companionCpfs = new HashSet<string>(StringComparer.Ordinal);

        foreach (var requestedCompanion in requestedCompanions)
        {
            var normalizedName = NormalizeCompanionName(requestedCompanion.Name);
            var normalizedBirthDate = EventTimeZoneService.NormalizeBirthDate(requestedCompanion.BirthDate);

            if (normalizedBirthDate > eventLocalDate)
                throw new DomainValidationException("Data de nascimento do acompanhante não pode ser posterior à data do evento.");

            var ageOnEventDate = _eventTimeZoneService.CalculateAgeOnEventDate(normalizedBirthDate, ev);
            var normalizedCpf = NormalizeCompanionCpf(requestedCompanion.Cpf, ageOnEventDate);

            if (normalizedCpf is not null && !companionCpfs.Add(normalizedCpf))
            {
                throw new DomainValidationException("CPF de acompanhante não pode se repetir no mesmo RSVP.");
            }

            normalizedCompanions.Add(new EventGuestCompanion
            {
                EventGuestId = guest.Id,
                Name = normalizedName,
                BirthDate = normalizedBirthDate,
                Cpf = normalizedCpf
            });
        }

        await EnsureCompanionCpfUniquenessInEventAsync(ev.Id, guest.Id, companionCpfs);

        return normalizedCompanions;
    }

    private async Task EnsureCompanionCpfUniquenessInEventAsync(int eventId, int guestId, IReadOnlyCollection<string> companionCpfs)
    {
        if (companionCpfs.Count == 0)
            return;

        var normalizedGuestCpfs = await _context.EventGuests
            .AsNoTracking()
            .Where(guest => guest.EventId == eventId)
            .Select(guest => guest.Cpf)
            .ToListAsync();

        if (normalizedGuestCpfs.Any(companionCpfs.Contains))
        {
            throw new DomainValidationException("CPF de acompanhante não pode coincidir com CPF de convidado principal do evento.");
        }

        var normalizedExistingCompanionCpfs = await _context.EventGuestCompanions
            .AsNoTracking()
            .Where(companion =>
                companion.Cpf != null &&
                companion.EventGuestId != guestId &&
                companion.EventGuest.EventId == eventId)
            .Select(companion => companion.Cpf!)
            .ToListAsync();

        if (normalizedExistingCompanionCpfs.Any(companionCpfs.Contains))
        {
            throw new DomainValidationException("CPF de acompanhante já está cadastrado neste evento.");
        }
    }

    private async Task<(Event Event, EventGuest Guest)> LoadEventAndGuestAsync(string slug, string guestCpf)
    {
        if (string.IsNullOrWhiteSpace(slug))
            throw new DomainValidationException("Slug é obrigatório.");

        var normalizedSlug = slug.Trim();
        InputThreatValidator.EnsureSafeText(normalizedSlug, "slug");

        var ev = await _context.Events
            .AsNoTracking()
            .FirstOrDefaultAsync(currentEvent => currentEvent.Slug == normalizedSlug);

        if (ev is null)
            throw new ResourceNotFoundException("Evento não encontrado.");

        var normalizedGuestCpf = EventGuestService.NormalizeCpf(guestCpf);

        var guest = await _context.EventGuests
            .Include(currentGuest => currentGuest.Companions)
            .FirstOrDefaultAsync(currentGuest =>
                currentGuest.EventId == ev.Id &&
                currentGuest.Cpf == normalizedGuestCpf);

        if (guest is null)
            throw new DomainValidationException("Este CPF não está convidado para este evento.");

        return (ev, guest);
    }

    private static RsvpStatus ParsePublicStatus(string? rawStatus)
    {
        var normalizedStatus = rawStatus?.Trim().ToLowerInvariant();

        return normalizedStatus switch
        {
            "accepted" => RsvpStatus.Accepted,
            "declined" => RsvpStatus.Declined,
            "pending" => throw new DomainValidationException("O status 'pending' é reservado ao controle interno do sistema."),
            _ => throw new DomainValidationException("Status de RSVP inválido. Use 'accepted' ou 'declined'.")
        };
    }

    private static string? NormalizeOptionalText(string? value, string fieldLabel, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        var normalized = value.Trim();
        if (normalized.Length > maxLength)
            throw new DomainValidationException($"O campo '{fieldLabel}' excede o tamanho máximo permitido.");

        InputThreatValidator.EnsureSafeText(normalized, fieldLabel);
        return normalized;
    }

    private static string NormalizeCompanionName(string? rawName)
    {
        if (string.IsNullOrWhiteSpace(rawName))
            throw new DomainValidationException("Nome do acompanhante é obrigatório.");

        var normalizedName = rawName.Trim();
        if (normalizedName.Length > MaxCompanionNameLength)
            throw new DomainValidationException("Nome do acompanhante excede o tamanho máximo permitido.");

        InputThreatValidator.EnsureSafeText(normalizedName, "nome do acompanhante");

        if (!CompanionNameRegex.IsMatch(normalizedName))
            throw new DomainValidationException("Nome do acompanhante deve conter apenas letras.");

        return normalizedName;
    }

    private static string? NormalizeCompanionCpf(string? rawCpf, int ageOnEventDate)
    {
        if (string.IsNullOrWhiteSpace(rawCpf))
        {
            if (ageOnEventDate >= 16)
                throw new DomainValidationException("CPF do acompanhante é obrigatório para idade igual ou superior a 16 anos na data do evento.");

            return null;
        }

        return CpfValidator.NormalizeAndValidate(rawCpf);
    }

    private bool ShouldResetGuestForCurrentEvent(Event ev, EventGuest guest)
    {
        if (guest.MaxExtraGuests < 0)
            return true;

        if (guest.RsvpStatus == RsvpStatus.Pending)
        {
            return guest.Companions.Count > 0
                || guest.RsvpRespondedAt is not null
                || !string.IsNullOrWhiteSpace(guest.MessageToCouple)
                || !string.IsNullOrWhiteSpace(guest.DietaryRestrictions);
        }

        if (guest.RsvpStatus == RsvpStatus.Declined)
            return guest.Companions.Count > 0;

        if (guest.Companions.Count > guest.MaxExtraGuests)
            return true;

        var eventLocalDate = _eventTimeZoneService.GetEventLocalDate(ev.EventDateTime, ev.TimeZoneId);

        foreach (var companion in guest.Companions)
        {
            if (companion.BirthDate > eventLocalDate)
                return true;

            var ageOnEventDate = _eventTimeZoneService.CalculateAgeOnEventDate(companion.BirthDate, ev);
            if (ageOnEventDate >= 16 && string.IsNullOrWhiteSpace(companion.Cpf))
                return true;
        }

        return false;
    }

    private void ResetGuestToPending(EventGuest guest)
    {
        guest.RsvpStatus = RsvpStatus.Pending;
        guest.RsvpRespondedAt = null;
        guest.MessageToCouple = null;
        guest.DietaryRestrictions = null;

        if (guest.Companions.Count == 0)
            return;

        _context.EventGuestCompanions.RemoveRange(guest.Companions);
        guest.Companions.Clear();
    }
}
