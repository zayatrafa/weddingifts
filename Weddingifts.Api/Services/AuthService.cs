using Microsoft.EntityFrameworkCore;
using Weddingifts.Api.Data;
using Weddingifts.Api.Exceptions;
using Weddingifts.Api.Models;
using Weddingifts.Api.Security;

namespace Weddingifts.Api.Services;

public sealed class AuthService
{
    private const int MaxEmailLength = 160;
    private const int MaxPasswordLength = 72;

    private readonly AppDbContext _context;
    private readonly PasswordHasherService _passwordHasher;
    private readonly JwtTokenService _jwtTokenService;

    public AuthService(
        AppDbContext context,
        PasswordHasherService passwordHasher,
        JwtTokenService jwtTokenService)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
    }

    public async Task<LoginResponse> Login(LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
            throw new DomainValidationException("E-mail é obrigatório.");

        if (request.Email.Trim().Length > MaxEmailLength)
            throw new DomainValidationException("E-mail excede o tamanho máximo permitido.");

        if (string.IsNullOrWhiteSpace(request.Password))
            throw new DomainValidationException("Senha é obrigatória.");

        if (request.Password.Length > MaxPasswordLength)
            throw new DomainValidationException("Senha excede o tamanho máximo permitido.");

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);
        if (user is null || !_passwordHasher.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedRequestException("E-mail ou senha inválidos.");

        var (token, expiresAt) = _jwtTokenService.GenerateToken(user);

        return new LoginResponse
        {
            Token = token,
            ExpiresAt = expiresAt,
            User = UserResponse.FromEntity(user)
        };
    }
}
