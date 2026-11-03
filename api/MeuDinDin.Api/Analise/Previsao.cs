using MeuDinDin.Api.Dados;

namespace MeuDinDin.Api.Analise;

/// <summary>Previsão do próximo mês para uma categoria (ou "Total").</summary>
/// <param name="Previsto">Valor mais provável.</param>
/// <param name="Minimo">Limite inferior da faixa de 80%.</param>
/// <param name="Maximo">Limite superior da faixa de 80%.</param>
/// <param name="Historico">Gasto em cada um dos meses de <see cref="PrevisaoDto.Meses"/>.</param>
public sealed record PrevisaoCategoriaDto(string Categoria, decimal Previsto, decimal Minimo, decimal Maximo, decimal Media, IReadOnlyList<decimal> Historico);

/// <summary>Previsão de gastos do próximo mês.</summary>
/// <param name="Meses">Meses fechados usados no modelo ("yyyy-MM").</param>
public sealed record PrevisaoDto(IReadOnlyList<string> Meses, PrevisaoCategoriaDto Total, IReadOnlyList<PrevisaoCategoriaDto> Categorias);

/// <summary>
/// Suavização exponencial de Holt (nível + tendência) com busca em grade de alpha e beta.
/// Mesmo algoritmo do motor WebAssembly do app (web/wasm/motor.ts).
/// </summary>
public static class Previsao
{
    public static (double Previsto, double Sigma) Holt(IReadOnlyList<double> serie)
    {
        var n = serie.Count;
        if (n == 0) return (0, 0);
        if (n < 3) return (serie.Average(), 0);

        double melhorSse = double.PositiveInfinity, melhorA = 0.5, melhorB = 0.1;
        for (var ia = 1; ia <= 19; ia++)
        for (var ib = 1; ib <= 19; ib++)
        {
            double a = ia * 0.05, b = ib * 0.05, nivel = serie[0], tend = serie[1] - serie[0], sse = 0;
            for (var t = 1; t < n; t++)
            {
                var erro = serie[t] - (nivel + tend);
                sse += erro * erro;
                var novo = a * serie[t] + (1 - a) * (nivel + tend);
                tend = b * (novo - nivel) + (1 - b) * tend;
                nivel = novo;
            }
            if (sse < melhorSse) (melhorSse, melhorA, melhorB) = (sse, a, b);
        }

        double nv = serie[0], td = serie[1] - serie[0];
        for (var t = 1; t < n; t++)
        {
            var novo = melhorA * serie[t] + (1 - melhorA) * (nv + td);
            td = melhorB * (novo - nv) + (1 - melhorB) * td;
            nv = novo;
        }
        return (Math.Max(0, nv + td), Math.Sqrt(melhorSse / (n - 1)));
    }

    public static PrevisaoDto Calcular(IReadOnlyList<TransacaoLinha> ts, DateOnly hoje)
    {
        var meses = SaudeFinanceira.MesesAnteriores(6, hoje);
        List<double> Serie(string? cat) => meses.Select(m => (double)ts
            .Where(t => t.EhDespesa && t.Data.ToString("yyyy-MM") == m && (cat is null || t.Categoria == cat))
            .Sum(t => t.Valor)).ToList();

        PrevisaoCategoriaDto Calc(string nome, List<double> serie)
        {
            var inicio = serie.FindIndex(v => v > 0);
            var util = inicio < 0 ? new List<double>() : serie.Skip(inicio).ToList();
            var (p, sigma) = Holt(util);
            var media = util.Count > 0 ? util.Average() : 0;
            static decimal R(double v) => Math.Round((decimal)v, 2);
            return new(nome, R(p), R(Math.Max(0, p - 1.28 * sigma)), R(p + 1.28 * sigma), R(media), serie.Select(R).ToList());
        }

        var categorias = ts.Where(t => t.EhDespesa).Select(t => t.Categoria).Distinct()
            .Select(c => Calc(c, Serie(c)))
            .Where(p => p.Historico.Count(v => v > 0) >= 3) // menos que isso não forma padrão
            .OrderByDescending(p => p.Previsto)
            .ToList();
        return new(meses, Calc("Total", Serie(null)), categorias);
    }
}
