using Weddingifts.Api.Entities;

namespace Weddingifts.Api.Models;

public sealed class EventStatusSummaryResponse
{
    public int ConfirmedGuestCount { get; init; }
    public int DeclinedGuestCount { get; init; }
    public int PendingGuestCount { get; init; }
    public int CompanionCount { get; init; }
    public int ReservedGiftCount { get; init; }
    public int AvailableGiftCount { get; init; }

    public static EventStatusSummaryResponse FromEntity(Event ev)
    {
        var confirmedGuestCount = ev.Guests.Count(guest => guest.RsvpStatus == RsvpStatus.Accepted);
        var declinedGuestCount = ev.Guests.Count(guest => guest.RsvpStatus == RsvpStatus.Declined);
        var pendingGuestCount = Math.Max(0, ev.Guests.Count - confirmedGuestCount - declinedGuestCount);

        return new EventStatusSummaryResponse
        {
            ConfirmedGuestCount = confirmedGuestCount,
            DeclinedGuestCount = declinedGuestCount,
            PendingGuestCount = pendingGuestCount,
            CompanionCount = ev.Guests.Sum(guest => guest.Companions.Count),
            ReservedGiftCount = ev.Gifts.Sum(gift => gift.ReservedQuantity),
            AvailableGiftCount = ev.Gifts.Sum(gift => Math.Max(0, gift.Quantity - gift.ReservedQuantity))
        };
    }
}
