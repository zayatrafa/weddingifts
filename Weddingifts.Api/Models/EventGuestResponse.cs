using Weddingifts.Api.Entities;

namespace Weddingifts.Api.Models;

public sealed class EventGuestResponse
{
    public int Id { get; init; }
    public int EventId { get; init; }
    public string Cpf { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string PhoneNumber { get; init; } = string.Empty;
    public DateTime CreatedAt { get; init; }

    public static EventGuestResponse FromEntity(EventGuest guest)
    {
        return new EventGuestResponse
        {
            Id = guest.Id,
            EventId = guest.EventId,
            Cpf = guest.Cpf,
            Name = guest.Name,
            Email = guest.Email,
            PhoneNumber = guest.PhoneNumber,
            CreatedAt = guest.CreatedAt
        };
    }
}
