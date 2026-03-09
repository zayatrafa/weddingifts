using Weddingifts.Api.Entities;

namespace Weddingifts.Api.Models;

public sealed class EventResponse
{
    public int Id { get; init; }
    public int UserId { get; init; }
    public string Name { get; init; } = string.Empty;
    public DateTime EventDate { get; init; }
    public string Slug { get; init; } = string.Empty;
    public DateTime CreatedAt { get; init; }
    public IReadOnlyList<GiftResponse> Gifts { get; init; } = [];

    public static EventResponse FromEntity(Event ev)
    {
        return new EventResponse
        {
            Id = ev.Id,
            UserId = ev.UserId,
            Name = ev.Name,
            EventDate = ev.EventDate,
            Slug = ev.Slug,
            CreatedAt = ev.CreatedAt,
            Gifts = ev.Gifts.Select(GiftResponse.FromEntity).ToList()
        };
    }
}
