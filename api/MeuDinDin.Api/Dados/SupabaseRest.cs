using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using MeuDinDin.Api.Configuracao;
using Microsoft.Extensions.Options;

namespace MeuDinDin.Api.Dados;

/// <summary>
/// Lê dados do Supabase pela API REST (PostgREST) usando o token do próprio usuário.
/// Assim o Row Level Security continua valendo: a API nunca vê dados de outra pessoa.
/// </summary>
public sealed class SupabaseRest(HttpClient http, IOptions<SupabaseOptions> opcoes, IHttpContextAccessor contexto)
{
    internal static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
    };

    private async Task<List<T>> Get<T>(string caminho, CancellationToken ct)
    {
        using var req = new HttpRequestMessage(HttpMethod.Get, $"{opcoes.Value.Url.TrimEnd('/')}/rest/v1/{caminho}");
        req.Headers.Add("apikey", opcoes.Value.AnonKey);
        var auth = contexto.HttpContext?.Request.Headers.Authorization.ToString();
        if (!string.IsNullOrEmpty(auth)) req.Headers.Authorization = AuthenticationHeaderValue.Parse(auth);
        using var res = await http.SendAsync(req, ct);
        res.EnsureSuccessStatusCode();
        return await res.Content.ReadFromJsonAsync<List<T>>(Json, ct) ?? [];
    }

    private static string D(DateOnly d) => d.ToString("yyyy-MM-dd");

    public Task<List<TransacaoLinha>> Transacoes(DateOnly? de, DateOnly? ate, Guid? contaId, CancellationToken ct)
    {
        var filtros = new List<string> { "select=id,conta_id,origem,tipo,valor,categoria,descricao,forma_pagamento,data", "order=data.desc", "limit=10000" };
        if (de is { } a) filtros.Add($"data=gte.{D(a)}");
        if (ate is { } b) filtros.Add($"data=lte.{D(b)}");
        if (contaId is { } c) filtros.Add($"conta_id=eq.{c}");
        return Get<TransacaoLinha>("transacoes?" + string.Join('&', filtros), ct);
    }

    public Task<List<ContaLinha>> Contas(CancellationToken ct) =>
        Get<ContaLinha>("contas?select=id,conexao_id,origem,nome,tipo,instituicao,numero,saldo,limite_credito", ct);

    public Task<List<InvestimentoLinha>> Investimentos(CancellationToken ct) =>
        Get<InvestimentoLinha>("investimentos?select=id,tipo,valor,data_aporte,indexador,taxa,emissor,vencimento,liquidez_diaria,resgatado_em,valor_resgate&order=data_aporte.desc", ct);

    public Task<List<OrcamentoLinha>> Orcamentos(int mes, int ano, CancellationToken ct) =>
        Get<OrcamentoLinha>($"orcamentos?select=id,categoria,limite,mes,ano&mes=eq.{mes}&ano=eq.{ano}", ct);

    public async Task<PerfilLinha?> Perfil(CancellationToken ct) =>
        (await Get<PerfilLinha>("profiles?select=id,nome,perfil_investidor&limit=1", ct)).FirstOrDefault();
}
