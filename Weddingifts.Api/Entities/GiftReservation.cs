namespace Weddingifts.Api.Entities;

public class GiftReservation
{
    public int Id { get; set; }

    public int EventId { get; set; }

    public int GiftId { get; set; }

    public string GuestCpf { get; set; } = string.Empty;

    public int ReservedQuantity { get; set; }

    public int UnreservedQuantity { get; set; }

    public DateTime ReservedAt { get; set; } = DateTime.UtcNow;

    public DateTime? LastReservedAt { get; set; }

    public DateTime? LastUnreservedAt { get; set; }

    public DateTime? UnreservedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Event Event { get; set; } = null!;

    public Gift Gift { get; set; } = null!;
}
