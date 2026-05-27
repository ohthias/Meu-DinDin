using Microsoft.EntityFrameworkCore;
using MeuDinDin.Data;
using MeuDinDin.DTOs;

namespace MeuDinDin.Services;

public class RecomendacaoService(AppDbContext db)
{
    public async Task<List<RecomendacaoResponse>> GerarAsync(int usuarioId, int mes, int ano)
    {
        var usuario = await db.Usuarios.FindAsync(usuarioId);
        if (usuario is null) return [];
        var trans = await db.Transacoes
            .Where(t => t.UsuarioId == usuarioId && t.Data.Month == mes && t.Data.Year == ano)
            .ToListAsync();
        var rec   = trans.Where(t => t.Tipo == "receita").Sum(t => t.Valor);
        var dep   = trans.Where(t => t.Tipo == "despesa").Sum(t => t.Valor);
        var pctG  = rec > 0 ? dep / rec * 100 : 0;
        var pctE  = rec > 0 ? Math.Max(0, (rec - dep) / rec * 100) : 0;
        var porCat = trans.Where(t => t.Tipo == "despesa").GroupBy(t => t.Categoria)
            .ToDictionary(g => g.Key, g => g.Sum(t => t.Valor));
        var recs = new List<RecomendacaoResponse>();
        if (pctG > 90) recs.Add(new("⚠️","Gastos muito altos",$"Despesas em {pctG:F0}% da renda. Maior gasto: {porCat.MaxBy(x=>x.Value).Key}.","alerta"));
        if (porCat.TryGetValue("Lazer",out var laz) && rec > 0 && laz/rec > 0.30m) recs.Add(new("🎮","Lazer acima do ideal",$"Lazer em {laz/rec*100:F0}% da renda. Recomendado: até 30%.","alerta"));
        if (pctE >= 20) recs.Add(new("🎉","Parabéns pela economia!",$"Você poupou {pctE:F0}% da renda. Considere mover para o Tesouro Selic.","parabens"));
        if (usuario.DesafioFinanceiro == "Não consegue poupar") recs.Add(new("💰","Pague-se primeiro","Separe o valor a poupar imediatamente ao receber, antes de qualquer gasto.","dica"));
        if (usuario.DesafioFinanceiro == "Não sabe investir" && pctG < 80) recs.Add(new("📈","Pronto para investir?","Com gastos controlados, comece pelo Tesouro Selic a partir de R$30.","dica"));
        if (usuario.DesafioFinanceiro == "Dívidas") recs.Add(new("🔴","Foco nas dívidas","Quite dívidas com juros altos (cartão, cheque) antes de investir.","alerta"));
        if (pctE < 10 && rec > 0) recs.Add(new("📐","Regra 50/30/20",$"Você poupou {pctE:F0}%. A meta é 20%. Reduza um gasto de lazer por semana.","dica"));
        if (!trans.Any()) recs.Add(new("📝","Comece a registrar!","Adicione sua primeira transação para ativar a análise financeira.","dica"));
        if (!recs.Any()) recs.Add(new("💡","Continue assim!",$"Gastos em {pctG:F0}%. Monitore e tente chegar a 20% de poupança.","dica"));
        return recs;
    }

