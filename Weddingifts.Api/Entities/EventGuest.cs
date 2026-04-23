namespace Weddingifts.Api.Entities;

public class EventGuest
{
    public int Id { get; set; }

    public int EventId { get; set; }

    public string Cpf { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string PhoneNumber { get; set; } = string.Empty;

    public int MaxExtraGuests { get; set; }

    public RsvpStatus RsvpStatus { get; set; } = RsvpStatus.Pending;

    public DateTime? RsvpRespondedAt { get; set; }

    public string? MessageToCouple { get; set; }

    public string? DietaryRestrictions { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Event Event { get; set; } = null!;

    public List<EventGuestCompanion> Companions { get; set; } = new();
}
