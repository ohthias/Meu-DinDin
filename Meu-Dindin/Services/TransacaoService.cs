using Microsoft.EntityFrameworkCore;
using Meu_Dindin.Data;
using Meu_Dindin.DTOs;
using Meu_DinDin.Models;

namespace Meu_Dindin.Services;

public class TransacaoService(AppDbContext db)
{
    // ── CRUD ──────────────────────────────────────────────────────────────────
    public async Task<TransacaoResponse> AdicionarAsync(int usuarioId, TransacaoRequest req)
    {
        var t = new Transacao
        {
            UsuarioId      = usuarioId,
            Tipo           = req.Tipo.ToLower(),
            Valor          = req.Valor,
            Categoria      = req.Categoria,
            Descricao      = req.Descricao,
            FormaPagamento = req.FormaPagamento,
            Data           = req.Data.Date
        };
        db.Transacoes.Add(t);
        await db.SaveChangesAsync();
        return ToDto(t);
    }

    public async Task<List<TransacaoResponse>> ListarAsync(int usuarioId, int mes, int ano)
    {
        return await db.Transacoes
            .Where(t => t.UsuarioId == usuarioId
                     && t.Data.Month == mes
                     && t.Data.Year  == ano)
            .OrderByDescending(t => t.Data)
            .Select(t => ToDto(t))
            .ToListAsync();
    }

    public async Task<List<TransacaoResponse>> ListarTodasAsync(int usuarioId)
    {
        return await db.Transacoes
            .Where(t => t.UsuarioId == usuarioId)
            .OrderByDescending(t => t.Data)
            .Select(t => ToDto(t))
            .ToListAsync();
    }

    public async Task<bool> RemoverAsync(int usuarioId, int id)
    {
        var t = await db.Transacoes
            .FirstOrDefaultAsync(t => t.Id == id && t.UsuarioId == usuarioId);
        if (t is null) return false;
        db.Transacoes.Remove(t);
        await db.SaveChangesAsync();
        return true;
    }

    // ── Resumo ────────────────────────────────────────────────────────────────
    public async Task<ResumoFinanceiroResponse> ObterResumoAsync(int usuarioId, int mes, int ano)
    {
        var transacoes = await db.Transacoes
            .Where(t => t.UsuarioId == usuarioId
                     && t.Data.Month == mes
                     && t.Data.Year  == ano)
            .ToListAsync();

        var receitas  = transacoes.Where(t => t.Tipo == "receita").Sum(t => t.Valor);
        var despesas  = transacoes.Where(t => t.Tipo == "despesa").Sum(t => t.Valor);
        var saldo     = receitas - despesas;
        var economia  = Math.Max(0, saldo);
        var pctEcon   = receitas > 0 ? Math.Round(economia / receitas * 100, 1) : 0;

        var porCat = transacoes
            .Where(t => t.Tipo == "despesa")
            .GroupBy(t => t.Categoria)
            .Select(g => new CategoriaGastoDto(
                g.Key,
                g.Sum(t => t.Valor),
                despesas > 0 ? Math.Round(g.Sum(t => t.Valor) / despesas * 100, 1) : 0))
            .OrderByDescending(c => c.Total)
            .ToList();

        var maiorCat  = porCat.FirstOrDefault();
        var previsao  = await PreverProximoMesAsync(usuarioId, mes, ano);

        return new ResumoFinanceiroResponse(
            receitas, despesas, saldo, economia, pctEcon,
            previsao, maiorCat?.Categoria ?? "-", maiorCat?.Total ?? 0, porCat);
    }

    // ── Evolução mensal (últimos N meses) ─────────────────────────────────────
    public async Task<List<EvolucaoMensalDto>> EvolucaoMensalAsync(int usuarioId, int meses = 5)
    {
        var resultado = new List<EvolucaoMensalDto>();
        var agora = DateTime.UtcNow;

        for (int i = meses - 1; i >= 0; i--)
        {
            var ref_ = agora.AddMonths(-i);
            var lista = await db.Transacoes
                .Where(t => t.UsuarioId == usuarioId
                         && t.Data.Month == ref_.Month
                         && t.Data.Year  == ref_.Year)
                .ToListAsync();

            var rec = lista.Where(t => t.Tipo == "receita").Sum(t => t.Valor);
            var dep = lista.Where(t => t.Tipo == "despesa").Sum(t => t.Valor);
            resultado.Add(new EvolucaoMensalDto(
                ref_.ToString("MMM", new System.Globalization.CultureInfo("pt-BR")),
                rec, dep, rec - dep));
        }

        // Previsão do próximo mês
        var prev = await PreverProximoMesAsync(usuarioId, agora.Month, agora.Year);
        var proxRef = agora.AddMonths(1);
        resultado.Add(new EvolucaoMensalDto(
            proxRef.ToString("MMM*", new System.Globalization.CultureInfo("pt-BR")),
            0, 0, prev));

        return resultado;
    }

    // ── Previsão simples (média dos últimos 3 meses) ──────────────────────────
    private async Task<decimal> PreverProximoMesAsync(int usuarioId, int mes, int ano)
    {
        var saldos = new List<decimal>();
        var ref_   = new DateTime(ano, mes, 1);
        for (int i = 1; i <= 3; i++)
        {
            var m = ref_.AddMonths(-i);
            var lista = await db.Transacoes
                .Where(t => t.UsuarioId == usuarioId
                         && t.Data.Month == m.Month
                         && t.Data.Year  == m.Year)
                .ToListAsync();
            saldos.Add(lista.Sum(t => t.Tipo == "receita" ? t.Valor : -t.Valor));
        }
        return saldos.Count > 0 ? Math.Round(saldos.Average(), 2) : 0;
    }

    private static TransacaoResponse ToDto(Transacao t) =>
        new(t.Id, t.Tipo, t.Valor, t.Categoria, t.Descricao, t.FormaPagamento, t.Data, t.CriadoEm);
}