using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Weddingifts.Api.Data;
using Weddingifts.Api.Middleware;
using Weddingifts.Api.Security;
using Weddingifts.Api.Services;

var builder = WebApplication.CreateBuilder(args);
var isTestingEnvironment = builder.Environment.IsEnvironment("Testing");
var isFrontendSmokeEnvironment = builder.Environment.IsEnvironment("FrontendSmoke");

if (isTestingEnvironment || isFrontendSmokeEnvironment)
{
    builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
    {
        ["ConnectionStrings:DefaultConnection"] = isFrontendSmokeEnvironment
            ? $"Data Source={Path.Combine(builder.Environment.ContentRootPath, "weddingifts.frontend-smoke.db")}"
            : "Host=localhost;Port=5432;Database=weddingifts_tests;Username=test;Password=test",
        ["Jwt:Issuer"] = isFrontendSmokeEnvironment ? "Weddingifts.Api.FrontendSmoke" : "Weddingifts.Api.Tests",
        ["Jwt:Audience"] = isFrontendSmokeEnvironment ? "Weddingifts.Web.FrontendSmoke" : "Weddingifts.Web.Tests",
        ["Jwt:Key"] = isFrontendSmokeEnvironment
            ? "Weddingifts_FrontendSmoke_Jwt_Key_1234567890!"
            : "Weddingifts_Testing_Jwt_Key_1234567890!",
        ["Jwt:ExpiresMinutes"] = "180"
    });
}

builder.Services
    .AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping;
    });

builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var firstError = context.ModelState
            .FirstOrDefault(entry => entry.Value is not null && entry.Value.Errors.Count > 0);

        var rawField = firstError.Key;
        var firstErrorMessage = firstError.Value?.Errors.FirstOrDefault()?.ErrorMessage ?? string.Empty;
        var normalizedField = NormalizeFieldName(rawField, firstErrorMessage);
        var displayField = GetDisplayFieldName(normalizedField);
        var hasJsonConversionError = firstErrorMessage.Contains("could not be converted", StringComparison.OrdinalIgnoreCase);

        var detail = hasJsonConversionError && IsDateField(normalizedField)
            ? $"Não foi possível validar o campo '{displayField}'. Use o formato de data AAAA-MM-DD."
            : hasJsonConversionError && normalizedField.Equals("request", StringComparison.OrdinalIgnoreCase)
            ? "Não foi possível validar os dados enviados. Verifique os campos de data e use o formato AAAA-MM-DD."
            : string.IsNullOrWhiteSpace(displayField)
            ? "Não foi possível validar os dados enviados."
            : $"Não foi possível validar o campo '{displayField}'.";

        var problem = new ValidationProblemDetails(context.ModelState)
        {
            Title = "Erro de validação",
            Status = StatusCodes.Status400BadRequest,
            Detail = detail,
            Instance = context.HttpContext.Request.Path
        };

        problem.Errors.Clear();
        problem.Errors.Add(normalizedField, new[] { detail });

        var result = new BadRequestObjectResult(problem);
        result.ContentTypes.Add("application/problem+json");
        return result;
    };
});

if (!isTestingEnvironment && !isFrontendSmokeEnvironment)
{
    builder.Services.AddRateLimiter(options =>
    {
        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
        options.OnRejected = async (context, cancellationToken) =>
        {
            context.HttpContext.Response.ContentType = "application/problem+json";

            await context.HttpContext.Response.WriteAsJsonAsync(new ProblemDetails
            {
                Title = "Muitas requisições",
                Status = StatusCodes.Status429TooManyRequests,
                Detail = "Você excedeu o limite de requisições. Tente novamente em instantes.",
                Instance = context.HttpContext.Request.Path
            }, cancellationToken);
        };

        options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
        {
            var remoteIp = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var path = httpContext.Request.Path.Value?.ToLowerInvariant() ?? string.Empty;

            var isSensitivePath = path.Contains("/api/auth/login")
                || (path == "/api/users" && httpContext.Request.Method == HttpMethods.Post)
                || (path.Contains("/api/gifts/") && path.EndsWith("/reserve"))
                || (path.Contains("/api/gifts/") && path.EndsWith("/unreserve"));

            if (isSensitivePath)
            {
                return RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: $"sensitive:{remoteIp}",
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 10,
                        Window = TimeSpan.FromMinutes(1),
                        QueueLimit = 0,
                        AutoReplenishment = true
                    });
            }

            return RateLimitPartition.GetFixedWindowLimiter(
                partitionKey: $"default:{remoteIp}",
                factory: _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 120,
                    Window = TimeSpan.FromMinutes(1),
                    QueueLimit = 0,
                    AutoReplenishment = true
                });
        });
    });
}

static string NormalizeFieldName(string rawField, string errorMessage)
{
    if (string.IsNullOrWhiteSpace(rawField))
        return InferFieldFromErrorMessage(errorMessage);

    var field = rawField.Trim();

    if (field == "$")
        return InferFieldFromErrorMessage(errorMessage);

    if (field.StartsWith("$.", StringComparison.Ordinal))
        field = field[2..];

    if (field.Contains('.'))
        field = field.Split('.').Last();

    return string.IsNullOrWhiteSpace(field) ? InferFieldFromErrorMessage(errorMessage) : field;
}

