using Microsoft.AspNetCore.Mvc;
using Weddingifts.Api.Exceptions;

namespace Weddingifts.Api.Middleware;

public sealed class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IHostEnvironment _environment;

    public GlobalExceptionMiddleware(RequestDelegate next, IHostEnvironment environment)
    {
        _next = next;
        _environment = environment;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex, _environment);
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception exception, IHostEnvironment environment)
    {
        var (statusCode, title) = exception switch
        {
            DomainValidationException => (StatusCodes.Status400BadRequest, "Erro de validação"),
            UnauthorizedRequestException => (StatusCodes.Status401Unauthorized, "Não autorizado"),
            ForbiddenOperationException => (StatusCodes.Status403Forbidden, "Acesso negado"),
            ResourceNotFoundException => (StatusCodes.Status404NotFound, "Recurso não encontrado"),
            _ => (StatusCodes.Status500InternalServerError, "Erro inesperado no servidor")
        };

        var detail = statusCode == StatusCodes.Status500InternalServerError
            ? (environment.IsEnvironment("Testing") ? exception.Message : "Ocorreu um erro inesperado. Tente novamente em instantes.")
            : exception.Message;

        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/problem+json";

        var problem = new ProblemDetails
        {
            Title = title,
            Status = statusCode,
            Detail = detail,
            Instance = context.Request.Path
        };

        await context.Response.WriteAsJsonAsync(problem);
    }
}
