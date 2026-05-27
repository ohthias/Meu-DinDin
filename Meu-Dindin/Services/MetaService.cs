using Microsoft.EntityFrameworkCore;
using MeuDinDin.Data;
using MeuDinDin.DTOs;
using MeuDinDin.Models;

namespace MeuDinDin.Services;

public class MetaService(AppDbContext db)
{
    public async Task<MetaResponse> CriarAsync(int usuarioId, MetaRequest req)
    {
        var meta = new Meta
        {
            UsuarioId = usuarioId, Nome = req.Nome, ValorTotal = req.ValorTotal,
            ValorAtual = req.ValorAtual, Prazo = req.Prazo.Date, Cor = req.Cor
        };
        db.Metas.Add(meta);
        await db.SaveChangesAsync();
        return ToDto(meta);
    }

    public async Task<List<MetaResponse>> ListarAsync(int usuarioId)
        => await db.Metas.Where(m => m.UsuarioId == usuarioId)
            .OrderBy(m => m.Prazo).Select(m => ToDto(m)).ToListAsync();

    /// <summary>Deposita valor do SaldoConta para a meta.</summary>
    public async Task<(bool Ok, string Erro, MetaResponse? Meta)> DepositarAsync(int usuarioId, int id, DepositarMetaRequest req)
    {
        var meta    = await db.Metas.FirstOrDefaultAsync(m => m.Id == id && m.UsuarioId == usuarioId);
        var usuario = await db.Usuarios.FindAsync(usuarioId);
        if (meta is null || usuario is null) return (false, "Meta ou usuário não encontrado.", null);
        if (usuario.SaldoConta < req.Valor) return (false, "Saldo insuficiente.", null);
        if (req.Valor <= 0) return (false, "Valor deve ser positivo.", null);

        usuario.SaldoConta -= req.Valor;
        meta.ValorAtual    += req.Valor;
        if (meta.ValorAtual > meta.ValorTotal) meta.ValorAtual = meta.ValorTotal;

        // Notificação se meta concluída
        if (meta.ValorAtual >= meta.ValorTotal)
            db.Notificacoes.Add(new Notificacao
            {
                UsuarioId = usuarioId, Titulo = $"🎯 Meta concluída: {meta.Nome}!",
                Mensagem  = $"Parabéns! Você atingiu sua meta de R${meta.ValorTotal:F2}.",
                Tipo = "conquista", Icone = "🎯"
            });

        await db.SaveChangesAsync();
        return (true, string.Empty, ToDto(meta));
    }

    /// <summary>Resgata valor da meta de volta para o SaldoConta.</summary>
    public async Task<(bool Ok, string Erro, MetaResponse? Meta)> ResgatarAsync(int usuarioId, int id, decimal valor)
    {
        var meta    = await db.Metas.FirstOrDefaultAsync(m => m.Id == id && m.UsuarioId == usuarioId);
        var usuario = await db.Usuarios.FindAsync(usuarioId);
        if (meta is null || usuario is null) return (false, "Não encontrado.", null);
        if (valor > meta.ValorAtual) return (false, "Valor maior que o disponível na meta.", null);

        meta.ValorAtual    -= valor;
        usuario.SaldoConta += valor;
        await db.SaveChangesAsync();
        return (true, string.Empty, ToDto(meta));
    }

    public async Task<bool> RemoverAsync(int usuarioId, int id)
    {
        var meta    = await db.Metas.FirstOrDefaultAsync(m => m.Id == id && m.UsuarioId == usuarioId);
        var usuario = await db.Usuarios.FindAsync(usuarioId);
        if (meta is null) return false;
        // Devolve saldo acumulado
        if (usuario is not null) usuario.SaldoConta += meta.ValorAtual;
        db.Metas.Remove(meta);
        await db.SaveChangesAsync();
        return true;
    }

    private static MetaResponse ToDto(Meta m) =>
        new(m.Id, m.Nome, m.ValorTotal, m.ValorAtual, m.Percentual, m.Prazo, m.Cor, m.CriadoEm);
}
