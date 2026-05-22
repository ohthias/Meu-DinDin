using Microsoft.EntityFrameworkCore;
using Meu_Dindin.Data;
using Meu_Dindin.DTOs;
using Meu_Dindin.Models;
using Meu_Dindin.Services;

namespace MeuDinDin.Services;

public class GamificacaoService(AppDbContext db)
{
    private static readonly int[] XpProximoNivel = [100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5200, 6600, int.MaxValue];

    // ── Resumo completo ────────────────────────────────────────────────────────
    public async Task<GamificacaoResumoResponse> ObterResumoAsync(int usuarioId)
    {
        var usuario = await db.Usuarios.FindAsync(usuarioId);
        if (usuario is null) throw new KeyNotFoundException();

        var desafios = await ObterDesafiosAsync(usuarioId);
        var medalhas = await ObterMedalhasAsync(usuarioId);

        var xpProximo = usuario.Nivel - 1 < XpProximoNivel.Length
            ? XpProximoNivel[usuario.Nivel - 1]
            : XpProximoNivel[^1];

        return new GamificacaoResumoResponse(
            usuario.Nivel,
            usuario.XP,
            xpProximo,
            usuario.Moedas,
            usuario.NomeTitulo,
            desafios,
            medalhas);
    }

    // ── Desafios ──────────────────────────────────────────────────────────────
    public async Task<List<DesafioResponse>> ObterDesafiosAsync(int usuarioId)
    {
        // Garante que os desafios padrão estejam ativados para o usuário
        await GarantirDesafiosAtivosAsync(usuarioId);

        return await db.DesafiosUsuarios
            .Include(d => d.Desafio)
            .Where(d => d.UsuarioId == usuarioId)
            .Select(d => new DesafioResponse(
                d.Desafio.Id,
                d.Desafio.Titulo,
                d.Desafio.Descricao,
                d.Desafio.XpRecompensa,
                d.Desafio.DuracaoDias,
                d.DiaAtual,
                d.Progresso,
                d.Concluido,
                d.Desafio.Tipo))
            .ToListAsync();
    }

    public async Task<DesafioResponse?> AvancarDesafioAsync(int usuarioId, int desafioId)
    {
        var du = await db.DesafiosUsuarios
            .Include(d => d.Desafio)
            .FirstOrDefaultAsync(d => d.UsuarioId == usuarioId && d.DesafioId == desafioId);

        if (du is null || du.Concluido) return null;

        du.DiaAtual++;
        if (du.DiaAtual >= du.Desafio.DuracaoDias)
        {
            du.Concluido    = true;
            du.ConcluidoEm  = DateTime.UtcNow;
            var usuario = await db.Usuarios.FindAsync(usuarioId);
            if (usuario is not null)
            {
                AuthService.AdicionarXP(usuario, du.Desafio.XpRecompensa);
                usuario.Moedas += du.Desafio.XpRecompensa / 2;
            }
        }

        await db.SaveChangesAsync();
        return new DesafioResponse(
            du.Desafio.Id, du.Desafio.Titulo, du.Desafio.Descricao,
            du.Desafio.XpRecompensa, du.Desafio.DuracaoDias,
            du.DiaAtual, du.Progresso, du.Concluido, du.Desafio.Tipo);
    }

    // ── Medalhas ──────────────────────────────────────────────────────────────
    public async Task<List<MedalhaResponse>> ObterMedalhasAsync(int usuarioId)
    {
        var todasMedalhas = await db.Medalhas.ToListAsync();
        var conquistadas  = await db.MedalhasUsuarios
            .Where(mu => mu.UsuarioId == usuarioId)
            .ToListAsync();

        return todasMedalhas.Select(m =>
        {
            var conq = conquistadas.FirstOrDefault(c => c.MedalhaId == m.Id);
            return new MedalhaResponse(m.Id, m.Titulo, m.Descricao, m.Emoji,
                conq is not null, conq?.ConquistadaEm);
        }).ToList();
    }

    public async Task ConcederMedalhaAsync(int usuarioId, int medalhaId)
    {
        var jaTemMedalha = await db.MedalhasUsuarios
            .AnyAsync(m => m.UsuarioId == usuarioId && m.MedalhaId == medalhaId);
        if (jaTemMedalha) return;

        db.MedalhasUsuarios.Add(new MedalhaUsuario
        {
            UsuarioId = usuarioId,
            MedalhaId = medalhaId
        });
        var usuario = await db.Usuarios.FindAsync(usuarioId);
        if (usuario is not null) { usuario.Moedas += 50; }
        await db.SaveChangesAsync();
    }

    // ── Loja: resgatar recompensa ─────────────────────────────────────────────
    public async Task<(bool Ok, string Erro)> ResgatarRecompensaAsync(int usuarioId, int custo)
    {
        var usuario = await db.Usuarios.FindAsync(usuarioId);
        if (usuario is null) return (false, "Usuário não encontrado.");
        if (usuario.Moedas < custo) return (false, "Moedas insuficientes.");
        usuario.Moedas -= custo;
        await db.SaveChangesAsync();
        return (true, string.Empty);
    }

    // ── Adicionar XP manualmente ──────────────────────────────────────────────
    public async Task AdicionarXPAsync(int usuarioId, int xp)
    {
        var usuario = await db.Usuarios.FindAsync(usuarioId);
        if (usuario is null) return;
        AuthService.AdicionarXP(usuario, xp);
        await db.SaveChangesAsync();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private async Task GarantirDesafiosAtivosAsync(int usuarioId)
    {
        var desafiosPadrao = await db.Desafios.Take(2).ToListAsync();
        foreach (var d in desafiosPadrao)
        {
            var existe = await db.DesafiosUsuarios
                .AnyAsync(du => du.UsuarioId == usuarioId && du.DesafioId == d.Id);
            if (!existe)
            {
                db.DesafiosUsuarios.Add(new DesafioUsuario
                {
                    UsuarioId = usuarioId,
                    DesafioId = d.Id
                });
            }
        }
        await db.SaveChangesAsync();
    }
}