static bool IsDateField(string normalizedField)
{
    return normalizedField.Equals("birthDate", StringComparison.OrdinalIgnoreCase)
        || normalizedField.Equals("eventDate", StringComparison.OrdinalIgnoreCase)
        || normalizedField.Equals("eventDateTime", StringComparison.OrdinalIgnoreCase);
}

static bool IsMissingOrPlaceholder(string? value)
{
    return string.IsNullOrWhiteSpace(value)
        || value.Contains("__SET_IN_USER_SECRETS_OR_ENV__", StringComparison.Ordinal);
}

static string InferFieldFromErrorMessage(string errorMessage)
{
    if (errorMessage.Contains("birthdate", StringComparison.OrdinalIgnoreCase))
        return "birthDate";

    if (errorMessage.Contains("email", StringComparison.OrdinalIgnoreCase))
        return "email";

    if (errorMessage.Contains("cpf", StringComparison.OrdinalIgnoreCase))
        return "cpf";

    if (errorMessage.Contains("eventdate", StringComparison.OrdinalIgnoreCase))
        return "eventDate";

    if (errorMessage.Contains("eventdatetime", StringComparison.OrdinalIgnoreCase))
        return "eventDateTime";

    if (errorMessage.Contains("timezoneid", StringComparison.OrdinalIgnoreCase))
        return "timeZoneId";

    if (errorMessage.Contains("phonenumber", StringComparison.OrdinalIgnoreCase)
        || errorMessage.Contains("phone", StringComparison.OrdinalIgnoreCase)
        || errorMessage.Contains("celular", StringComparison.OrdinalIgnoreCase)
        || errorMessage.Contains("telefone", StringComparison.OrdinalIgnoreCase))
        return "phoneNumber";

    return "request";
}

static string GetDisplayFieldName(string normalizedField)
{
    return normalizedField.ToLowerInvariant() switch
    {
        "name" => "nome",
        "email" => "e-mail",
        "password" => "senha",
        "confirmpassword" => "confirmação de senha",
        "cpf" => "CPF",
        "birthdate" => "data de nascimento",
        "eventdate" => "data do evento",
        "eventdatetime" => "data e hora do evento",
        "timezoneid" => "fuso do evento",
        "phonenumber" => "celular",
        "price" => "preço",
        "quantity" => "quantidade",
        _ => normalizedField
    };
}

var jwtOptions = builder.Configuration.GetSection("Jwt").Get<JwtTokenOptions>()
    ?? throw new InvalidOperationException("JWT options are not configured.");

if (IsMissingOrPlaceholder(jwtOptions.Key) || Encoding.UTF8.GetByteCount(jwtOptions.Key) < 32)
{
    throw new InvalidOperationException(
        "JWT signing key must be configured with at least 32 bytes. Configure 'Jwt:Key' via User Secrets or environment variable."
    );
}

builder.Services.AddSingleton(jwtOptions);
builder.Services.AddSingleton<JwtTokenService>();

builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<EventTimeZoneService>();
builder.Services.AddScoped<EventRsvpService>();
builder.Services.AddScoped<EventService>();
builder.Services.AddScoped<GiftService>();
builder.Services.AddScoped<EventGuestService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<PasswordHasherService>();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidAudience = jwtOptions.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Key)),
            ClockSkew = TimeSpan.FromSeconds(30)
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Bearer {token}\"",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("WeddingiftsWeb", policy =>
    {
        if (builder.Environment.IsDevelopment() || isFrontendSmokeEnvironment)
        {
            policy
                .SetIsOriginAllowed(_ => true)
                .AllowAnyHeader()
                .AllowAnyMethod();
        }
        else
        {
            policy
                .WithOrigins("http://localhost:5500", "http://127.0.0.1:5500")
                .AllowAnyHeader()
                .AllowAnyMethod();
        }
    });
});

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

if (!isFrontendSmokeEnvironment && IsMissingOrPlaceholder(connectionString))
{
    throw new InvalidOperationException(
        "Connection string 'DefaultConnection' is not configured. Configure 'ConnectionStrings:DefaultConnection' via User Secrets or environment variable."
    );
}

builder.Services.AddDbContext<AppDbContext>(options =>
{
    if (isFrontendSmokeEnvironment)
    {
        options.UseSqlite(connectionString!);
        return;
    }

    options.UseNpgsql(connectionString!);
});

var app = builder.Build();

if (isFrontendSmokeEnvironment)
{
    using var smokeScope = app.Services.CreateScope();
    var smokeDbContext = smokeScope.ServiceProvider.GetRequiredService<AppDbContext>();
    smokeDbContext.Database.EnsureDeleted();
    smokeDbContext.Database.EnsureCreated();
}
else if (!isTestingEnvironment)
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    dbContext.Database.Migrate();
}

app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseMiddleware<GlobalExceptionMiddleware>();

if (app.Environment.IsDevelopment() || isFrontendSmokeEnvironment)
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseHsts();
    app.UseHttpsRedirection();
}
app.UseCors("WeddingiftsWeb");
if (!isTestingEnvironment && !isFrontendSmokeEnvironment)
{
    app.UseRateLimiter();
}
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

public partial class Program
{
}


