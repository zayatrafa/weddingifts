using Microsoft.EntityFrameworkCore;
using Weddingifts.Api.Data;
using Weddingifts.Api.Entities;
using Weddingifts.Api.Exceptions;
using Weddingifts.Api.Models;
using Weddingifts.Api.Security;

namespace Weddingifts.Api.Services;

public class UserService
{
    private readonly AppDbContext _context;
    private readonly PasswordHasherService _passwordHasher;

    public UserService(AppDbContext context, PasswordHasherService passwordHasher)
    {
        _context = context;
        _passwordHasher = passwordHasher;
    }

    public async Task<User> CreateUser(CreateUserRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            throw new DomainValidationException("Name is required.");

        if (string.IsNullOrWhiteSpace(request.Email))
            throw new DomainValidationException("Email is required.");

        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
            throw new DomainValidationException("Password must contain at least 6 characters.");

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var emailInUse = await _context.Users.AnyAsync(u => u.Email.ToLower() == normalizedEmail);
        if (emailInUse)
            throw new DomainValidationException("Email is already registered.");

        var user = new User
        {
            Name = request.Name.Trim(),
            Email = normalizedEmail,
            PasswordHash = _passwordHasher.Hash(request.Password)
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return user;
    }

    public async Task<List<User>> GetUsers()
    {
        return await _context.Users
            .AsNoTracking()
            .OrderByDescending(u => u.Id)
            .ToListAsync();
    }
}
