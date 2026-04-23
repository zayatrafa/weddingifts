namespace Weddingifts.Api.Models;

public sealed class UpdateEventGuestRequest
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public int? MaxExtraGuests { get; set; }
}
