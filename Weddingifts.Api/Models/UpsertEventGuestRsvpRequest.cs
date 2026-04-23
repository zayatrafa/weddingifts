namespace Weddingifts.Api.Models;

public sealed class UpsertEventGuestRsvpRequest
{
    public string GuestCpf { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? MessageToCouple { get; set; }
    public string? DietaryRestrictions { get; set; }
    public List<EventGuestCompanionRequest> Companions { get; set; } = [];
}
