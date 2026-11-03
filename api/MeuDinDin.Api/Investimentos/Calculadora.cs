using MeuDinDin.Api.Dados;
using MeuDinDin.Api.Indicadores;

namespace MeuDinDin.Api.Investimentos;

/// <summary>Produtos de renda fixa suportados.</summary>
public enum TipoProduto { Poupanca, TesouroSelic, TesouroPrefixado, TesouroIPCA, CDB, LCI, LCA }

/// <summary>Como a taxa contratada deve ser lida.</summary>
public enum Indexador { pos_cdi, pre, ipca, selic, poupanca }

/// <summary>Classe de rendimento usada na alocação.</summary>
public enum Classe { PosFixado, Inflacao, Prefixado }

internal sealed record Produto(TipoProduto Tipo, string Nome, Indexador Indexador, decimal TaxaPadrao, bool IsentoIR);

/// <summary>
/// Regras de cálculo. Espelham web/src/lib/investimentos.ts para a tela e a API darem os mesmos números.
/// Estimativas: não consideram IOF (primeiros 30 dias), taxa de custódia da B3 nem a TR da poupança.
/// </summary>
public static class Calculadora
{
    internal static readonly IReadOnlyDictionary<TipoProduto, Produto> Produtos = new Dictionary<TipoProduto, Produto>
    {
        [TipoProduto.Poupanca] = new(TipoProduto.Poupanca, "Poupança", Indexador.poupanca, 0, true),
        [TipoProduto.TesouroSelic] = new(TipoProduto.TesouroSelic, "Tesouro Selic", Indexador.selic, 100, false),
        [TipoProduto.TesouroPrefixado] = new(TipoProduto.TesouroPrefixado, "Tesouro Prefixado", Indexador.pre, 13, false),
        [TipoProduto.TesouroIPCA] = new(TipoProduto.TesouroIPCA, "Tesouro IPCA+", Indexador.ipca, 7, false),
        [TipoProduto.CDB] = new(TipoProduto.CDB, "CDB", Indexador.pos_cdi, 105, false),
        [TipoProduto.LCI] = new(TipoProduto.LCI, "LCI", Indexador.pos_cdi, 92, true),
        [TipoProduto.LCA] = new(TipoProduto.LCA, "LCA", Indexador.pos_cdi, 92, true),
    };

    /// <summary>Referência educativa de divisão por perfil (%). Não é recomendação.</summary>
    public static readonly IReadOnlyDictionary<string, IReadOnlyDictionary<Classe, decimal>> ReferenciaPerfil =
        new Dictionary<string, IReadOnlyDictionary<Classe, decimal>>
        {
            ["Conservador"] = new Dictionary<Classe, decimal> { [Classe.PosFixado] = 70, [Classe.Inflacao] = 20, [Classe.Prefixado] = 10 },
            ["Moderado"] = new Dictionary<Classe, decimal> { [Classe.PosFixado] = 50, [Classe.Inflacao] = 30, [Classe.Prefixado] = 20 },
            ["Arrojado"] = new Dictionary<Classe, decimal> { [Classe.PosFixado] = 35, [Classe.Inflacao] = 35, [Classe.Prefixado] = 30 },
        };

    public static Classe ClasseDe(Indexador i) => i switch
    {
        Indexador.ipca => Classe.Inflacao,
        Indexador.pre => Classe.Prefixado,
        _ => Classe.PosFixado,
    };

    /// <summary>Taxa efetiva ao ano, em fração (0,12 = 12%).</summary>
    public static double TaxaAnual(Indexador indexador, double taxa, IndicadoresDto ind)
    {
        static double DeDiaria(double aa, double pct) => Math.Pow(1 + (Math.Pow(1 + aa / 100, 1.0 / 252) - 1) * (pct / 100), 252) - 1;
        return indexador switch
        {
            Indexador.pos_cdi => DeDiaria((double)ind.Cdi, taxa),
            Indexador.selic => DeDiaria((double)ind.Selic, taxa == 0 ? 100 : taxa),
            Indexador.pre => taxa / 100,
            Indexador.ipca => (1 + (double)ind.Ipca12m / 100) * (1 + taxa / 100) - 1,
            Indexador.poupanca => ind.Selic > 8.5m ? Math.Pow(1.005, 12) - 1 : (double)ind.Selic * 0.7 / 100,
            _ => 0,
        };
    }

    /// <summary>Tabela regressiva do IR na renda fixa (dias corridos).</summary>
    public static double AliquotaIR(int dias) => dias switch
    {
        <= 180 => 0.225,
        <= 360 => 0.20,
        <= 720 => 0.175,
        _ => 0.15,
    };

