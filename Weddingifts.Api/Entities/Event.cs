namespace Weddingifts.Api.Entities;

public class Event
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public string Name { get; set; } = string.Empty;

    public DateTime EventDate { get; set; }

    public string Slug { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;

    public List<Gift> Gifts { get; set; } = new();
    public List<EventGuest> Guests { get; set; } = new();
    public List<GiftReservation> GiftReservations { get; set; } = new();
}
