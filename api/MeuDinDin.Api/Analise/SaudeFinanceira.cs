using System.Globalization;
using MeuDinDin.Api.Dados;

namespace MeuDinDin.Api.Analise;

/// <summary>Um dos critérios que formam a pontuação.</summary>
public sealed record ComponenteDto(string Id, string Nome, int Pontos, int Maximo, string Detalhe, string Dica);

/// <summary>Pontuação de saúde financeira de 0 a 100.</summary>
/// <param name="Faixa">Atenção (0–39), Em construção (40–69), Saudável (70–84) ou Excelente (85–100).</param>
public sealed record SaudeDto(int Pontuacao, string Faixa, IReadOnlyList<ComponenteDto> Componentes);

/// <summary>Mesma regra de web/src/lib/saude.ts.</summary>
public static class SaudeFinanceira
{
    private static readonly HashSet<string> Essenciais = ["Moradia", "Alimentação", "Saúde", "Transporte", "Educação"];
    private static readonly CultureInfo PtBr = CultureInfo.GetCultureInfo("pt-BR");

    private static double Lim(double v, double a = 0, double b = 1) => Math.Min(b, Math.Max(a, v));
    private static string Pct(double v) => $"{Math.Round(v * 100)}%";

    /// <summary>Chaves "yyyy-MM" dos <paramref name="n"/> meses fechados antes de <paramref name="hoje"/>.</summary>
    public static List<string> MesesAnteriores(int n, DateOnly hoje) =>
        Enumerable.Range(0, n).Select(i => new DateOnly(hoje.Year, hoje.Month, 1).AddMonths(-n + i).ToString("yyyy-MM")).ToList();

    public static SaudeDto Calcular(IReadOnlyList<TransacaoLinha> ts, IReadOnlyList<ContaLinha> contas,
        IReadOnlyList<InvestimentoLinha> investimentosTodos, IReadOnlyList<OrcamentoLinha> orcamentos, DateOnly hoje)
    {
        var investimentos = investimentosTodos.Where(i => i.ResgatadoEm is null).ToList();
        var ult3 = MesesAnteriores(3, hoje);
        var ult6 = MesesAnteriores(6, hoje);
        double DoMes(string m, bool receita, Func<TransacaoLinha, bool>? f = null) => (double)ts
            .Where(t => (receita ? t.EhReceita : t.EhDespesa) && t.Data.ToString("yyyy-MM") == m && (f is null || f(t)))
            .Sum(t => t.Valor);

        // 1. Poupança
        var rec3 = ult3.Sum(m => DoMes(m, true));
        var dep3 = ult3.Sum(m => DoMes(m, false));
        var taxa = rec3 > 0 ? (rec3 - dep3) / rec3 : 0;
        var c1 = new ComponenteDto("poupanca", "Quanto você guarda", (int)Math.Round(30 * Lim(taxa / 0.2)), 30,
            rec3 > 0 ? $"Nos últimos 3 meses você guardou {Pct(Math.Max(0, taxa))} do que entrou." : "Sem entradas registradas nos últimos 3 meses.",
            taxa >= 0.2 ? "Ótimo ritmo. Garanta que o que sobra vá para a reserva ou investimentos." : "A referência é guardar 20%. Separe o valor assim que o dinheiro entrar.");

        // 2. Reserva
        var essencial = ult3.Sum(m => DoMes(m, false, t => Essenciais.Contains(t.Categoria))) / 3;
        var liquido = (double)(contas.Where(c => c.Tipo != "cartao").Sum(c => Math.Max(0, c.Saldo))
                               + investimentos.Where(i => i.LiquidezDiaria).Sum(i => i.Valor));
        var meses = essencial > 0 ? liquido / essencial : 0;
        var c2 = new ComponenteDto("reserva", "Reserva de emergência", (int)Math.Round(20 * Lim(meses / 6)), 20,
            essencial > 0 ? $"Seu dinheiro com resgate rápido cobre {meses.ToString("0.#", PtBr)} meses de gastos essenciais." : "Registre gastos essenciais para calcular a cobertura.",
            meses >= 6 ? "Reserva completa. O que passar disso pode ir para objetivos de longo prazo." : "A referência é cobrir de 3 a 6 meses de gastos essenciais.");

        // 3. Orçamento
        var mesAtual = hoje.ToString("yyyy-MM");
        var orcMes = orcamentos.Where(o => o.Mes == hoje.Month && o.Ano == hoje.Year).ToList();
        var dentro = orcMes.Count(o => DoMes(mesAtual, false, t => t.Categoria == o.Categoria) <= (double)o.Limite);
        var c3 = new ComponenteDto("orcamento", "Orçamento", orcMes.Count > 0 ? (int)Math.Round(15.0 * dentro / orcMes.Count) : 0, 15,
            orcMes.Count > 0 ? $"{dentro} de {orcMes.Count} categorias dentro do limite neste mês." : "Nenhum limite definido neste mês.",
            orcMes.Count > 0 ? "Ajuste limites que estouram todo mês para algo realista." : "Defina limites em Orçamento para ganhar estes pontos.");

        // 4. Regularidade
        var comRegistro = ult6.Count(m => ts.Any(t => t.Data.ToString("yyyy-MM") == m));
        var c4 = new ComponenteDto("regularidade", "Acompanhamento", (int)Math.Round(15.0 * comRegistro / 6), 15,
            $"{comRegistro} dos últimos 6 meses têm movimentações registradas.",
            comRegistro >= 6 ? "Histórico completo: as previsões ficam mais precisas." : "Conectar o banco pelo Open Finance preenche o histórico sozinho.");

        // 5. Cartão
        var fatura = (double)contas.Where(c => c.Tipo == "cartao").Sum(c => c.Saldo);
        var renda = rec3 / 3;
        var uso = renda > 0 ? fatura / renda : fatura > 0 ? 1 : 0;
        var c5 = new ComponenteDto("credito", "Uso do cartão", (int)Math.Round(10 * Lim(1 - (uso - 0.3) / 0.7)), 10,
            fatura > 0 ? $"A fatura atual equivale a {Pct(uso)} da sua renda média." : "Sem fatura de cartão registrada.",
            uso <= 0.3 ? "Fatura sob controle." : "Faturas acima de 30% da renda apertam o mês seguinte. Evite o rotativo.");

        // 6. Investimentos
        var classes = investimentos.Select(i => i.Tipo switch { "TesouroIPCA" => "ipca", "TesouroPrefixado" => "pre", _ => "pos" }).Distinct().Count();
        var c6 = new ComponenteDto("investimentos", "Investimentos", (investimentos.Count > 0 ? 5 : 0) + (classes >= 2 ? 5 : 0), 10,
            investimentos.Count > 0 ? $"{investimentos.Count} aplicações em {classes} {(classes == 1 ? "tipo" : "tipos")} de rendimento." : "Nenhum investimento registrado.",
            classes >= 2 ? "Diversificado entre tipos de rendimento." : "Depois da reserva, misturar pós-fixado e inflação reduz riscos.");

        var componentes = new[] { c1, c2, c3, c4, c5, c6 };
        var total = componentes.Sum(c => c.Pontos);
        var faixa = total >= 85 ? "Excelente" : total >= 70 ? "Saudável" : total >= 40 ? "Em construção" : "Atenção";
        return new SaudeDto(total, faixa, componentes);
    }
}
