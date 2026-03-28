using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Weddingifts.Api.Entities;

namespace Weddingifts.Api.Security;

public sealed class JwtTokenService
{
    private readonly JwtTokenOptions _options;

    public JwtTokenService(JwtTokenOptions options)
    {
        _options = options;
    }

    public (string Token, DateTime ExpiresAt) GenerateToken(User user)
    {
        var now = DateTime.UtcNow;
        var expiresAt = now.AddMinutes(_options.ExpiresMinutes <= 0 ? 120 : _options.ExpiresMinutes);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.Name),
            new(ClaimTypes.Email, user.Email),
            new("cpf", user.Cpf ?? string.Empty)
        };

        var credentials = new SigningCredentials(GetSigningKey(), SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            notBefore: now,
            expires: expiresAt,
            signingCredentials: credentials);

        var serialized = new JwtSecurityTokenHandler().WriteToken(token);
        return (serialized, expiresAt);
    }

    public SymmetricSecurityKey GetSigningKey()
    {
        if (string.IsNullOrWhiteSpace(_options.Key))
        {
            throw new InvalidOperationException("JWT signing key is not configured.");
        }

        var raw = Encoding.UTF8.GetBytes(_options.Key);
        if (raw.Length < 32)
        {
            throw new InvalidOperationException("JWT signing key must be at least 32 bytes.");
        }

        return new SymmetricSecurityKey(raw);
    }
}
