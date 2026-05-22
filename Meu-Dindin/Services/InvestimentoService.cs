using Microsoft.EntityFrameworkCore;
using Meu_Dindin.Data;
using Meu_Dindin.DTOs;
using Meu_Dindin.Models;
using Meu_DinDin.Models;

namespace Meu_Dindin.Services;

public class InvestimentoService(AppDbContext db)
{
    // Taxas anuais estimadas por tipo (simplificado)
    private static readonly Dictionary<string, decimal> TaxasAnuais = new()
    {
        ["Poupança"]      = 0.06m,   // ~6% a.a.
        ["TesouroDireto"] = 0.105m,  // ~10.5% a.a. (Selic)
        ["CDB"]           = 0.115m,  // ~11.5% a.a. (110% CDI)
    };

    public async Task<InvestimentoResponse> AdicionarAsync(int usuarioId, InvestimentoRequest req)
    {
        var inv = new Investimento
        {
            UsuarioId  = usuarioId,
            Tipo       = req.Tipo,
            Valor      = req.Valor,
            DataAporte = req.DataAporte.Date
        };
        db.Investimentos.Add(inv);

        // Conceder medalha "Investidor" na primeira vez
        var ehPrimeiro = !await db.Investimentos.AnyAsync(i => i.UsuarioId == usuarioId);
        if (ehPrimeiro)
        {
            var jaTemMedalha = await db.MedalhasUsuarios
                .AnyAsync(m => m.UsuarioId == usuarioId && m.MedalhaId == 5);
            if (!jaTemMedalha)
                db.MedalhasUsuarios.Add(new MedalhaUsuario { UsuarioId = usuarioId, MedalhaId = 5 });
        }

        await db.SaveChangesAsync();
        return ToDto(inv);
    }

    public async Task<List<InvestimentoResponse>> ListarAsync(int usuarioId)
    {
        return await db.Investimentos
            .Where(i => i.UsuarioId == usuarioId)
            .OrderByDescending(i => i.DataAporte)
            .Select(i => ToDto(i))
            .ToListAsync();
    }

    public async Task<List<ResumoPorTipoDto>> ResumoAsync(int usuarioId)
    {
        var investimentos = await db.Investimentos
            .Where(i => i.UsuarioId == usuarioId)
            .ToListAsync();

        return investimentos
            .GroupBy(i => i.Tipo)
            .Select(g =>
            {
                var total = g.Sum(i => i.Valor);
                var taxa  = TaxasAnuais.GetValueOrDefault(g.Key, 0.06m);
                var meses = g.Average(i => (DateTime.UtcNow - i.DataAporte).TotalDays / 30);
                var rend  = Math.Round(total * taxa * (decimal)(meses / 12), 2);
                return new ResumoPorTipoDto(g.Key, total, rend);
            })
            .ToList();
    }

    public async Task<bool> RemoverAsync(int usuarioId, int id)
    {
        var inv = await db.Investimentos
            .FirstOrDefaultAsync(i => i.Id == id && i.UsuarioId == usuarioId);
        if (inv is null) return false;
        db.Investimentos.Remove(inv);
        await db.SaveChangesAsync();
        return true;
    }

    private static InvestimentoResponse ToDto(Investimento i)
    {
        var taxa   = TaxasAnuais.GetValueOrDefault(i.Tipo, 0.06m);
        var meses  = (DateTime.UtcNow - i.DataAporte).TotalDays / 30;
        var rend   = Math.Round(i.Valor * taxa * (decimal)(meses / 12), 2);
        return new(i.Id, i.Tipo, i.Valor, rend, i.DataAporte, i.CriadoEm);
    }
}