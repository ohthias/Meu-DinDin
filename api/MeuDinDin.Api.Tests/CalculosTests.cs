using System.Text;
using MeuDinDin.Api.Analise;
using MeuDinDin.Api.Dados;
using MeuDinDin.Api.Exportacao;
using MeuDinDin.Api.Indicadores;
using MeuDinDin.Api.Investimentos;
using Xunit;

namespace MeuDinDin.Api.Tests;

// Os valores esperados são os mesmos dos testes do app (web/src/lib/*.test.ts),
// garantindo que a API e a tela calculam igual.
public class CalculosTests
{
    private static readonly IndicadoresDto Ind = new(13.75m, 13.65m, 4.58m, new DateOnly(2026, 9, 16), "referencia");

    [Theory]
    [InlineData(100, 0.225)]
    [InlineData(181, 0.20)]
    [InlineData(500, 0.175)]
    [InlineData(800, 0.15)]
    public void Aliquota_segue_tabela_regressiva(int dias, double esperado) =>
        Assert.Equal(esperado, Calculadora.AliquotaIR(dias));

    [Fact]
    public void Cdb_100_do_cdi_rende_o_cdi() =>
        Assert.Equal(0.1365, Calculadora.TaxaAnual(Indexador.pos_cdi, 100, Ind), 4);

    [Fact]
    public void Ipca_mais_taxa_compoe() =>
        Assert.Equal(1.0458 * 1.07 - 1, Calculadora.TaxaAnual(Indexador.ipca, 7, Ind), 10);

    [Fact]
    public void Aporte_necessario_bate_o_alvo_liquido()
    {
        var r = Calculadora.AporteNecessario(TipoProduto.CDB, 105, 10000, 24, 1000, Ind);
        // reconstrói o valor líquido com o aporte calculado
        var aa = Calculadora.TaxaAnual(Indexador.pos_cdi, 105, Ind);
        var m = Math.Pow(1 + aa, 1.0 / 12) - 1;
        double bruto = 1000;
        for (var i = 0; i < 24; i++) bruto = bruto * (1 + m) + (double)r.AporteMensal;
        var aportado = 1000 + (double)r.AporteMensal * 24;
        var liquido = bruto - (bruto - aportado) * Calculadora.AliquotaIR(24 * 30);
        Assert.InRange(liquido, 9999, 10001);
    }

    [Fact]
    public void Holt_segue_tendencia_linear()
    {
        var (previsto, _) = Previsao.Holt([100, 110, 120, 130, 140, 150]);
        Assert.InRange(previsto, 155, 165);
    }

    [Fact]
    public void Csv_usa_ponto_e_virgula_e_virgula_decimal()
    {
        var t = new TransacaoLinha(Guid.NewGuid(), null, "manual", "despesa", 1234.5m, "Lazer", "Show; com amigos", "Pix", new DateOnly(2026, 11, 3));
        var texto = Encoding.UTF8.GetString(Extrato.GerarCsv([t], new Dictionary<Guid, string>()));
        Assert.Contains("03/11/2026;\"Show; com amigos\";Lazer;Saída;-1234,50;Pix;;Manual", texto);
    }

    [Fact]
    public void Ofx_tem_cabecalho_e_transacao()
    {
        var t = new TransacaoLinha(Guid.NewGuid(), null, "manual", "receita", 75m, "Freelance", "Arte & design", "Pix", new DateOnly(2026, 11, 2));
        var texto = Encoding.UTF8.GetString(Extrato.GerarOfx([t], new DateOnly(2026, 11, 1), new DateOnly(2026, 11, 30), "MEUDINDIN", null, DateTime.UtcNow));
        Assert.StartsWith("OFXHEADER:100", texto);
        Assert.Contains("<TRNTYPE>CREDIT<DTPOSTED>20261102<TRNAMT>75.00", texto);
        Assert.Contains("<NAME>Arte &amp; design", texto);
    }
}
