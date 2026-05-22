using Microsoft.EntityFrameworkCore;
using Meu_Dindin.Data;
using Meu_Dindin.DTOs;

namespace Meu_Dindin.Services;

public class RecomendacaoService(AppDbContext db)
{
    public async Task<List<RecomendacaoResponse>> GerarAsync(int usuarioId, int mes, int ano)
    {
        var usuario = await db.Usuarios.FindAsync(usuarioId);
        if (usuario is null) return [];

        var transacoes = await db.Transacoes
            .Where(t => t.UsuarioId == usuarioId
                     && t.Data.Month == mes
                     && t.Data.Year  == ano)
            .ToListAsync();

        var receitas  = transacoes.Where(t => t.Tipo == "receita").Sum(t => t.Valor);
        var despesas  = transacoes.Where(t => t.Tipo == "despesa").Sum(t => t.Valor);
        var pctGasto  = receitas > 0 ? despesas / receitas * 100 : 0;
        var pctEcon   = receitas > 0 ? Math.Max(0, (receitas - despesas) / receitas * 100) : 0;

        var porCat = transacoes
            .Where(t => t.Tipo == "despesa")
            .GroupBy(t => t.Categoria)
            .ToDictionary(g => g.Key, g => g.Sum(t => t.Valor));

        var recomendacoes = new List<RecomendacaoResponse>();

        // ── 1. Alerta de gastos excessivos ───────────────────────────────────
        if (pctGasto > 90)
            recomendacoes.Add(new("⚠️",
                "Atenção: gastos muito altos",
                $"Suas despesas representam {pctGasto:F0}% da sua renda este mês. " +
                $"Analise seus gastos com {porCat.MaxBy(x => x.Value).Key} para encontrar onde cortar.",
                "alerta"));

        // ── 2. Limite de lazer ───────────────────────────────────────────────
        if (porCat.TryGetValue("Lazer", out var lazer) && receitas > 0 && lazer / receitas > 0.30m)
            recomendacoes.Add(new("🎮",
                "Lazer acima do ideal",
                $"Gastos com lazer estão em R${lazer:F0}, {lazer/receitas*100:F0}% da sua renda. " +
                "O recomendado é no máximo 30%. Revise assinaturas e delivery.",
                "alerta"));

        // ── 3. Elogio por boa economia ───────────────────────────────────────
        if (pctEcon >= 20)
            recomendacoes.Add(new("🎉",
                "Parabéns pela economia!",
                $"Você economizou {pctEcon:F0}% da sua renda. " +
                $"Que tal aplicar parte no Tesouro Selic para render mais que a poupança?",
                "parabens"));

        // ── 4. Sugestão baseada no perfil de onboarding ──────────────────────
        if (usuario.DesafioFinanceiro == "Não consegue poupar")
            recomendacoes.Add(new("💰",
                "Estratégia: pague-se primeiro",
                "Assim que receber seu salário, transfira imediatamente o valor que deseja poupar " +
                "antes de pagar qualquer outra coisa. Comece com 5% e aumente gradualmente.",
                "dica"));

        if (usuario.DesafioFinanceiro == "Não sabe investir" && receitas > 0 && pctGasto < 80)
            recomendacoes.Add(new("📈",
                "Pronto para investir?",
                "Você tem bom controle dos gastos! Considere começar pelo Tesouro Selic — " +
                "aceita aportes a partir de R$30 e rende mais que a poupança.",
                "dica"));

        if (usuario.DesafioFinanceiro == "Dívidas")
            recomendacoes.Add(new("🔴",
                "Foco nas dívidas",
                "Priorize quitar dívidas com juros altos (cartão, cheque especial) antes de investir. " +
                "Liste suas dívidas e ataque primeiro a de maior taxa de juros.",
                "alerta"));

        // ── 5. Regra 50/30/20 ────────────────────────────────────────────────
        if (pctEcon < 10 && pctEcon >= 0 && receitas > 0)
            recomendacoes.Add(new("📐",
                "Regra dos 50/30/20",
                $"Você guardou {pctEcon:F0}% da renda. A meta é 20%. " +
                "Tente reduzir 1 despesa de lazer por semana para chegar lá.",
                "dica"));

        // ── 6. Sem transações no mês ─────────────────────────────────────────
        if (!transacoes.Any())
            recomendacoes.Add(new("📝",
                "Comece a registrar!",
                "Registrar suas receitas e despesas é o primeiro passo para ter controle financeiro. " +
                "Tente adicionar pelo menos uma transação por dia.",
                "dica"));

        // Garante pelo menos uma recomendação
        if (!recomendacoes.Any())
            recomendacoes.Add(new("💡",
                "Continue assim!",
                $"Seus gastos estão em {pctGasto:F0}% da renda. Continue monitorando e tente " +
                "aumentar sua taxa de economia para 20% da renda.",
                "dica"));

        return recomendacoes;
    }
}