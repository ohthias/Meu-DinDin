using Microsoft.EntityFrameworkCore;
using MeuDinDin.Data;
using MeuDinDin.DTOs;
using MeuDinDin.Models;

namespace MeuDinDin.Services;

public class GamificacaoService(AppDbContext db)
{
    private static readonly int[] XpProximoNivel = [100,300,600,1000,1500,2200,3000,4000,5200,6600,int.MaxValue];

    public async Task<GamificacaoResumoResponse> ObterResumoAsync(int usuarioId)
    {
        var usuario = await db.Usuarios.FindAsync(usuarioId) ?? throw new KeyNotFoundException();
        var desafios = await ObterDesafiosAsync(usuarioId);
        var medalhas = await ObterMedalhasAsync(usuarioId);
        var xpProx   = usuario.Nivel - 1 < XpProximoNivel.Length ? XpProximoNivel[usuario.Nivel - 1] : XpProximoNivel[^1];
        return new GamificacaoResumoResponse(usuario.Nivel, usuario.XP, xpProx, usuario.Moedas, usuario.NomeTitulo, desafios, medalhas);
    }

    public async Task<List<DesafioResponse>> ObterDesafiosAsync(int usuarioId)
    {
        await GarantirDesafiosAtivosAsync(usuarioId);
        return await db.DesafiosUsuarios.Include(d => d.Desafio)
            .Where(d => d.UsuarioId == usuarioId)
            .Select(d => new DesafioResponse(d.Desafio.Id, d.Desafio.Titulo, d.Desafio.Descricao,
                d.Desafio.XpRecompensa, d.Desafio.DuracaoDias, d.DiaAtual, d.Progresso, d.Concluido, d.Desafio.Tipo))
            .ToListAsync();
    }

    public async Task<DesafioResponse?> AvancarDesafioAsync(int usuarioId, int desafioId)
    {
        var du = await db.DesafiosUsuarios.Include(d => d.Desafio)
            .FirstOrDefaultAsync(d => d.UsuarioId == usuarioId && d.DesafioId == desafioId);
        if (du is null || du.Concluido) return null;

        du.DiaAtual++;
        if (du.DiaAtual >= du.Desafio.DuracaoDias)
        {
            du.Concluido   = true;
            du.ConcluidoEm = DateTime.UtcNow;
            var usuario = await db.Usuarios.FindAsync(usuarioId);
            if (usuario is not null)
            {
                AuthService.AdicionarXP(usuario, du.Desafio.XpRecompensa);
                usuario.Moedas += du.Desafio.XpRecompensa / 2;
                db.Notificacoes.Add(new Notificacao
                {
                    UsuarioId = usuarioId,
                    Titulo    = $"🏆 Desafio concluído: {du.Desafio.Titulo}!",
                    Mensagem  = $"+{du.Desafio.XpRecompensa} XP e +{du.Desafio.XpRecompensa/2} moedas.",
                    Tipo = "conquista", Icone = "🏆"
                });
            }
        }
        await db.SaveChangesAsync();
        return new DesafioResponse(du.Desafio.Id, du.Desafio.Titulo, du.Desafio.Descricao,
            du.Desafio.XpRecompensa, du.Desafio.DuracaoDias, du.DiaAtual, du.Progresso, du.Concluido, du.Desafio.Tipo);
    }

    public async Task<List<MedalhaResponse>> ObterMedalhasAsync(int usuarioId)
    {
        var todas       = await db.Medalhas.ToListAsync();
        var conquistadas = await db.MedalhasUsuarios.Where(mu => mu.UsuarioId == usuarioId).ToListAsync();
        return todas.Select(m =>
        {
            var c = conquistadas.FirstOrDefault(x => x.MedalhaId == m.Id);
            return new MedalhaResponse(m.Id, m.Titulo, m.Descricao, m.Emoji, c is not null, c?.ConquistadaEm);
        }).ToList();
    }

    public async Task ConcederMedalhaAsync(int usuarioId, int medalhaId)
    {
        if (await db.MedalhasUsuarios.AnyAsync(m => m.UsuarioId == usuarioId && m.MedalhaId == medalhaId)) return;
        var medalha = await db.Medalhas.FindAsync(medalhaId);
        db.MedalhasUsuarios.Add(new MedalhaUsuario { UsuarioId = usuarioId, MedalhaId = medalhaId });
        var usuario = await db.Usuarios.FindAsync(usuarioId);
        if (usuario is not null) { usuario.Moedas += 50; }
        if (medalha is not null)
            db.Notificacoes.Add(new Notificacao
            {
                UsuarioId = usuarioId, Titulo = $"{medalha.Emoji} Medalha desbloqueada: {medalha.Titulo}!",
                Mensagem = medalha.Descricao, Tipo = "conquista", Icone = medalha.Emoji
            });
        await db.SaveChangesAsync();
    }

    public async Task<(bool Ok, string Erro)> ResgatarLojaAsync(int usuarioId, ResgatarLojaRequest req)
    {
        var usuario = await db.Usuarios.FindAsync(usuarioId);
        if (usuario is null) return (false, "Usuário não encontrado.");
        if (usuario.Moedas < req.Custo) return (false, "Moedas insuficientes.");

        // Registra item na lista de itens resgatados
        var itens = System.Text.Json.JsonSerializer.Deserialize<List<string>>(usuario.ItensResgatados) ?? [];
        if (itens.Contains(req.ItemId)) return (false, "Item já resgatado.");
        itens.Add(req.ItemId);
        usuario.ItensResgatados = System.Text.Json.JsonSerializer.Serialize(itens);
        usuario.Moedas -= req.Custo;

        db.Notificacoes.Add(new Notificacao
        {
            UsuarioId = usuarioId, Titulo = $"🎁 Item resgatado: {req.NomeItem}!",
            Mensagem = $"Você gastou {req.Custo} moedas. Aproveite!", Tipo = "info", Icone = "🎁"
        });
        await db.SaveChangesAsync();
        return (true, string.Empty);
    }

    public async Task AdicionarXPAsync(int usuarioId, int xp)
    {
        var usuario = await db.Usuarios.FindAsync(usuarioId);
        if (usuario is null) return;
        var nivelAntes = usuario.Nivel;
        AuthService.AdicionarXP(usuario, xp);
        if (usuario.Nivel > nivelAntes)
            db.Notificacoes.Add(new Notificacao
            {
                UsuarioId = usuarioId, Titulo = $"🚀 Subiu para Nível {usuario.Nivel}: {usuario.NomeTitulo}!",
                Mensagem = $"Parabéns! Você alcançou o nível {usuario.Nivel}.", Tipo = "conquista", Icone = "🚀"
            });
        await db.SaveChangesAsync();
    }

    private async Task GarantirDesafiosAtivosAsync(int usuarioId)
    {
        var todos = await db.Desafios.Take(4).ToListAsync();
        bool salvou = false;
        foreach (var d in todos)
        {
            if (!await db.DesafiosUsuarios.AnyAsync(du => du.UsuarioId == usuarioId && du.DesafioId == d.Id))
            {
                db.DesafiosUsuarios.Add(new DesafioUsuario { UsuarioId = usuarioId, DesafioId = d.Id });
                salvou = true;
            }
        }
        if (salvou) await db.SaveChangesAsync();
    }
}
