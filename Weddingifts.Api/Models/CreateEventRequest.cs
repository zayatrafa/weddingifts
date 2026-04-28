namespace Weddingifts.Api.Models;

public class CreateEventRequest
{
    public int UserId { get; set; }

    public string Name { get; set; } = string.Empty;

    public DateTime? EventDate { get; set; }

    public string? HostNames { get; set; }

    public DateTimeOffset? EventDateTime { get; set; }

    public string? TimeZoneId { get; set; }

    public string? LocationName { get; set; }

    public string? LocationAddress { get; set; }

    public string? LocationMapsUrl { get; set; }

    public string? CeremonyInfo { get; set; }

    public string? DressCode { get; set; }

    public string? CoverImageUrl { get; set; }

    public string? InvitationMessage { get; set; }
}
