using Microsoft.EntityFrameworkCore;
using MeuDinDin.Data;
using MeuDinDin.DTOs;
using MeuDinDin.Models;

namespace MeuDinDin.Services;

public class TransacaoService(AppDbContext db)
{
    public async Task<TransacaoResponse> AdicionarAsync(int usuarioId, TransacaoRequest req)
    {
        var t = new Transacao
        {
            UsuarioId = usuarioId, Tipo = req.Tipo.ToLower(), Valor = req.Valor,
            Categoria = req.Categoria, Descricao = req.Descricao,
            FormaPagamento = req.FormaPagamento, Data = req.Data.Date
        };
        db.Transacoes.Add(t);

        // Atualiza saldo da conta
        var usuario = await db.Usuarios.FindAsync(usuarioId);
        if (usuario is not null)
            usuario.SaldoConta += req.Tipo.ToLower() == "receita" ? req.Valor : -req.Valor;

        await db.SaveChangesAsync();

        // Alertas automáticos
        await VerificarAlertasAsync(usuarioId);
        return ToDto(t);
    }

    public async Task<List<TransacaoResponse>> ListarAsync(int usuarioId, int mes, int ano)
        => await db.Transacoes
            .Where(t => t.UsuarioId == usuarioId && t.Data.Month == mes && t.Data.Year == ano)
            .OrderByDescending(t => t.Data).Select(t => ToDto(t)).ToListAsync();

    public async Task<List<TransacaoResponse>> ListarPeriodoAsync(int usuarioId, int mesInicio, int anoInicio, int mesFim, int anoFim)
    {
        var inicio = new DateTime(anoInicio, mesInicio, 1);
        var fim    = new DateTime(anoFim, mesFim, DateTime.DaysInMonth(anoFim, mesFim));
        return await db.Transacoes
            .Where(t => t.UsuarioId == usuarioId && t.Data >= inicio && t.Data <= fim)
            .OrderByDescending(t => t.Data).Select(t => ToDto(t)).ToListAsync();
    }

    public async Task<List<TransacaoResponse>> ListarTodasAsync(int usuarioId)
        => await db.Transacoes.Where(t => t.UsuarioId == usuarioId)
            .OrderByDescending(t => t.Data).Select(t => ToDto(t)).ToListAsync();

    public async Task<bool> RemoverAsync(int usuarioId, int id)
    {
        var t = await db.Transacoes.FirstOrDefaultAsync(t => t.Id == id && t.UsuarioId == usuarioId);
        if (t is null) return false;
        var usuario = await db.Usuarios.FindAsync(usuarioId);
        if (usuario is not null)
            usuario.SaldoConta -= t.Tipo == "receita" ? t.Valor : -t.Valor;
        db.Transacoes.Remove(t);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<ResumoFinanceiroResponse> ObterResumoAsync(int usuarioId, int mes, int ano)
    {
        var lista = await db.Transacoes
            .Where(t => t.UsuarioId == usuarioId && t.Data.Month == mes && t.Data.Year == ano)
            .ToListAsync();
        return CalcularResumo(lista, usuarioId, mes, ano);
    }

    public async Task<ResumoFinanceiroResponse> ObterResumoPeriodoAsync(int usuarioId, int mesInicio, int anoInicio, int mesFim, int anoFim)
    {
        var inicio = new DateTime(anoInicio, mesInicio, 1);
        var fim    = new DateTime(anoFim, mesFim, DateTime.DaysInMonth(anoFim, mesFim));
        var lista  = await db.Transacoes
            .Where(t => t.UsuarioId == usuarioId && t.Data >= inicio && t.Data <= fim)
            .ToListAsync();
        return CalcularResumo(lista, usuarioId, mesInicio, anoInicio);
    }

    private static ResumoFinanceiroResponse CalcularResumo(List<Transacao> lista, int usuarioId, int mes, int ano)
    {
        var rec    = lista.Where(t => t.Tipo == "receita").Sum(t => t.Valor);
        var dep    = lista.Where(t => t.Tipo == "despesa").Sum(t => t.Valor);
        var saldo  = rec - dep;
        var econ   = Math.Max(0, saldo);
        var pctEc  = rec > 0 ? Math.Round(econ / rec * 100, 1) : 0;
        var porCat = lista.Where(t => t.Tipo == "despesa").GroupBy(t => t.Categoria)
            .Select(g => new CategoriaGastoDto(g.Key, g.Sum(t => t.Valor),
                dep > 0 ? Math.Round(g.Sum(t => t.Valor) / dep * 100, 1) : 0))
            .OrderByDescending(c => c.Total).ToList();
        var maior = porCat.FirstOrDefault();
        return new ResumoFinanceiroResponse(rec, dep, saldo, econ, pctEc, 0,
            maior?.Categoria ?? "-", maior?.Total ?? 0, porCat);
    }

    public async Task<List<EvolucaoMensalDto>> EvolucaoMensalAsync(int usuarioId, int meses = 6)
    {
        var result = new List<EvolucaoMensalDto>();
        var agora  = DateTime.UtcNow;
        var pt     = new System.Globalization.CultureInfo("pt-BR");
        for (int i = meses - 1; i >= 0; i--)
        {
            var r    = agora.AddMonths(-i);
            var lista = await db.Transacoes
                .Where(t => t.UsuarioId == usuarioId && t.Data.Month == r.Month && t.Data.Year == r.Year)
                .ToListAsync();
            var rec = lista.Where(t => t.Tipo == "receita").Sum(t => t.Valor);
            var dep = lista.Where(t => t.Tipo == "despesa").Sum(t => t.Valor);
            result.Add(new EvolucaoMensalDto(r.ToString("MMM", pt), r.Month, r.Year, rec, dep, rec - dep));
        }
        return result;
    }

    private async Task VerificarAlertasAsync(int usuarioId)
    {
        var agora  = DateTime.UtcNow;
        var lista  = await db.Transacoes
            .Where(t => t.UsuarioId == usuarioId && t.Data.Month == agora.Month && t.Data.Year == agora.Year)
            .ToListAsync();
        var rec = lista.Where(t => t.Tipo == "receita").Sum(t => t.Valor);
        var dep = lista.Where(t => t.Tipo == "despesa").Sum(t => t.Valor);
        if (rec > 0 && dep / rec > 0.85m)
        {
            var jaExiste = await db.Notificacoes.AnyAsync(n =>
                n.UsuarioId == usuarioId && n.Tipo == "alerta" &&
                n.CriadaEm.Month == agora.Month && n.CriadaEm.Year == agora.Year &&
                n.Titulo.Contains("gastos"));
            if (!jaExiste)
                db.Notificacoes.Add(new Notificacao
                {
                    UsuarioId = usuarioId, Titulo = "⚠️ Atenção aos gastos!",
                    Mensagem  = $"Suas despesas já representam {Math.Round(dep/rec*100,0)}% da renda este mês.",
                    Tipo = "alerta", Icone = "⚠️"
                });
            await db.SaveChangesAsync();
        }
    }

    private static TransacaoResponse ToDto(Transacao t) =>
        new(t.Id, t.Tipo, t.Valor, t.Categoria, t.Descricao, t.FormaPagamento, t.Data, t.CriadoEm);
}
