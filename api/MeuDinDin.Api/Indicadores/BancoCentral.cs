using System.Globalization;
using System.Net.Http.Json;
using MeuDinDin.Api.Configuracao;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace MeuDinDin.Api.Indicadores;

/// <summary>Taxas usadas nos cálculos de investimento.</summary>
/// <param name="Selic">Meta Selic definida pelo Copom, % ao ano.</param>
/// <param name="Cdi">CDI anualizado (base 252), % ao ano.</param>
/// <param name="Ipca12m">IPCA acumulado nos últimos 12 meses, %.</param>
/// <param name="DataReferencia">Data do dado mais recente entre as séries.</param>
/// <param name="Fonte">"banco-central" quando veio do SGS; "referencia" quando o BC não respondeu e valem os valores do appsettings.</param>
public sealed record IndicadoresDto(decimal Selic, decimal Cdi, decimal Ipca12m, DateOnly DataReferencia, string Fonte);

/// <summary>
/// Busca indicadores no Sistema Gerenciador de Séries Temporais (SGS) do Banco Central,
/// com cache em memória. Séries: 432 (meta Selic), 4389 (CDI anualizado base 252), 13522 (IPCA 12 meses).
/// </summary>
public sealed class BancoCentral(HttpClient http, IMemoryCache cache, IOptions<IndicadoresOptions> opcoes, ILogger<BancoCentral> log)
{
    private const int SerieSelic = 432, SerieCdi = 4389, SerieIpca12m = 13522;
    private sealed record PontoSgs(string Data, string Valor);

    public async Task<IndicadoresDto> Obter(CancellationToken ct)
    {
        if (cache.TryGetValue("indicadores", out IndicadoresDto? emCache) && emCache is not null) return emCache;
        IndicadoresDto resultado;
        try
        {
            var selic = Ultimo(SerieSelic, ct);
            var cdi = Ultimo(SerieCdi, ct);
            var ipca = Ultimo(SerieIpca12m, ct);
            await Task.WhenAll(selic, cdi, ipca);
            var data = new[] { selic.Result.Data, cdi.Result.Data, ipca.Result.Data }.Max();
            resultado = new(selic.Result.Valor, cdi.Result.Valor, ipca.Result.Valor, data, "banco-central");
            cache.Set("indicadores", resultado, TimeSpan.FromHours(opcoes.Value.CacheHoras));
        }
        catch (Exception e) when (e is HttpRequestException or TaskCanceledException or FormatException or InvalidOperationException or System.Text.Json.JsonException)
        {
            log.LogWarning(e, "Banco Central indisponível; usando indicadores de referência");
            var r = opcoes.Value.Referencia;
            resultado = new(r.Selic, r.Cdi, r.Ipca12m, r.DataReferencia, "referencia");
            cache.Set("indicadores", resultado, TimeSpan.FromMinutes(15)); // tenta de novo em breve
        }
        return resultado;
    }

    private async Task<(decimal Valor, DateOnly Data)> Ultimo(int serie, CancellationToken ct)
    {
        var pontos = await http.GetFromJsonAsync<List<PontoSgs>>(
            $"dados/serie/bcdata.sgs.{serie}/dados/ultimos/1?formato=json", ct)
            ?? throw new InvalidOperationException($"Série {serie} vazia");
        var p = pontos.Last();
        return (decimal.Parse(p.Valor, CultureInfo.InvariantCulture),
                DateOnly.ParseExact(p.Data, "dd/MM/yyyy", CultureInfo.InvariantCulture));
    }
}
