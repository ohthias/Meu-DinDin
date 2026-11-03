using System.Reflection;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using MeuDinDin.Api.Configuracao;
using MeuDinDin.Api.Dados;
using MeuDinDin.Api.Endpoints;
using MeuDinDin.Api.Indicadores;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<SupabaseOptions>(builder.Configuration.GetSection("Supabase"));
builder.Services.Configure<IndicadoresOptions>(builder.Configuration.GetSection("Indicadores"));
var supabase = builder.Configuration.GetSection("Supabase").Get<SupabaseOptions>() ?? new();
var emissor = $"{supabase.Url.TrimEnd('/')}/auth/v1";

// ── Autenticação: o mesmo token do Supabase que o app já tem ────────────────
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.MapInboundClaims = false;
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidIssuer = emissor,
            ValidAudience = "authenticated",
            ClockSkew = TimeSpan.FromSeconds(30),
        };
        if (!string.IsNullOrEmpty(supabase.JwtSecret))
        {
            // Projetos com segredo JWT legado (HS256)
            o.TokenValidationParameters.IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(supabase.JwtSecret));
        }
        else
        {
            // Projetos com chaves assimétricas: valida pelas chaves públicas publicadas pelo Supabase
            o.TokenValidationParameters.IssuerSigningKeyResolver = (_, _, _, _) => ChavesSupabase.Obter($"{emissor}/.well-known/jwks.json");
        }
    });
builder.Services.AddAuthorization();

// ── Serviços ───────────────────────────────────────────────────────────────
builder.Services.AddHttpContextAccessor();
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient<SupabaseRest>(c => c.Timeout = TimeSpan.FromSeconds(20));
builder.Services.AddHttpClient<BancoCentral>(c =>
{
    c.BaseAddress = new Uri("https://api.bcb.gov.br/");
    c.Timeout = TimeSpan.FromSeconds(8);
});
builder.Services.AddProblemDetails();

// ── Limites de uso (por pessoa; sem login, por IP) ─────────────────────────
// Regras: 120 requisições por minuto no geral e 20 exportações por hora.
static string ChaveDeLimite(HttpContext ctx) =>
    ctx.User.FindFirst("sub")?.Value ?? ctx.Connection.RemoteIpAddress?.ToString() ?? "anonimo";

builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
        RateLimitPartition.GetSlidingWindowLimiter(ChaveDeLimite(ctx), _ => new SlidingWindowRateLimiterOptions
        {
            PermitLimit = 120, Window = TimeSpan.FromMinutes(1), SegmentsPerWindow = 6, QueueLimit = 0,
        }));
    o.AddPolicy("exportacao", ctx =>
        RateLimitPartition.GetFixedWindowLimiter(ChaveDeLimite(ctx), _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 20, Window = TimeSpan.FromHours(1), QueueLimit = 0,
        }));
    o.OnRejected = async (contexto, ct) =>
    {
        if (contexto.Lease.TryGetMetadata(MetadataName.RetryAfter, out var espera))
            contexto.HttpContext.Response.Headers.RetryAfter = ((int)espera.TotalSeconds).ToString();
        await contexto.HttpContext.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Status = StatusCodes.Status429TooManyRequests,
            Title = "Muitas requisições",
            Detail = "Você atingiu o limite de uso da API. Tente de novo em alguns minutos.",
        }, ct);
    };
});

// Enums como texto, tanto nas respostas quanto no esquema do Swagger
builder.Services.ConfigureHttpJsonOptions(o => o.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.Configure<Microsoft.AspNetCore.Mvc.JsonOptions>(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins(builder.Configuration.GetSection("Cors:Origens").Get<string[]>() ?? [])
    .AllowAnyHeader()
    .AllowAnyMethod()
    .WithExposedHeaders("Content-Disposition")));

// ── Swagger / OpenAPI ──────────────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Meu DinDin — API de análise",
        Version = "v1",
        Description = """
            Serviço de análise do Meu DinDin: indicadores do Banco Central, carteira e simulação de investimentos,
            saúde financeira, previsão de gastos e exportação de extratos.

            **Autenticação:** use o token de acesso da sessão do Supabase (o mesmo que o app usa).
            Clique em *Authorize* e cole só o token, sem o prefixo "Bearer".
            Os dados são lidos com o token do usuário, então as regras de acesso (RLS) do banco continuam valendo.

            **Erros** seguem o padrão Problem Details (RFC 9457).

            **Limites de uso:** 120 requisições por minuto por pessoa e 20 exportações por hora.
            Acima disso a resposta é 429, com o cabeçalho Retry-After.
            """,
    });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description = "Token de acesso do Supabase Auth",
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        [new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } }] = [],
    });
    // operationId = nome da rota: vira o nome das funções no cliente TypeScript gerado
    c.CustomOperationIds(api => api.ActionDescriptor.EndpointMetadata.OfType<IEndpointNameMetadata>().FirstOrDefault()?.EndpointName);
    c.SupportNonNullableReferenceTypes();
    c.UseAllOfToExtendReferenceSchemas();
    var xml = Path.Combine(AppContext.BaseDirectory, $"{Assembly.GetExecutingAssembly().GetName().Name}.xml");
    if (File.Exists(xml)) c.IncludeXmlComments(xml, includeControllerXmlComments: true);
});

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "v1");
    c.DocumentTitle = "Meu DinDin API";
    c.DisplayRequestDuration();
    c.EnablePersistAuthorization();
});
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter(); // depois da autenticação: o limite é por pessoa

app.MapGet("/health", () => TypedResults.Ok(new { status = "ok" }))
    .WithName("Health").WithTags("Sistema").WithSummary("Verifica se a API está no ar").AllowAnonymous();
app.MapearRotas();

app.Run();

/// <summary>Cache das chaves públicas (JWKS) do Supabase Auth.</summary>
internal static class ChavesSupabase
{
    private static IList<SecurityKey> _chaves = [];
    private static DateTime _validoAte = DateTime.MinValue;
    private static readonly HttpClient Http = new() { Timeout = TimeSpan.FromSeconds(10) };
    private static readonly Lock Trava = new();

    public static IEnumerable<SecurityKey> Obter(string url)
    {
        lock (Trava)
        {
            if (DateTime.UtcNow < _validoAte && _chaves.Count > 0) return _chaves;
            var json = Http.GetStringAsync(url).GetAwaiter().GetResult();
            _chaves = new JsonWebKeySet(json).GetSigningKeys();
            _validoAte = DateTime.UtcNow.AddHours(1);
            return _chaves;
        }
    }
}

public partial class Program;