    public static PosicaoDto Posicao(InvestimentoLinha i, IndicadoresDto ind, DateOnly hoje)
    {
        var tipo = Enum.Parse<TipoProduto>(i.Tipo);
        var indexador = Enum.Parse<Indexador>(i.Indexador);
        var dias = Math.Max(0, hoje.DayNumber - i.DataAporte.DayNumber);
        var aa = TaxaAnual(indexador, (double)i.Taxa, ind);
        var bruto = (double)i.Valor * Math.Pow(1 + aa, dias / 365.0);
        var rendimento = bruto - (double)i.Valor;
        var ir = Produtos[tipo].IsentoIR ? 0 : Math.Max(0, rendimento) * AliquotaIR(dias);
        return new PosicaoDto(i.Id, tipo, Produtos[tipo].Nome, i.Emissor, indexador, i.Taxa, ClasseDe(indexador),
            i.Valor, R(bruto), R(rendimento), R(ir), R(bruto - ir), dias, R(aa * 100, 4), i.Vencimento, i.LiquidezDiaria);
    }

    /// <summary>Aporte mensal para chegar a <paramref name="alvo"/> (líquido de IR) em <paramref name="meses"/>.</summary>
    public static ResultadoObjetivoDto AporteNecessario(TipoProduto tipo, double taxa, double alvo, int meses, double inicial, IndicadoresDto ind)
    {
        var p = Produtos[tipo];
        var aa = TaxaAnual(p.Indexador, taxa, ind);
        var r = Math.Pow(1 + aa, 1.0 / 12) - 1;
        var g = Math.Pow(1 + r, meses);
        var s = r > 0 ? (g - 1) / r : meses;
        var t = p.IsentoIR ? 0 : AliquotaIR(meses * 30);
        var aporte = Math.Max(0, (alvo - (1 - t) * inicial * g - t * inicial) / ((1 - t) * s + t * meses));
        var aportado = inicial + aporte * meses;
        return new ResultadoObjetivoDto(tipo, p.Nome, (decimal)taxa, R(aporte), R(aportado), R(alvo - aportado), R(aa * 100, 4));
    }

    private static decimal R(double v, int casas = 2) => Math.Round((decimal)v, casas);
}

/// <summary>Uma aplicação com valores estimados até hoje.</summary>
public sealed record PosicaoDto(
    Guid Id, TipoProduto Tipo, string Produto, string Emissor, Indexador Indexador, decimal Taxa, Classe Classe,
    decimal Aplicado, decimal Bruto, decimal Rendimento, decimal ImpostoRenda, decimal Liquido, int Dias,
    decimal TaxaAnualEfetiva, DateOnly? Vencimento, bool LiquidezDiaria);

/// <summary>Quanto da carteira está em cada classe, comparado com a referência do perfil.</summary>
public sealed record AlocacaoDto(Classe Classe, decimal Valor, decimal Percentual, decimal Referencia);

/// <summary>Carteira consolidada.</summary>
public sealed record CarteiraDto(
    IndicadoresDto Indicadores, string Perfil, decimal TotalAplicado, decimal TotalBruto, decimal TotalLiquido,
    decimal RendimentoLiquido, IReadOnlyList<PosicaoDto> Posicoes, IReadOnlyList<AlocacaoDto> Alocacao);

/// <summary>Produto a comparar na simulação. Sem taxa, usa a taxa típica do produto.</summary>
public sealed record ProdutoSimulado(TipoProduto Tipo, decimal? Taxa);

/// <summary>Pedido de simulação de objetivo.</summary>
/// <param name="Alvo">Valor que você quer ter, líquido de IR (R$).</param>
/// <param name="Meses">Prazo em meses (1 a 480).</param>
/// <param name="Inicial">Valor que você já tem para começar (R$).</param>
/// <param name="Produtos">Produtos a comparar. Vazio compara todos.</param>
public sealed record SimulacaoRequest(decimal Alvo, int Meses, decimal Inicial, IReadOnlyList<ProdutoSimulado>? Produtos);

/// <summary>Resultado da simulação para um produto.</summary>
public sealed record ResultadoObjetivoDto(
    TipoProduto Tipo, string Produto, decimal Taxa, decimal AporteMensal, decimal TotalAportado,
    decimal RendimentoLiquido, decimal TaxaAnualEfetiva);

/// <summary>Resultado da simulação.</summary>
public sealed record SimulacaoDto(IndicadoresDto Indicadores, IReadOnlyList<ResultadoObjetivoDto> Resultados);
