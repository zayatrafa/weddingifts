using Weddingifts.Api.Entities;

namespace Weddingifts.Api.Models;

public sealed class GiftResponse
{
    public int Id { get; init; }
    public int EventId { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public decimal Price { get; init; }
    public int Quantity { get; init; }
    public int ReservedQuantity { get; init; }
    public int AvailableQuantity { get; init; }
    public bool IsFullyReserved { get; init; }
    public string? ReservedBy { get; init; }
    public DateTime? ReservedAt { get; init; }
    public DateTime CreatedAt { get; init; }

    public static GiftResponse FromEntity(Gift gift)
    {
        var available = Math.Max(0, gift.Quantity - gift.ReservedQuantity);

        return new GiftResponse
        {
            Id = gift.Id,
            EventId = gift.EventId,
            Name = gift.Name,
            Description = gift.Description,
            Price = gift.Price,
            Quantity = gift.Quantity,
            ReservedQuantity = gift.ReservedQuantity,
            AvailableQuantity = available,
            IsFullyReserved = available == 0,
            ReservedBy = gift.ReservedBy,
            ReservedAt = gift.ReservedAt,
            CreatedAt = gift.CreatedAt
        };
    }
}
