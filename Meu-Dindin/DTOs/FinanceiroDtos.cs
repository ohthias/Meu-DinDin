namespace Meu_Dindin.DTOs;

// ── Transação ─────────────────────────────────────────────────────────────────
public record TransacaoRequest(
    string   Tipo,           // "receita" | "despesa"
    decimal  Valor,
    string   Categoria,
    string   Descricao,
    string   FormaPagamento,
    DateTime Data
);

public record TransacaoResponse(
    int      Id,
    string   Tipo,
    decimal  Valor,
    string   Categoria,
    string   Descricao,
    string   FormaPagamento,
    DateTime Data,
    DateTime CriadoEm
);

// ── Resumo financeiro ─────────────────────────────────────────────────────────
public record ResumoFinanceiroResponse(
    decimal TotalReceitas,
    decimal TotalDespesas,
    decimal Saldo,
    decimal Economia,
    decimal PercentualEconomia,
    decimal PrevisaoProximoMes,
    string  MaiorCategoriaGasto,
    decimal MaiorValorGasto,
    List<CategoriaGastoDto> GastosPorCategoria
);

public record CategoriaGastoDto(string Categoria, decimal Total, decimal Percentual);

public record EvolucaoMensalDto(string Mes, decimal Receitas, decimal Despesas, decimal Saldo);

// ── Meta ──────────────────────────────────────────────────────────────────────
public record MetaRequest(
    string   Nome,
    decimal  ValorTotal,
    decimal  ValorAtual,
    DateTime Prazo,
    string   Cor
);

public record MetaResponse(
    int      Id,
    string   Nome,
    decimal  ValorTotal,
    decimal  ValorAtual,
    decimal  Percentual,
    DateTime Prazo,
    string   Cor,
    DateTime CriadoEm
);

public record AtualizarMetaValorRequest(decimal NovoValorAtual);

// ── Investimento ──────────────────────────────────────────────────────────────
public record InvestimentoRequest(
    string   Tipo,
    decimal  Valor,
    DateTime DataAporte
);

public record InvestimentoResponse(
    int      Id,
    string   Tipo,
    decimal  Valor,
    decimal  RendimentoEstimado,
    DateTime DataAporte,
    DateTime CriadoEm
);

public record ResumoPorTipoDto(string Tipo, decimal TotalAportado, decimal RendimentoEstimado);

// ── Gamificação ───────────────────────────────────────────────────────────────
public record DesafioResponse(
    int      Id,
    string   Titulo,
    string   Descricao,
    int      XpRecompensa,
    int      DuracaoDias,
    int      DiaAtual,
    decimal  Progresso,
    bool     Concluido,
    string   Tipo
);

public record MedalhaResponse(
    int      Id,
    string   Titulo,
    string   Descricao,
    string   Emoji,
    bool     Conquistada,
    DateTime? ConquistadaEm
);

public record GamificacaoResumoResponse(
    int    Nivel,
    int    XP,
    int    XpProximoNivel,
    int    Moedas,
    string NomeTitulo,
    List<DesafioResponse>  Desafios,
    List<MedalhaResponse>  Medalhas
);

// ── Recomendação ──────────────────────────────────────────────────────────────
public record RecomendacaoResponse(
    string Icone,
    string Titulo,
    string Mensagem,
    string Tipo   // alerta | dica | parabens
);