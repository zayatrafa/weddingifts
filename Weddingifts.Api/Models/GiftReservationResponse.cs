using Weddingifts.Api.Entities;

namespace Weddingifts.Api.Models;

public sealed class GiftReservationResponse
{
    public int Id { get; init; }
    public int EventId { get; init; }
    public int GiftId { get; init; }
    public string GiftName { get; init; } = string.Empty;
    public decimal GiftPrice { get; init; }
    public string GuestCpf { get; init; } = string.Empty;
    public int ReservedQuantity { get; init; }
    public int UnreservedQuantity { get; init; }
    public int ActiveQuantity { get; init; }
    public DateTime ReservedAt { get; init; }
    public DateTime? LastReservedAt { get; init; }
    public DateTime? LastUnreservedAt { get; init; }
    public DateTime? UnreservedAt { get; init; }
    public DateTime CreatedAt { get; init; }

    public static GiftReservationResponse FromEntity(GiftReservation reservation)
    {
        var activeQuantity = Math.Max(0, reservation.ReservedQuantity - reservation.UnreservedQuantity);

        return new GiftReservationResponse
        {
            Id = reservation.Id,
            EventId = reservation.EventId,
            GiftId = reservation.GiftId,
            GiftName = reservation.Gift?.Name ?? string.Empty,
            GiftPrice = reservation.Gift?.Price ?? 0m,
            GuestCpf = reservation.GuestCpf,
            ReservedQuantity = reservation.ReservedQuantity,
            UnreservedQuantity = reservation.UnreservedQuantity,
            ActiveQuantity = activeQuantity,
            ReservedAt = reservation.ReservedAt,
            LastReservedAt = reservation.LastReservedAt,
            LastUnreservedAt = reservation.LastUnreservedAt,
            UnreservedAt = reservation.UnreservedAt,
            CreatedAt = reservation.CreatedAt
        };
    }
}
