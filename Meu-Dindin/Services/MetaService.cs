using Microsoft.EntityFrameworkCore;
using Meu_Dindin.Data;
using Meu_Dindin.DTOs;
using Meu_DinDin.Models;

namespace Meu_Dindin.Services;

public class MetaService(AppDbContext db)
{
    public async Task<MetaResponse> CriarAsync(int usuarioId, MetaRequest req)
    {
        var meta = new Meta
        {
            UsuarioId  = usuarioId,
            Nome       = req.Nome,
            ValorTotal = req.ValorTotal,
            ValorAtual = req.ValorAtual,
            Prazo      = req.Prazo.Date,
            Cor        = req.Cor
        };
        db.Metas.Add(meta);
        await db.SaveChangesAsync();
        return ToDto(meta);
    }

    public async Task<List<MetaResponse>> ListarAsync(int usuarioId)
    {
        return await db.Metas
            .Where(m => m.UsuarioId == usuarioId)
            .OrderBy(m => m.Prazo)
            .Select(m => ToDto(m))
            .ToListAsync();
    }

    public async Task<MetaResponse?> AtualizarValorAsync(int usuarioId, int id, AtualizarMetaValorRequest req)
    {
        var meta = await db.Metas.FirstOrDefaultAsync(m => m.Id == id && m.UsuarioId == usuarioId);
        if (meta is null) return null;
        meta.ValorAtual = req.NovoValorAtual;
        await db.SaveChangesAsync();
        return ToDto(meta);
    }

    public async Task<bool> RemoverAsync(int usuarioId, int id)
    {
        var meta = await db.Metas.FirstOrDefaultAsync(m => m.Id == id && m.UsuarioId == usuarioId);
        if (meta is null) return false;
        db.Metas.Remove(meta);
        await db.SaveChangesAsync();
        return true;
    }

    private static MetaResponse ToDto(Meta m) =>
        new(m.Id, m.Nome, m.ValorTotal, m.ValorAtual, m.Percentual, m.Prazo, m.Cor, m.CriadoEm);
}