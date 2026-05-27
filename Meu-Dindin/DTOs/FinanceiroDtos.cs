namespace MeuDinDin.DTOs;

// ── Transação ─────────────────────────────────────────────────────────────────
public record TransacaoRequest(string Tipo, decimal Valor, string Categoria, string Descricao, string FormaPagamento, DateTime Data);
public record TransacaoResponse(int Id, string Tipo, decimal Valor, string Categoria, string Descricao, string FormaPagamento, DateTime Data, DateTime CriadoEm);

// ── Resumo financeiro ─────────────────────────────────────────────────────────
public record ResumoFinanceiroResponse(
    decimal TotalReceitas, decimal TotalDespesas, decimal Saldo,
    decimal Economia, decimal PercentualEconomia, decimal PrevisaoProximoMes,
    string MaiorCategoriaGasto, decimal MaiorValorGasto,
    List<CategoriaGastoDto> GastosPorCategoria
);
public record CategoriaGastoDto(string Categoria, decimal Total, decimal Percentual);
public record EvolucaoMensalDto(string Mes, int MesNum, int Ano, decimal Receitas, decimal Despesas, decimal Saldo);

// ── Meta ──────────────────────────────────────────────────────────────────────
public record MetaRequest(string Nome, decimal ValorTotal, decimal ValorAtual, DateTime Prazo, string Cor);
public record MetaResponse(int Id, string Nome, decimal ValorTotal, decimal ValorAtual, decimal Percentual, DateTime Prazo, string Cor, DateTime CriadoEm);
public record AtualizarMetaValorRequest(decimal NovoValorAtual);
public record DepositarMetaRequest(decimal Valor);   // ← dinheiro sai do SaldoConta

// ── Investimento ──────────────────────────────────────────────────────────────
public record InvestimentoRequest(string Tipo, decimal Valor, DateTime DataAporte);
public record InvestimentoResponse(int Id, string Tipo, decimal Valor, decimal RendimentoEstimado, DateTime DataAporte, DateTime CriadoEm);
public record ResumoPorTipoDto(string Tipo, decimal TotalAportado, decimal RendimentoEstimado);
public record ResgateInvestimentoRequest(int InvestimentoId); // ← dinheiro volta ao SaldoConta

// ── Gamificação ───────────────────────────────────────────────────────────────
public record DesafioResponse(int Id, string Titulo, string Descricao, int XpRecompensa, int DuracaoDias, int DiaAtual, decimal Progresso, bool Concluido, string Tipo);
public record MedalhaResponse(int Id, string Titulo, string Descricao, string Emoji, bool Conquistada, DateTime? ConquistadaEm);
public record GamificacaoResumoResponse(int Nivel, int XP, int XpProximoNivel, int Moedas, string NomeTitulo, List<DesafioResponse> Desafios, List<MedalhaResponse> Medalhas);
public record ResgatarLojaRequest(string ItemId, int Custo, string NomeItem);

// ── Recomendação ──────────────────────────────────────────────────────────────
public record RecomendacaoResponse(string Icone, string Titulo, string Mensagem, string Tipo);

// ── Análise ML ────────────────────────────────────────────────────────────────
public record AnalisePerfilResponse(
    decimal ScoreFinanceiro,
    string  CategoriaPerfil,
    string  Descricao,
    List<string> Pontos,
    List<string> Alertas,
    List<string> Sugestoes
);

// ── Quiz / Educação ───────────────────────────────────────────────────────────
public record QuizRespostaRequest(string Modulo, int QuestaoIndex, int RespostaIndex, bool Acertou);
public record QuizModuloProgressoResponse(string Modulo, int TotalAcertos, int TotalRespostas, bool Concluido, DateTime? ConcluidoEm);
public record QuizHistoricoResponse(int QuestaoIndex, int RespostaIndex, bool Acertou, DateTime RespondidoEm);
public record QuizResultadoRequest(string Modulo, int Pontuacao, int Total);
public record QuizResultadoResponse(int Id, string Modulo, int Pontuacao, int Total, int XpGanho, DateTime FinalizadoEm);

// ── Notificação ───────────────────────────────────────────────────────────────
public record NotificacaoResponse(int Id, string Titulo, string Mensagem, string Tipo, string Icone, bool Lida, DateTime CriadaEm);

// ── Relatório ────────────────────────────────────────────────────────────────
public record RelatorioFiltroRequest(int MesInicio, int AnoInicio, int MesFim, int AnoFim);