    public async Task<AnalisePerfilResponse> AnalisarPerfilMLAsync(int usuarioId)
    {
        var usuario = await db.Usuarios.FindAsync(usuarioId);
        if (usuario is null) return new(0,"Indefinido","Sem dados",[],[],[]);

        var trans = await db.Transacoes.Where(t => t.UsuarioId == usuarioId).ToListAsync();
        var metas = await db.Metas.Where(m => m.UsuarioId == usuarioId).ToListAsync();
        var invs  = await db.Investimentos.Where(i => i.UsuarioId == usuarioId).ToListAsync();

        // ── Features para score (0-100) ──────────────────────────────────────
        decimal score = 0;
        var pontos   = new List<string>();
        var alertas  = new List<string>();
        var sugestoes= new List<string>();

        // 1. Taxa de poupança (peso 30)
        var rec3  = trans.Where(t => t.Tipo == "receita").Sum(t => t.Valor);
        var dep3  = trans.Where(t => t.Tipo == "despesa").Sum(t => t.Valor);
        decimal taxaPoup = rec3 > 0 ? (rec3 - dep3) / rec3 * 100 : 0;
        decimal sPoup = Math.Min(30, Math.Max(0, taxaPoup / 20m * 30));
        score += sPoup;
        if (taxaPoup >= 20) pontos.Add($"✅ Taxa de poupança excelente ({taxaPoup:F1}%)");
        else if (taxaPoup >= 10) pontos.Add($"🟡 Taxa de poupança razoável ({taxaPoup:F1}%)");
        else alertas.Add($"❌ Taxa de poupança baixa ({taxaPoup:F1}%). Meta: 20%+");

        // 2. Regularidade de registros (peso 20)
        int mesesComTransacao = trans.GroupBy(t => new { t.Data.Month, t.Data.Year }).Count();
        decimal sReg = Math.Min(20, mesesComTransacao * 3.3m);
        score += sReg;
        if (mesesComTransacao >= 3) pontos.Add($"✅ Registros consistentes ({mesesComTransacao} meses)");
        else sugestoes.Add("📝 Registre transações mensalmente por pelo menos 3 meses.");

        // 3. Metas financeiras (peso 15)
        decimal sMeta = metas.Any() ? Math.Min(15, metas.Count * 5m) : 0;
        score += sMeta;
        if (metas.Any()) pontos.Add($"✅ {metas.Count} meta(s) financeira(s) ativa(s)");
        else sugestoes.Add("🎯 Crie metas financeiras para manter o foco.");

        // 4. Investimentos (peso 20)
        decimal totalInv = invs.Sum(i => i.Valor);
        decimal sInv = totalInv > 0 ? Math.Min(20, (float)(totalInv / (rec3 > 0 ? rec3 : 1) * 100) < 5 ? 5 : 15) : 0;
        score += sInv;
        if (totalInv > 0) pontos.Add($"✅ Investe R${totalInv:F0} em {invs.Select(i=>i.Tipo).Distinct().Count()} produto(s)");
        else sugestoes.Add("📈 Comece a investir, mesmo que seja R$30 no Tesouro Selic.");

        // 5. Diversificação de gastos (peso 15) — penaliza se >50% em 1 categoria
        var topCatPct = dep3 > 0 ? trans.Where(t=>t.Tipo=="despesa").GroupBy(t=>t.Categoria)
            .Max(g => g.Sum(t=>t.Valor) / dep3 * 100) : 0;
        decimal sDiver = topCatPct < 40 ? 15 : topCatPct < 60 ? 8 : 3;
        score += sDiver;
        if (topCatPct > 50) alertas.Add($"⚠️ {topCatPct:F0}% dos gastos concentrados em uma categoria.");
        else pontos.Add("✅ Gastos bem diversificados entre categorias.");

        score = Math.Round(Math.Min(100, score), 1);

        // Categoria de perfil
        string categoria = score switch { >= 80 => "Excelente", >= 60 => "Bom", >= 40 => "Regular", >= 20 => "Em desenvolvimento", _ => "Iniciante" };
        string descricao = score switch
        {
            >= 80 => "Você tem um perfil financeiro excelente! Seus hábitos são consistentes com quem alcança independência financeira.",
            >= 60 => "Seu perfil é bom. Com ajustes pontuais, você pode alcançar resultados ainda melhores.",
            >= 40 => "Perfil regular. Há oportunidades claras de melhoria, especialmente em poupança e investimentos.",
            >= 20 => "Perfil em desenvolvimento. Foque em registrar gastos e criar o hábito de poupar.",
            _     => "Você está começando! Use o app diariamente e em poucos meses seu score vai crescer."
        };

        // Persiste score e categoria
        usuario.ScoreFinanceiro = score;
        usuario.CategoriaPerfil = categoria;
        await db.SaveChangesAsync();

        return new AnalisePerfilResponse(score, categoria, descricao, pontos, alertas, sugestoes);
    }
}
