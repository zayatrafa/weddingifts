namespace Weddingifts.Api.Entities;

public class EventGuest
{
    public int Id { get; set; }

    public int EventId { get; set; }

    public string Cpf { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string PhoneNumber { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Event Event { get; set; } = null!;
}
