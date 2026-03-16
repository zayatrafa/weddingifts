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

        var normalizedCpf = NormalizeCpf(request.Cpf);

        if (request.BirthDate == default)
            throw new DomainValidationException("Birth date is required.");

        var normalizedBirthDate = NormalizeBirthDate(request.BirthDate);

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var emailInUse = await _context.Users.AnyAsync(u => u.Email.ToLower() == normalizedEmail);
        if (emailInUse)
            throw new DomainValidationException("Email is already registered.");

        var cpfInUse = await _context.Users.AnyAsync(u => u.Cpf == normalizedCpf);
        if (cpfInUse)
            throw new DomainValidationException("CPF is already registered.");

        var user = new User
        {
            Name = request.Name.Trim(),
            Email = normalizedEmail,
            PasswordHash = _passwordHasher.Hash(request.Password),
            Cpf = normalizedCpf,
            BirthDate = normalizedBirthDate
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

    private static string NormalizeCpf(string? rawCpf)
    {
        var digits = new string((rawCpf ?? string.Empty).Where(char.IsDigit).ToArray());

        if (digits.Length != 11)
            throw new DomainValidationException("CPF must contain exactly 11 digits.");

        return digits;
    }

    private static DateTime NormalizeBirthDate(DateTime birthDate)
    {
        var utcDate = birthDate.Kind switch
        {
            DateTimeKind.Utc => birthDate.Date,
            DateTimeKind.Local => birthDate.ToUniversalTime().Date,
            _ => DateTime.SpecifyKind(birthDate, DateTimeKind.Utc).Date
        };

        if (utcDate > DateTime.UtcNow.Date)
            throw new DomainValidationException("Birth date cannot be in the future.");

        return utcDate;
    }
}
