namespace Weddingifts.Api.Entities;

public class Gift
{
    public int Id { get; set; }

    // FK para o evento dono da lista
    public int EventId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public decimal Price { get; set; }

    public int Quantity { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navegação
    public Event Event { get; set; } = null!;
}