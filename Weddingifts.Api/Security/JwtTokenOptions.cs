namespace Weddingifts.Api.Security;

public sealed class JwtTokenOptions
{
    public string Issuer { get; init; } = "Weddingifts.Api";
    public string Audience { get; init; } = "Weddingifts.Client";
    public string Key { get; init; } = string.Empty;
    public int ExpiresMinutes { get; init; } = 120;
}
