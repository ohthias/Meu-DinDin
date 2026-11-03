using MeuDinDin.Api.Analise;
using MeuDinDin.Api.Dados;
using MeuDinDin.Api.Exportacao;
using MeuDinDin.Api.Indicadores;
using MeuDinDin.Api.Investimentos;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;

namespace MeuDinDin.Api.Endpoints;

public static class Rotas
{
    private static DateOnly Hoje() => DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(DateTime.UtcNow, Fuso));
    private static readonly TimeZoneInfo Fuso = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");

    public static void MapearRotas(this WebApplication app)
    {
        var v1 = app.MapGroup("/api/v1").RequireAuthorization();

        // ── Indicadores ────────────────────────────────────────────────────
        app.MapGet("/api/v1/indicadores", async (BancoCentral bc, CancellationToken ct) => TypedResults.Ok(await bc.Obter(ct)))
            .WithName("ObterIndicadores")
            .WithTags("Indicadores")
            .WithSummary("Selic, CDI e IPCA em 12 meses")
            .WithDescription("Dados do Sistema Gerenciador de Séries Temporais do Banco Central, com cache. Se o BC não responder, devolve os valores de referência (campo `fonte` = \"referencia\"). Não exige login.")
            .AllowAnonymous();

        // ── Investimentos ──────────────────────────────────────────────────
        var inv = v1.MapGroup("/investimentos").WithTags("Investimentos");

        inv.MapGet("/carteira", async (SupabaseRest db, BancoCentral bc, CancellationToken ct) =>
        {
            var indTask = bc.Obter(ct);
            var investimentosTask = db.Investimentos(ct);
            var perfilTask = db.Perfil(ct);
            await Task.WhenAll(indTask, investimentosTask, perfilTask);
            var ind = indTask.Result;
            var hoje = Hoje();
            var posicoes = investimentosTask.Result.Where(i => i.ResgatadoEm is null)
                .Select(i => Calculadora.Posicao(i, ind, hoje)).ToList();
            var perfil = perfilTask.Result?.PerfilInvestidor ?? "Conservador";
            var referencia = Calculadora.ReferenciaPerfil.GetValueOrDefault(perfil) ?? Calculadora.ReferenciaPerfil["Conservador"];
            var totalLiquido = posicoes.Sum(p => p.Liquido);
            var alocacao = Enum.GetValues<Classe>().Select(c =>
            {
                var valor = posicoes.Where(p => p.Classe == c).Sum(p => p.Liquido);
                return new AlocacaoDto(c, valor, totalLiquido > 0 ? Math.Round(valor / totalLiquido * 100, 1) : 0, referencia[c]);
            }).ToList();
            return TypedResults.Ok(new CarteiraDto(ind, perfil, posicoes.Sum(p => p.Aplicado), posicoes.Sum(p => p.Bruto),
                totalLiquido, totalLiquido - posicoes.Sum(p => p.Aplicado), posicoes, alocacao));
        })
        .WithName("ObterCarteira")
        .WithSummary("Carteira com valores estimados até hoje")
        .WithDescription("Aplicações ativas com rendimento bruto, IR pela tabela regressiva e valor líquido, além da divisão por classe comparada à referência do perfil de investidor. Estimativas: não consideram IOF, taxa de custódia nem a TR.");

        inv.MapPost("/simular", async Task<Results<Ok<SimulacaoDto>, ValidationProblem>> ([FromBody] SimulacaoRequest req, BancoCentral bc, CancellationToken ct) =>
        {
            var erros = new Dictionary<string, string[]>();
            if (req.Alvo <= 0) erros["alvo"] = ["Informe um valor maior que zero."];
            if (req.Meses is < 1 or > 480) erros["meses"] = ["O prazo deve ficar entre 1 e 480 meses."];
            if (req.Inicial < 0) erros["inicial"] = ["O valor inicial não pode ser negativo."];
            if (erros.Count > 0) return TypedResults.ValidationProblem(erros);

            var ind = await bc.Obter(ct);
            var produtos = req.Produtos is { Count: > 0 }
                ? req.Produtos
                : Enum.GetValues<TipoProduto>().Select(t => new ProdutoSimulado(t, null)).ToList();
            var resultados = produtos
                .Select(p => Calculadora.AporteNecessario(p.Tipo, (double)(p.Taxa ?? Calculadora.Produtos[p.Tipo].TaxaPadrao),
                    (double)req.Alvo, req.Meses, (double)req.Inicial, ind))
                .OrderBy(r => r.AporteMensal)
                .ToList();
            return TypedResults.Ok(new SimulacaoDto(ind, resultados));
        })
        .WithName("SimularObjetivo")
        .WithSummary("Quanto investir por mês para chegar a um valor")
        .WithDescription("Calcula o aporte mensal necessário em cada produto para atingir o valor-alvo líquido de IR no prazo. Ordenado do menor aporte para o maior.");

        // ── Análise ────────────────────────────────────────────────────────
        var analise = v1.MapGroup("/analise").WithTags("Análise");

        analise.MapGet("/saude", async (SupabaseRest db, CancellationToken ct) =>
        {
            var hoje = Hoje();
            var ts = db.Transacoes(new DateOnly(hoje.Year, hoje.Month, 1).AddMonths(-6), null, null, ct);
            var contas = db.Contas(ct);
            var investimentos = db.Investimentos(ct);
            var orc = db.Orcamentos(hoje.Month, hoje.Year, ct);
            await Task.WhenAll(ts, contas, investimentos, orc);
            return TypedResults.Ok(SaudeFinanceira.Calcular(ts.Result, contas.Result, investimentos.Result, orc.Result, hoje));
        })
        .WithName("ObterSaudeFinanceira")
        .WithSummary("Pontuação de saúde financeira (0–100)")
        .WithDescription("Soma de seis critérios explicáveis: quanto você guarda (30), reserva de emergência (20), orçamento (15), acompanhamento (15), uso do cartão (10) e investimentos (10). Cada critério traz o detalhe do cálculo e uma dica.");

        analise.MapGet("/previsao", async (SupabaseRest db, CancellationToken ct) =>
        {
            var hoje = Hoje();
            var ts = await db.Transacoes(new DateOnly(hoje.Year, hoje.Month, 1).AddMonths(-6), null, null, ct);
            return TypedResults.Ok(Previsao.Calcular(ts, hoje));
        })
        .WithName("PreverGastos")
        .WithSummary("Previsão de gastos do próximo mês")
        .WithDescription("Modelo de Holt (nível e tendência) treinado nos últimos 6 meses fechados, por categoria e no total, com faixa de 80%.");

        // ── Extratos ───────────────────────────────────────────────────────
        v1.MapGet("/extratos/exportar", async Task<Results<FileContentHttpResult, ValidationProblem>> (
                [FromQuery] FormatoExtrato formato, [FromQuery] DateOnly de, [FromQuery] DateOnly ate, [FromQuery] Guid? contaId,
                SupabaseRest db, CancellationToken ct) =>
            {
                if (ate < de) return TypedResults.ValidationProblem(new Dictionary<string, string[]> { ["ate"] = ["A data final deve ser depois da inicial."] });
                if (ate.DayNumber - de.DayNumber > 3660) return TypedResults.ValidationProblem(new Dictionary<string, string[]> { ["de"] = ["O período máximo é de 10 anos."] });
                var tsTask = db.Transacoes(de, ate, contaId, ct);
                var contasTask = db.Contas(ct);
                await Task.WhenAll(tsTask, contasTask);
                var contas = contasTask.Result.ToDictionary(c => c.Id, c => c.Nome);
                var nome = $"extrato-{de:yyyy-MM-dd}-a-{ate:yyyy-MM-dd}";
                return formato switch
                {
                    FormatoExtrato.ofx => TypedResults.File(
                        Extrato.GerarOfx(tsTask.Result, de, ate, contaId?.ToString("N") ?? "MEUDINDIN",
                            contaId is { } id ? contasTask.Result.FirstOrDefault(c => c.Id == id)?.Saldo : null, DateTime.UtcNow),
                        "application/x-ofx", nome + ".ofx"),
                    _ => TypedResults.File(Extrato.GerarCsv(tsTask.Result, contas), "text/csv; charset=utf-8", nome + ".csv"),
                };
            })
            .WithName("ExportarExtrato")
            .WithTags("Extratos")
            .WithSummary("Exporta o extrato em CSV ou OFX")
            .WithDescription("CSV com separador \";\" e vírgula decimal (abre no Excel em português). OFX 1.0.2 para importar em outros gerenciadores financeiros. Período máximo de 10 anos.")
            .Produces(StatusCodes.Status200OK, contentType: "text/csv", additionalContentTypes: ["application/x-ofx"])
            .ProducesProblem(StatusCodes.Status429TooManyRequests)
            .RequireRateLimiting("exportacao");
    }
}
