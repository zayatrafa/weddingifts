namespace Weddingifts.Api.Services;

public static class CpfValidator
{
    public static string NormalizeAndValidate(string? rawCpf)
    {
        var digits = new string((rawCpf ?? string.Empty).Where(char.IsDigit).ToArray());

        if (digits.Length != 11)
            throw new Exceptions.DomainValidationException("CPF deve conter exatamente 11 dígitos.");

        if (!IsValid(digits))
            throw new Exceptions.DomainValidationException("CPF inválido. Verifique os dígitos informados.");

        return digits;
    }

    private static bool IsValid(string cpf)
    {
        if (cpf.Length != 11)
            return false;

        // Rejeita sequências repetidas: 000..., 111..., etc.
        if (cpf.All(ch => ch == cpf[0]))
            return false;

        var numbers = cpf.Select(ch => ch - '0').ToArray();

        var firstVerifier = CalculateVerifier(numbers, 9, 10);
        if (numbers[9] != firstVerifier)
            return false;

        var secondVerifier = CalculateVerifier(numbers, 10, 11);
        return numbers[10] == secondVerifier;
    }

    private static int CalculateVerifier(int[] numbers, int length, int initialWeight)
    {
        var sum = 0;
        for (var i = 0; i < length; i++)
        {
            sum += numbers[i] * (initialWeight - i);
        }

        var remainder = sum % 11;
        return remainder < 2 ? 0 : 11 - remainder;
    }
}
