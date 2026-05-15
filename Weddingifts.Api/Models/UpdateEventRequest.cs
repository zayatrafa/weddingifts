namespace Weddingifts.Api.Models;

public sealed class UpdateEventRequest
{
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
    public string? FoodInfo { get; set; }
    public string? ScheduleInfo { get; set; }
    public List<string>? GalleryImageUrls { get; set; }
}
