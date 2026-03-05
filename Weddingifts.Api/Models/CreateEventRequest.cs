public class CreateEventRequest
{
    public int UserId { get; set; }

    public string Name { get; set; } = string.Empty;

    public DateTime EventDate { get; set; }
}