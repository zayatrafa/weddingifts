using System.Text.RegularExpressions;
using Weddingifts.Api.Exceptions;

namespace Weddingifts.Api.Services;

public static class InputThreatValidator
{
    private static readonly Regex SuspiciousSqlPattern = new(
        @"(--|/\*|\*/|;|@@|\bxp_|\b(exec(ute)?|union|select|insert|update|delete|drop|alter|create|truncate|declare|cast|waitfor|shutdown)\b)",
        RegexOptions.Compiled | RegexOptions.CultureInvariant | RegexOptions.IgnoreCase);

    private static readonly Regex SuspiciousTautologyPattern = new(
        @"(\bor\b|\band\b)\s+\d+\s*=\s*\d+|'\s*(or|and)\s*'",
        RegexOptions.Compiled | RegexOptions.CultureInvariant | RegexOptions.IgnoreCase);

    public static void EnsureSafeText(string? value, string fieldLabel)
    {
        if (string.IsNullOrWhiteSpace(value))
            return;

        var normalized = value.Trim();

        if (SuspiciousSqlPattern.IsMatch(normalized) || SuspiciousTautologyPattern.IsMatch(normalized))
            throw new DomainValidationException($"O campo '{fieldLabel}' contém conteúdo inválido.");
    }
}
