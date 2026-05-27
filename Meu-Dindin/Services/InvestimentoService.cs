using Microsoft.EntityFrameworkCore;
using MeuDinDin.Data;
using MeuDinDin.DTOs;
using MeuDinDin.Models;

namespace MeuDinDin.Services;

public class InvestimentoService(AppDbContext db)
{
    private static readonly Dictionary<string, decimal> TaxasAnuais = new()
    {
        ["Poupança"]      = 0.06m,
        ["TesouroDireto"] = 0.105m,
        ["CDB"]           = 0.115m,
    };

    public async Task<(bool Ok, string Erro, InvestimentoResponse? Inv)> AdicionarAsync(int usuarioId, InvestimentoRequest req)
    {
        var usuario = await db.Usuarios.FindAsync(usuarioId);
        if (usuario is null) return (false, "Usuário não encontrado.", null);
        if (usuario.SaldoConta < req.Valor) return (false, "Saldo insuficiente na conta.", null);

        usuario.SaldoConta -= req.Valor;

        var inv = new Investimento { UsuarioId = usuarioId, Tipo = req.Tipo, Valor = req.Valor, DataAporte = req.DataAporte.Date };
        db.Investimentos.Add(inv);

        var ehPrimeiro = !await db.Investimentos.AnyAsync(i => i.UsuarioId == usuarioId);
        if (ehPrimeiro)
        {
            if (!await db.MedalhasUsuarios.AnyAsync(m => m.UsuarioId == usuarioId && m.MedalhaId == 5))
            {
                db.MedalhasUsuarios.Add(new MedalhaUsuario { UsuarioId = usuarioId, MedalhaId = 5 });
                db.Notificacoes.Add(new Notificacao { UsuarioId = usuarioId, Titulo = "🏅 Medalha desbloqueada: Investidor!", Mensagem = "Você fez seu primeiro investimento!", Tipo = "conquista", Icone = "📈" });
            }
        }

        await db.SaveChangesAsync();
        return (true, string.Empty, ToDto(inv));
    }

    /// <summary>Resgata um investimento devolvendo o valor + rendimento ao SaldoConta.</summary>
    public async Task<(bool Ok, string Erro, decimal ValorResgatado)> ResgatarAsync(int usuarioId, int investimentoId)
    {
        var inv     = await db.Investimentos.FirstOrDefaultAsync(i => i.Id == investimentoId && i.UsuarioId == usuarioId);
        var usuario = await db.Usuarios.FindAsync(usuarioId);
        if (inv is null || usuario is null) return (false, "Investimento não encontrado.", 0);

        var taxa          = TaxasAnuais.GetValueOrDefault(inv.Tipo, 0.06m);
        var meses         = (DateTime.UtcNow - inv.DataAporte).TotalDays / 30;
        var rendimento    = Math.Round(inv.Valor * taxa * (decimal)(meses / 12), 2);
        var valorTotal    = inv.Valor + rendimento;

        usuario.SaldoConta += valorTotal;
        db.Investimentos.Remove(inv);

        db.Notificacoes.Add(new Notificacao
        {
            UsuarioId = usuarioId,
            Titulo    = $"💰 Resgate realizado: {inv.Tipo}",
            Mensagem  = $"R${valorTotal:F2} creditados na sua conta (rendimento: R${rendimento:F2}).",
            Tipo = "info", Icone = "💰"
        });

        await db.SaveChangesAsync();
        return (true, string.Empty, valorTotal);
    }

    public async Task<List<InvestimentoResponse>> ListarAsync(int usuarioId)
        => await db.Investimentos.Where(i => i.UsuarioId == usuarioId)
            .OrderByDescending(i => i.DataAporte).Select(i => ToDto(i)).ToListAsync();

    public async Task<List<ResumoPorTipoDto>> ResumoAsync(int usuarioId)
    {
        var lista = await db.Investimentos.Where(i => i.UsuarioId == usuarioId).ToListAsync();
        return lista.GroupBy(i => i.Tipo).Select(g =>
        {
            var total = g.Sum(i => i.Valor);
            var taxa  = TaxasAnuais.GetValueOrDefault(g.Key, 0.06m);
            var meses = g.Average(i => (DateTime.UtcNow - i.DataAporte).TotalDays / 30);
            var rend  = Math.Round(total * taxa * (decimal)(meses / 12), 2);
            return new ResumoPorTipoDto(g.Key, total, rend);
        }).ToList();
    }

    private static InvestimentoResponse ToDto(Investimento i)
    {
        var taxa  = TaxasAnuais.GetValueOrDefault(i.Tipo, 0.06m);
        var meses = (DateTime.UtcNow - i.DataAporte).TotalDays / 30;
        var rend  = Math.Round(i.Valor * taxa * (decimal)(meses / 12), 2);
        return new(i.Id, i.Tipo, i.Valor, rend, i.DataAporte, i.CriadoEm);
    }
}
