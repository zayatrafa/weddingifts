namespace Weddingifts.Api.Entities;

public class Gift
{
    public int Id { get; set; }

    public int EventId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public decimal Price { get; set; }

    public int Quantity { get; set; }

    public int ReservedQuantity { get; set; }

    public string? ReservedBy { get; set; }

    public DateTime? ReservedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Event Event { get; set; } = null!;
}
