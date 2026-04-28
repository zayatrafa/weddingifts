using Microsoft.EntityFrameworkCore;
using Weddingifts.Api.Data;
using Weddingifts.Api.Entities;
using Weddingifts.Api.Exceptions;
using Weddingifts.Api.Models;

namespace Weddingifts.Api.Services;

public sealed class EventService
{
    private const int MaxEventNameLength = 120;
    private const int MaxHostNamesLength = 160;
    private const int MaxLocationNameLength = 160;
    private const int MaxLocationAddressLength = 255;
    private const int MaxUrlLength = 500;
    private const int MaxCeremonyInfoLength = 500;
    private const int MaxDressCodeLength = 160;
    private const int MaxInvitationMessageLength = 500;
    private const int MaxSlugLength = 24;

    private readonly AppDbContext _context;
    private readonly EventTimeZoneService _eventTimeZoneService;
    private readonly EventRsvpService _eventRsvpService;

    public EventService(
        AppDbContext context,
        EventTimeZoneService eventTimeZoneService,
        EventRsvpService eventRsvpService)
    {
        _context = context;
        _eventTimeZoneService = eventTimeZoneService;
        _eventRsvpService = eventRsvpService;
    }

    public async Task<Event> CreateEvent(CreateEventRequest request)
    {
        if (request.UserId <= 0)
            throw new DomainValidationException("Id do usuário deve ser maior que zero.");

        var normalizedName = NormalizeEventName(request.Name);
        var normalizedInvitationMessage = NormalizeOptionalText(
            request.InvitationMessage,
            "mensagem do convite",
            MaxInvitationMessageLength);

        var userExists = await _context.Users.AnyAsync(u => u.Id == request.UserId);
        if (!userExists)
            throw new ResourceNotFoundException("Usuário não encontrado.");

        var eventData = BuildEventData(request, normalizedName);

        var ev = new Event
        {
            UserId = request.UserId,
            Name = normalizedName,
            EventDate = eventData.EventDate,
            HostNames = eventData.HostNames,
            EventDateTime = eventData.EventDateTime,
            TimeZoneId = eventData.TimeZoneId,
            LocationName = eventData.LocationName,
            LocationAddress = eventData.LocationAddress,
            LocationMapsUrl = eventData.LocationMapsUrl,
            CeremonyInfo = eventData.CeremonyInfo,
            DressCode = eventData.DressCode,
            CoverImageUrl = eventData.CoverImageUrl,
            InvitationMessage = normalizedInvitationMessage,
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

        var normalizedName = NormalizeEventName(request.Name);
        var normalizedInvitationMessage = request.InvitationMessage is null
            ? null
            : NormalizeOptionalText(
                request.InvitationMessage,
                "mensagem do convite",
                MaxInvitationMessageLength);

        var ev = await _context.Events.FirstOrDefaultAsync(e => e.Id == eventId && e.UserId == userId);
        if (ev is null)
            throw new ResourceNotFoundException("Evento não encontrado.");

        var hadTemporalChange = false;

        if (HasEnrichedEventPayload(request))
        {
            var eventData = BuildEventData(request, normalizedName);
            hadTemporalChange = ev.EventDateTime != eventData.EventDateTime
                || !string.Equals(ev.TimeZoneId, eventData.TimeZoneId, StringComparison.Ordinal);

            ev.EventDate = eventData.EventDate;
            ev.HostNames = eventData.HostNames;
            ev.EventDateTime = eventData.EventDateTime;
            ev.TimeZoneId = eventData.TimeZoneId;
            ev.LocationName = eventData.LocationName;
            ev.LocationAddress = eventData.LocationAddress;
            ev.LocationMapsUrl = eventData.LocationMapsUrl;
            ev.CeremonyInfo = eventData.CeremonyInfo;
            ev.DressCode = eventData.DressCode;
            ev.CoverImageUrl = eventData.CoverImageUrl;
        }
        else
        {
            if (!request.EventDate.HasValue)
                throw new DomainValidationException("Data do evento é obrigatória.");

            var shiftedEventDateTime = _eventTimeZoneService.ShiftEventDateUtcKeepingLocalTime(ev, request.EventDate.Value);
            hadTemporalChange = ev.EventDateTime != shiftedEventDateTime;

            ev.EventDateTime = shiftedEventDateTime;
            ev.EventDate = _eventTimeZoneService.GetLegacyEventDateUtc(ev.EventDateTime, ev.TimeZoneId);
        }

        ev.Name = normalizedName;
        if (normalizedInvitationMessage is not null)
        {
            ev.InvitationMessage = normalizedInvitationMessage;
        }

        if (hadTemporalChange)
        {
            await _eventRsvpService.ResetGuestsForEventTemporalChangeAsync(ev);
        }

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
                .ThenInclude(guest => guest.Companions)
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
            .Include(e => e.Guests)
                .ThenInclude(guest => guest.Companions)
            .FirstOrDefaultAsync(e => e.Slug == normalizedSlug);

        if (ev is null)
            throw new ResourceNotFoundException("Evento não encontrado.");

        return ev;
    }

    private EventData BuildEventData(CreateEventRequest request, string normalizedName)
    {
        if (!HasEnrichedEventPayload(request))
        {
            var timeZoneId = EventTimeZoneService.DefaultLegacyTimeZoneId;
            var eventDateTime = _eventTimeZoneService.BuildLegacyEventDateTimeUtc(
                request.EventDate ?? default,
                timeZoneId);

            return new EventData(
                EventDate: _eventTimeZoneService.GetLegacyEventDateUtc(eventDateTime, timeZoneId),
                HostNames: normalizedName,
                EventDateTime: eventDateTime,
                TimeZoneId: timeZoneId,
                LocationName: string.Empty,
                LocationAddress: string.Empty,
                LocationMapsUrl: string.Empty,
                CeremonyInfo: string.Empty,
                DressCode: string.Empty,
                CoverImageUrl: string.Empty);
        }

        return BuildEnrichedEventData(
            request.HostNames,
            request.EventDateTime,
            request.TimeZoneId,
            request.LocationName,
            request.LocationAddress,
            request.LocationMapsUrl,
            request.CeremonyInfo,
            request.DressCode,
            request.CoverImageUrl);
    }

    private EventData BuildEventData(UpdateEventRequest request, string normalizedName)
    {
        _ = normalizedName;

        return BuildEnrichedEventData(
            request.HostNames,
            request.EventDateTime,
            request.TimeZoneId,
            request.LocationName,
            request.LocationAddress,
            request.LocationMapsUrl,
            request.CeremonyInfo,
            request.DressCode,
            request.CoverImageUrl);
    }

    private EventData BuildEnrichedEventData(
        string? hostNames,
        DateTimeOffset? eventDateTime,
        string? timeZoneId,
        string? locationName,
        string? locationAddress,
        string? locationMapsUrl,
        string? ceremonyInfo,
        string? dressCode,
        string? coverImageUrl)
    {
        var normalizedHostNames = NormalizeRequiredText(hostNames, "nomes do casal", MaxHostNamesLength);
        var normalizedTimeZoneId = _eventTimeZoneService.NormalizeSupportedTimeZoneId(timeZoneId);

        if (!eventDateTime.HasValue)
            throw new DomainValidationException("Data e hora do evento são obrigatórias.");

        var normalizedEventDateTime = _eventTimeZoneService.NormalizeEventDateTimeUtc(eventDateTime.Value, normalizedTimeZoneId);

        return new EventData(
            EventDate: _eventTimeZoneService.GetLegacyEventDateUtc(normalizedEventDateTime, normalizedTimeZoneId),
            HostNames: normalizedHostNames,
            EventDateTime: normalizedEventDateTime,
            TimeZoneId: normalizedTimeZoneId,
            LocationName: NormalizeRequiredText(locationName, "nome do local", MaxLocationNameLength),
            LocationAddress: NormalizeRequiredText(locationAddress, "endereço do local", MaxLocationAddressLength),
            LocationMapsUrl: NormalizeRequiredUrl(locationMapsUrl, "link do Maps"),
            CeremonyInfo: NormalizeRequiredText(ceremonyInfo, "informações da cerimônia", MaxCeremonyInfoLength),
            DressCode: NormalizeRequiredText(dressCode, "traje", MaxDressCodeLength),
            CoverImageUrl: NormalizeOptionalUrl(coverImageUrl, "imagem de capa"));
    }

    private static bool HasEnrichedEventPayload(CreateEventRequest request)
    {
        return request.EventDateTime.HasValue
            || !string.IsNullOrWhiteSpace(request.TimeZoneId)
            || !string.IsNullOrWhiteSpace(request.HostNames)
            || !string.IsNullOrWhiteSpace(request.LocationName)
            || !string.IsNullOrWhiteSpace(request.LocationAddress)
            || !string.IsNullOrWhiteSpace(request.LocationMapsUrl)
            || !string.IsNullOrWhiteSpace(request.CeremonyInfo)
            || !string.IsNullOrWhiteSpace(request.DressCode)
            || !string.IsNullOrWhiteSpace(request.CoverImageUrl);
    }

    private static bool HasEnrichedEventPayload(UpdateEventRequest request)
    {
        return request.EventDateTime.HasValue
            || !string.IsNullOrWhiteSpace(request.TimeZoneId)
            || !string.IsNullOrWhiteSpace(request.HostNames)
            || !string.IsNullOrWhiteSpace(request.LocationName)
            || !string.IsNullOrWhiteSpace(request.LocationAddress)
            || !string.IsNullOrWhiteSpace(request.LocationMapsUrl)
            || !string.IsNullOrWhiteSpace(request.CeremonyInfo)
            || !string.IsNullOrWhiteSpace(request.DressCode)
            || !string.IsNullOrWhiteSpace(request.CoverImageUrl);
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

    private static string NormalizeEventName(string? name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainValidationException("Nome do evento é obrigatório.");

        var normalizedName = name.Trim();
        if (normalizedName.Length > MaxEventNameLength)
            throw new DomainValidationException("Nome do evento excede o tamanho máximo permitido.");

        InputThreatValidator.EnsureSafeText(normalizedName, "nome do evento");
        return normalizedName;
    }

    private static string NormalizeRequiredText(string? value, string fieldLabel, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new DomainValidationException($"O campo '{fieldLabel}' é obrigatório.");

        var normalized = value.Trim();
        if (normalized.Length > maxLength)
            throw new DomainValidationException($"O campo '{fieldLabel}' excede o tamanho máximo permitido.");

        InputThreatValidator.EnsureSafeText(normalized, fieldLabel);
        return normalized;
    }

    private static string NormalizeRequiredUrl(string? value, string fieldLabel)
    {
        var normalized = NormalizeRequiredText(value, fieldLabel, MaxUrlLength);

        if (!Uri.TryCreate(normalized, UriKind.Absolute, out var uri)
            || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
        {
            throw new DomainValidationException($"O campo '{fieldLabel}' deve ser uma URL válida.");
        }

        return normalized;
    }

    private static string NormalizeOptionalText(string? value, string fieldLabel, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
            return string.Empty;

        var normalized = value.Trim();
        if (normalized.Length > maxLength)
            throw new DomainValidationException($"O campo '{fieldLabel}' excede o tamanho máximo permitido.");

        InputThreatValidator.EnsureSafeText(normalized, fieldLabel);
        return normalized;
    }

    private static string NormalizeOptionalUrl(string? value, string fieldLabel)
    {
        if (string.IsNullOrWhiteSpace(value))
            return string.Empty;

        return NormalizeRequiredUrl(value, fieldLabel);
    }

    private sealed record EventData(
        DateTime EventDate,
        string HostNames,
        DateTime EventDateTime,
        string TimeZoneId,
        string LocationName,
        string LocationAddress,
        string LocationMapsUrl,
        string CeremonyInfo,
        string DressCode,
        string CoverImageUrl);
}
