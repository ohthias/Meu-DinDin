namespace MeuDinDin.Api.Configuracao;

/// <summary>Conexão com o projeto Supabase (seção "Supabase" do appsettings).</summary>
public sealed class SupabaseOptions
{
    public string Url { get; set; } = "";
    /// <summary>Chave pública (anon). Vai no header apikey; o RLS usa o token do usuário.</summary>
    public string AnonKey { get; set; } = "";
    /// <summary>Opcional: segredo JWT legado (HS256). Sem ele, a API valida tokens pelas chaves públicas (JWKS) do projeto.</summary>
    public string JwtSecret { get; set; } = "";
}

/// <summary>Seção "Indicadores" do appsettings.</summary>
public sealed class IndicadoresOptions
{
    public int CacheHoras { get; set; } = 6;
    public ReferenciaIndicadores Referencia { get; set; } = new();
}

/// <summary>Valores usados quando o Banco Central não responde.</summary>
public sealed class ReferenciaIndicadores
{
    public decimal Selic { get; set; } = 13.75m;
    public decimal Cdi { get; set; } = 13.65m;
    public decimal Ipca12m { get; set; } = 4.58m;
    public DateOnly DataReferencia { get; set; } = new(2026, 9, 16);
}
