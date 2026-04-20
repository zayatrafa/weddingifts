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
    private const int MaxNameLength = 120;
    private const int MaxEmailLength = 255;
    private const int MinPasswordLength = 8;
    private const int MaxPasswordLength = 72;

    private static readonly Regex EmailRegex = new(
        @"^[^@\s]+@[^@\s]+\.[^@\s]{2,}$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private static readonly Regex NameRegex = new(
        @"^[A-Za-zÀ-ÖØ-öø-ÿ'-]+(?:\s+[A-Za-zÀ-ÖØ-öø-ÿ'-]+)*$",
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

        var normalizedName = request.Name.Trim();
        if (normalizedName.Length > MaxNameLength)
            throw new DomainValidationException("Nome excede o tamanho máximo permitido.");
        InputThreatValidator.EnsureSafeText(normalizedName, "nome");

        if (!IsValidPersonName(normalizedName))
            throw new DomainValidationException("Nome deve conter apenas letras.");

        if (string.IsNullOrWhiteSpace(request.Email))
            throw new DomainValidationException("E-mail é obrigatório.");

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        if (normalizedEmail.Length > MaxEmailLength)
            throw new DomainValidationException("E-mail excede o tamanho máximo permitido.");
        InputThreatValidator.EnsureSafeText(normalizedEmail, "e-mail");

        if (!IsValidEmail(normalizedEmail))
            throw new DomainValidationException("E-mail inválido.");

        ValidateNewPassword(request.Password, "A senha");

        var normalizedCpf = NormalizeCpf(request.Cpf);

        if (request.BirthDate == default)
            throw new DomainValidationException("Data de nascimento é obrigatória.");

        var normalizedBirthDate = NormalizeBirthDate(request.BirthDate);

        var emailInUse = await _context.Users.AnyAsync(u => u.Email.ToLower() == normalizedEmail);
        if (emailInUse)
            throw new DomainValidationException("E-mail já cadastrado.");

        var cpfInUse = await _context.Users.AnyAsync(u => u.Cpf == normalizedCpf);
        if (cpfInUse)
            throw new DomainValidationException("CPF já cadastrado.");

        var user = new User
        {
            Name = normalizedName,
            Email = normalizedEmail,
            PasswordHash = _passwordHasher.Hash(request.Password),
            Cpf = normalizedCpf,
            BirthDate = normalizedBirthDate
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return user;
    }

    public async Task ChangePassword(int userId, ChangePasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.CurrentPassword))
            throw new DomainValidationException("Senha atual é obrigatória.");

        if (request.CurrentPassword.Length > MaxPasswordLength)
            throw new DomainValidationException("Senha atual excede o tamanho máximo permitido.");

        ValidateNewPassword(request.NewPassword, "A nova senha");

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null)
            throw new ResourceNotFoundException("Usuário não encontrado.");

        if (!_passwordHasher.Verify(request.CurrentPassword, user.PasswordHash))
            throw new UnauthorizedRequestException("Senha atual incorreta.");

        if (request.CurrentPassword == request.NewPassword)
            throw new DomainValidationException("A nova senha deve ser diferente da senha atual.");

        user.PasswordHash = _passwordHasher.Hash(request.NewPassword);
        await _context.SaveChangesAsync();
    }

    public async Task<List<User>> GetUsers()
    {
        return await _context.Users
            .AsNoTracking()
            .OrderByDescending(u => u.Id)
            .ToListAsync();
    }

    private static void ValidateNewPassword(string password, string label)
    {
        if (string.IsNullOrWhiteSpace(password))
            throw new DomainValidationException($"{label} é obrigatória.");

        if (!IsStrongPassword(password))
            throw new DomainValidationException($"{label} deve ter no mínimo 8 caracteres e conter letras, números e caractere especial.");

        if (password.Length > MaxPasswordLength)
            throw new DomainValidationException($"{label} excede o tamanho máximo permitido.");
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
        return EmailRegex.IsMatch(email);
    }

    private static bool IsValidPersonName(string name)
    {
        return NameRegex.IsMatch(name);
    }

    private static bool IsStrongPassword(string password)
    {
        if (string.IsNullOrWhiteSpace(password) || password.Length < MinPasswordLength)
            return false;

        var hasLetter = password.Any(char.IsLetter);
        var hasDigit = password.Any(char.IsDigit);
        var hasSpecial = password.Any(ch => !char.IsLetterOrDigit(ch));

        return hasLetter && hasDigit && hasSpecial;
    }
}
