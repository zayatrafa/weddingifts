using Weddingifts.Api.Entities;
using Weddingifts.Api.Exceptions;

namespace Weddingifts.Api.Services;

public sealed class EventTimeZoneService
{
    public const string DefaultLegacyTimeZoneId = "America/Sao_Paulo";

    private static readonly HashSet<string> SupportedBrazilianTimeZoneIds = new(StringComparer.Ordinal)
    {
        "America/Sao_Paulo",
        "America/Manaus",
        "America/Rio_Branco",
        "America/Campo_Grande",
        "America/Belem",
        "America/Fortaleza",
        "America/Recife",
        "America/Bahia",
        "America/Noronha"
    };

    public string NormalizeSupportedTimeZoneId(string? timeZoneId)
    {
        if (string.IsNullOrWhiteSpace(timeZoneId))
            throw new DomainValidationException("Fuso do evento é obrigatório.");

        var normalized = timeZoneId.Trim();
        if (!SupportedBrazilianTimeZoneIds.Contains(normalized))
            throw new DomainValidationException("Fuso do evento é inválido ou não suportado para o escopo atual.");

        _ = ResolveTimeZone(normalized);
        return normalized;
    }

    public TimeZoneInfo ResolveTimeZone(string timeZoneId)
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
        }
        catch (TimeZoneNotFoundException) when (TimeZoneInfo.TryConvertIanaIdToWindowsId(timeZoneId, out var windowsId))
        {
            return TimeZoneInfo.FindSystemTimeZoneById(windowsId);
        }
    }

    public DateTime NormalizeEventDateTimeUtc(DateTimeOffset eventDateTime, string timeZoneId)
    {
        var normalizedTimeZoneId = NormalizeSupportedTimeZoneId(timeZoneId);
        var timeZone = ResolveTimeZone(normalizedTimeZoneId);
        var localDateTime = DateTime.SpecifyKind(eventDateTime.DateTime, DateTimeKind.Unspecified);
        var expectedOffset = timeZone.GetUtcOffset(localDateTime);

        if (expectedOffset != eventDateTime.Offset)
        {
            throw new DomainValidationException("A data e hora do evento não correspondem ao fuso informado.");
        }

        var utcDateTime = eventDateTime.UtcDateTime;
        var localNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, timeZone);
        var eventLocalDateTime = TimeZoneInfo.ConvertTime(eventDateTime, timeZone).DateTime;

        if (eventLocalDateTime <= localNow)
        {
            throw new DomainValidationException("A data e hora do evento devem ser futuras.");
        }

        return DateTime.SpecifyKind(utcDateTime, DateTimeKind.Utc);
    }

    public DateTime BuildLegacyEventDateTimeUtc(DateTime eventDate, string timeZoneId)
    {
        var normalizedTimeZoneId = NormalizeSupportedTimeZoneId(timeZoneId);
        var timeZone = ResolveTimeZone(normalizedTimeZoneId);
        var localDate = NormalizeLegacyDateOnly(eventDate);
        var localDateTime = localDate.ToDateTime(new TimeOnly(12, 0), DateTimeKind.Unspecified);
        var localNow = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, timeZone));

        if (localDate <= localNow)
        {
            throw new DomainValidationException("A data do evento deve ser futura.");
        }

        return TimeZoneInfo.ConvertTimeToUtc(localDateTime, timeZone);
    }

    public DateTime ShiftEventDateUtcKeepingLocalTime(Event ev, DateTime eventDate)
    {
        var timeZone = ResolveTimeZone(ev.TimeZoneId);
        var localDate = NormalizeLegacyDateOnly(eventDate);
        var currentLocalDateTime = GetEventLocalDateTime(ev.EventDateTime, ev.TimeZoneId);
        var updatedLocalDateTime = localDate.ToDateTime(TimeOnly.FromDateTime(currentLocalDateTime), DateTimeKind.Unspecified);
        var localNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, timeZone);

        if (updatedLocalDateTime <= localNow)
        {
            throw new DomainValidationException("A data do evento deve ser futura.");
        }

        return TimeZoneInfo.ConvertTimeToUtc(updatedLocalDateTime, timeZone);
    }

    public DateTime GetLegacyEventDateUtc(DateTime eventDateTimeUtc, string timeZoneId)
    {
        var localDate = GetEventLocalDate(eventDateTimeUtc, timeZoneId);
        return DateTime.SpecifyKind(localDate.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
    }

    public DateTime GetEventLocalDateTime(DateTime eventDateTimeUtc, string timeZoneId)
    {
        var timeZone = ResolveTimeZone(timeZoneId);
        return TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(eventDateTimeUtc, DateTimeKind.Utc), timeZone);
    }

    public DateOnly GetEventLocalDate(DateTime eventDateTimeUtc, string timeZoneId)
    {
        return DateOnly.FromDateTime(GetEventLocalDateTime(eventDateTimeUtc, timeZoneId));
    }

    public int CalculateAgeOnEventDate(DateOnly birthDate, Event ev)
    {
        var eventLocalDate = GetEventLocalDate(ev.EventDateTime, ev.TimeZoneId);
        var age = eventLocalDate.Year - birthDate.Year;

        if (birthDate > eventLocalDate.AddYears(-age))
        {
            age--;
        }

        return age;
    }

    public static DateOnly NormalizeBirthDate(DateOnly birthDate)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        if (birthDate > today)
            throw new DomainValidationException("Data de nascimento não pode ser futura.");

        return birthDate;
    }

    private static DateOnly NormalizeLegacyDateOnly(DateTime eventDate)
    {
        if (eventDate == default)
            throw new DomainValidationException("Data do evento é obrigatória.");

        return DateOnly.FromDateTime(eventDate.Kind switch
        {
            DateTimeKind.Utc => eventDate,
            DateTimeKind.Local => eventDate.ToUniversalTime(),
            _ => DateTime.SpecifyKind(eventDate, DateTimeKind.Utc)
        });
    }
}
