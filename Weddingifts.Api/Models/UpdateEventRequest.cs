namespace Weddingifts.Api.Models;

public sealed class UpdateEventRequest
{
    public string Name { get; set; } = string.Empty;
    public DateTime EventDate { get; set; }
}
