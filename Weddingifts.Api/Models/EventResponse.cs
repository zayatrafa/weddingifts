using Weddingifts.Api.Entities;

namespace Weddingifts.Api.Models;

public sealed class EventResponse
{
    public int Id { get; init; }
    public int UserId { get; init; }
    public string Name { get; init; } = string.Empty;
    public string HostNames { get; init; } = string.Empty;
    public DateTime EventDate { get; init; }
    public DateTime EventDateTime { get; init; }
    public string TimeZoneId { get; init; } = string.Empty;
    public string LocationName { get; init; } = string.Empty;
    public string LocationAddress { get; init; } = string.Empty;
    public string LocationMapsUrl { get; init; } = string.Empty;
    public string CeremonyInfo { get; init; } = string.Empty;
    public string DressCode { get; init; } = string.Empty;
    public string CoverImageUrl { get; init; } = string.Empty;
    public string InvitationMessage { get; init; } = string.Empty;
    public string Slug { get; init; } = string.Empty;
    public DateTime CreatedAt { get; init; }
    public IReadOnlyList<GiftResponse> Gifts { get; init; } = [];
    public int GuestCount { get; init; }

    public static EventResponse FromEntity(Event ev)
    {
        return new EventResponse
        {
            Id = ev.Id,
            UserId = ev.UserId,
            Name = ev.Name,
            HostNames = ev.HostNames,
            EventDate = ev.EventDate,
            EventDateTime = ev.EventDateTime,
            TimeZoneId = ev.TimeZoneId,
            LocationName = ev.LocationName,
            LocationAddress = ev.LocationAddress,
            LocationMapsUrl = ev.LocationMapsUrl,
            CeremonyInfo = ev.CeremonyInfo,
            DressCode = ev.DressCode,
            CoverImageUrl = ev.CoverImageUrl,
            InvitationMessage = ev.InvitationMessage,
            Slug = ev.Slug,
            CreatedAt = ev.CreatedAt,
            Gifts = ev.Gifts.Select(GiftResponse.FromEntity).ToList(),
            GuestCount = ev.Guests.Count
        };
    }
}
