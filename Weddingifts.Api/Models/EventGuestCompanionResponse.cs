using Weddingifts.Api.Entities;

namespace Weddingifts.Api.Models;

public sealed class EventGuestCompanionResponse
{
    public int Id { get; init; }
    public int EventGuestId { get; init; }
    public string Name { get; init; } = string.Empty;
    public DateOnly BirthDate { get; init; }
    public string? Cpf { get; init; }
    public DateTime CreatedAt { get; init; }

    public static EventGuestCompanionResponse FromEntity(EventGuestCompanion companion)
    {
        return new EventGuestCompanionResponse
        {
            Id = companion.Id,
            EventGuestId = companion.EventGuestId,
            Name = companion.Name,
            BirthDate = companion.BirthDate,
            Cpf = companion.Cpf,
            CreatedAt = companion.CreatedAt
        };
    }
}
