namespace MeuDinDin.Api.Dados;

// Linhas lidas do Supabase (PostgREST). Os nomes seguem as colunas em snake_case.

public sealed record TransacaoLinha(
    Guid Id, Guid? ContaId, string Origem, string Tipo, decimal Valor,
    string Categoria, string Descricao, string FormaPagamento, DateOnly Data)
{
    public bool EhReceita => Tipo == "receita";
    public bool EhDespesa => Tipo == "despesa";
}

public sealed record ContaLinha(
    Guid Id, Guid? ConexaoId, string Origem, string Nome, string Tipo,
    string Instituicao, string? Numero, decimal Saldo, decimal? LimiteCredito);

public sealed record InvestimentoLinha(
    Guid Id, string Tipo, decimal Valor, DateOnly DataAporte, string Indexador, decimal Taxa,
    string Emissor, DateOnly? Vencimento, bool LiquidezDiaria, DateOnly? ResgatadoEm, decimal? ValorResgate);

public sealed record OrcamentoLinha(Guid Id, string Categoria, decimal Limite, int Mes, int Ano);

public sealed record PerfilLinha(Guid Id, string Nome, string PerfilInvestidor);
