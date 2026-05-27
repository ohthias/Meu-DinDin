using Microsoft.EntityFrameworkCore;
using MeuDinDin.Data;
using MeuDinDin.DTOs;
using MeuDinDin.Models;

namespace MeuDinDin.Services;

public class QuizService(AppDbContext db)
{
    private const int XpPorAcerto = 10;
    private const int XpModulo    = 50;

    public async Task<QuizModuloProgressoResponse> RegistrarRespostaAsync(int usuarioId, QuizRespostaRequest req)
    {
        // Idempotente: ignora se já respondeu esta questão
        var jaRespondeu = await db.QuizProgressos.AnyAsync(q =>
            q.UsuarioId == usuarioId && q.Modulo == req.Modulo && q.QuestaoIndex == req.QuestaoIndex);
        if (!jaRespondeu)
        {
            db.QuizProgressos.Add(new QuizProgresso
            {
                UsuarioId = usuarioId, Modulo = req.Modulo,
                QuestaoIndex = req.QuestaoIndex, RespostaIndex = req.RespostaIndex, Acertou = req.Acertou
            });
            if (req.Acertou)
            {
                var usuario = await db.Usuarios.FindAsync(usuarioId);
                if (usuario is not null) AuthService.AdicionarXP(usuario, XpPorAcerto);
            }
            await db.SaveChangesAsync();
        }

        return await ObterProgressoModuloAsync(usuarioId, req.Modulo);
    }

    public async Task<QuizResultadoResponse> FinalizarModuloAsync(int usuarioId, QuizResultadoRequest req)
    {
        // Marca módulo como concluído
        var prog = await db.QuizModulosProgressos.FirstOrDefaultAsync(q => q.UsuarioId == usuarioId && q.Modulo == req.Modulo);
        if (prog is null)
        {
            prog = new QuizModuloProgresso { UsuarioId = usuarioId, Modulo = req.Modulo };
            db.QuizModulosProgressos.Add(prog);
        }
        prog.TotalAcertos   = req.Pontuacao;
        prog.TotalRespostas = req.Total;
        prog.Concluido      = true;
        prog.ConcluidoEm    = DateTime.UtcNow;

        int xpGanho = XpModulo + (req.Pontuacao == req.Total ? 20 : 0); // bônus perfeito
        var resultado = new QuizResultado { UsuarioId = usuarioId, Modulo = req.Modulo, Pontuacao = req.Pontuacao, Total = req.Total, XpGanho = xpGanho };
        db.QuizResultados.Add(resultado);

        var usuario = await db.Usuarios.FindAsync(usuarioId);
        if (usuario is not null)
        {
            var nivelAntes = usuario.Nivel;
            AuthService.AdicionarXP(usuario, xpGanho);
            usuario.Moedas += xpGanho / 5;

            // Medalha "1º quiz feito"
            if (!await db.MedalhasUsuarios.AnyAsync(m => m.UsuarioId == usuarioId && m.MedalhaId == 4))
            {
                db.MedalhasUsuarios.Add(new MedalhaUsuario { UsuarioId = usuarioId, MedalhaId = 4 });
                db.Notificacoes.Add(new Notificacao { UsuarioId = usuarioId, Titulo = "📚 Medalha: 1º quiz feito!", Mensagem = "Você completou seu primeiro módulo de educação financeira!", Tipo = "conquista", Icone = "📚" });
            }

            db.Notificacoes.Add(new Notificacao
            {
                UsuarioId = usuarioId, Titulo = $"🎓 Quiz concluído: {req.Pontuacao}/{req.Total}",
                Mensagem = $"Você ganhou {xpGanho} XP no módulo '{req.Modulo}'.", Tipo = "conquista", Icone = "🎓"
            });
        }

        await db.SaveChangesAsync();
        return new QuizResultadoResponse(resultado.Id, resultado.Modulo, resultado.Pontuacao, resultado.Total, xpGanho, resultado.FinalizadoEm);
    }

    public async Task<List<QuizModuloProgressoResponse>> ObterTodosProgressosAsync(int usuarioId)
    {
        var modulos = new[] { "orcamento", "reserva", "investimentos", "credito" };
        var result  = new List<QuizModuloProgressoResponse>();
        foreach (var m in modulos)
            result.Add(await ObterProgressoModuloAsync(usuarioId, m));
        return result;
    }

    public async Task<List<QuizHistoricoResponse>> ObterHistoricoModuloAsync(int usuarioId, string modulo)
        => await db.QuizProgressos
            .Where(q => q.UsuarioId == usuarioId && q.Modulo == modulo)
            .OrderBy(q => q.QuestaoIndex)
            .Select(q => new QuizHistoricoResponse(q.QuestaoIndex, q.RespostaIndex, q.Acertou, q.RespondidoEm))
            .ToListAsync();

    public async Task<List<QuizResultadoResponse>> ObterResultadosAsync(int usuarioId)
        => await db.QuizResultados.Where(q => q.UsuarioId == usuarioId)
            .OrderByDescending(q => q.FinalizadoEm)
            .Select(q => new QuizResultadoResponse(q.Id, q.Modulo, q.Pontuacao, q.Total, q.XpGanho, q.FinalizadoEm))
            .ToListAsync();

    private async Task<QuizModuloProgressoResponse> ObterProgressoModuloAsync(int usuarioId, string modulo)
    {
        var prog = await db.QuizModulosProgressos.FirstOrDefaultAsync(q => q.UsuarioId == usuarioId && q.Modulo == modulo);
        var acertos = await db.QuizProgressos.CountAsync(q => q.UsuarioId == usuarioId && q.Modulo == modulo && q.Acertou);
        var total   = await db.QuizProgressos.CountAsync(q => q.UsuarioId == usuarioId && q.Modulo == modulo);
        return new QuizModuloProgressoResponse(modulo, acertos, total, prog?.Concluido ?? false, prog?.ConcluidoEm);
    }
}
