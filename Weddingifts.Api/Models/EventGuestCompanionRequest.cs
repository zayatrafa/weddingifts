namespace Weddingifts.Api.Models;

public sealed class EventGuestCompanionRequest
{
    public string Name { get; set; } = string.Empty;
    public DateOnly BirthDate { get; set; }
    public string? Cpf { get; set; }
}
