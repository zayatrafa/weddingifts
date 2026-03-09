namespace Weddingifts.Api.Exceptions;

public sealed class UnauthorizedRequestException : Exception
{
    public UnauthorizedRequestException(string message) : base(message)
    {
    }
}
