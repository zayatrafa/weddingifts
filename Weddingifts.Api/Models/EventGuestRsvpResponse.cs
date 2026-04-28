using Weddingifts.Api.Entities;

namespace Weddingifts.Api.Models;

public sealed class EventGuestRsvpResponse
{
    public int EventId { get; init; }
    public string EventSlug { get; init; } = string.Empty;
    public int GuestId { get; init; }
    public string GuestCpf { get; init; } = string.Empty;
    public string GuestName { get; init; } = string.Empty;
    public int MaxExtraGuests { get; init; }
    public string RsvpStatus { get; init; } = string.Empty;
    public DateTime? RsvpRespondedAt { get; init; }
    public string? MessageToCouple { get; init; }
    public string? DietaryRestrictions { get; init; }
    public bool HasCompletedInvitationFlow { get; init; }
    public DateTime? InvitationFlowCompletedAt { get; init; }
    public IReadOnlyList<EventGuestCompanionResponse> Companions { get; init; } = [];

    public static EventGuestRsvpResponse FromEntity(Event ev, EventGuest guest)
    {
        return new EventGuestRsvpResponse
        {
            EventId = ev.Id,
            EventSlug = ev.Slug,
            GuestId = guest.Id,
            GuestCpf = guest.Cpf,
            GuestName = guest.Name,
            MaxExtraGuests = guest.MaxExtraGuests,
            RsvpStatus = guest.RsvpStatus.ToString().ToLowerInvariant(),
            RsvpRespondedAt = guest.RsvpRespondedAt,
            MessageToCouple = guest.MessageToCouple,
            DietaryRestrictions = guest.DietaryRestrictions,
            HasCompletedInvitationFlow = guest.InvitationFlowCompletedAt.HasValue,
            InvitationFlowCompletedAt = guest.InvitationFlowCompletedAt,
            Companions = guest.Companions
                .OrderBy(companion => companion.CreatedAt)
                .Select(EventGuestCompanionResponse.FromEntity)
                .ToList()
        };
    }
}
