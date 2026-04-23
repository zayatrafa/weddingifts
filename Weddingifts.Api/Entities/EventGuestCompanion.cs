namespace Weddingifts.Api.Entities;

public class EventGuestCompanion
{
    public int Id { get; set; }

    public int EventGuestId { get; set; }

    public string Name { get; set; } = string.Empty;

    public DateOnly BirthDate { get; set; }

    public string? Cpf { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public EventGuest EventGuest { get; set; } = null!;
}
