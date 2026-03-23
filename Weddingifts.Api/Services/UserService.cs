using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Weddingifts.Api.Data;
using Weddingifts.Api.Entities;
using Weddingifts.Api.Exceptions;
using Weddingifts.Api.Models;
using Weddingifts.Api.Security;

namespace Weddingifts.Api.Services;

public class UserService
{
    private static readonly Regex EmailRegex = new(
        @"^[^@\s]+@[^@\s]+\.[^@\s]{2,}$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

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
            throw new DomainValidationException("Nome é obrigatório.");

        if (string.IsNullOrWhiteSpace(request.Email))
            throw new DomainValidationException("E-mail é obrigatório.");

        if (!IsValidEmail(request.Email))
            throw new DomainValidationException("E-mail inválido.");

        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
            throw new DomainValidationException("A senha deve conter pelo menos 6 caracteres.");

        var normalizedCpf = NormalizeCpf(request.Cpf);

        if (request.BirthDate == default)
            throw new DomainValidationException("Data de nascimento é obrigatória.");

        var normalizedBirthDate = NormalizeBirthDate(request.BirthDate);

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var emailInUse = await _context.Users.AnyAsync(u => u.Email.ToLower() == normalizedEmail);
        if (emailInUse)
            throw new DomainValidationException("E-mail já cadastrado.");

        var cpfInUse = await _context.Users.AnyAsync(u => u.Cpf == normalizedCpf);
        if (cpfInUse)
            throw new DomainValidationException("CPF já cadastrado.");

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
        return CpfValidator.NormalizeAndValidate(rawCpf);
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
            throw new DomainValidationException("Data de nascimento não pode ser futura.");

        return utcDate;
    }

    private static bool IsValidEmail(string email)
    {
        return EmailRegex.IsMatch(email.Trim());
    }
}
