namespace MeuDinDin.DTOs;

public record RegisterRequest(
    string   Nome,
    string   Email,
    string   Senha,
    DateTime DataNascimento
);

public record LoginRequest(string Email, string Senha);

public record AuthResponse(
    string   Token,
    int      UsuarioId,
    string   Nome,
    string   Email,
    string?  FotoUrl,
    DateTime? DataNascimento,
    decimal  SaldoConta,
    int      Nivel,
    int      XP,
    int      Moedas,
    string   NomeTitulo,
    string   PerfilInvestidor,
    string   NivelExperiencia,
    string   ObjetivoFinanceiro,
    string   DesafioFinanceiro,
    string   FonteRenda,
    decimal  ScoreFinanceiro,
    string   CategoriaPerfil,
    string   ItensResgatados,
    bool     OnboardingCompleto,
    bool     AltoContraste,
    bool     TextoGrande,
    bool     ReduzirAnimacoes,
    bool     PreferenciaLibras
);

public record OnboardingRequest(List<OnboardingRespostaDto> Respostas);
public record OnboardingRespostaDto(int PerguntaIndex, int RespostaIndex, string RespostaTexto);

public record AtualizarPerfilRequest(
    string   Nome,
    string   Email,
    string?  FotoUrl,
    DateTime? DataNascimento,
    bool     AltoContraste,
    bool     TextoGrande,
    bool     ReduzirAnimacoes,
    bool     PreferenciaLibras
);

public record AlterarSenhaRequest(string SenhaAtual, string NovaSenha);

public record PerfilResponse(
    int      Id,
    string   Nome,
    string   Email,
    string?  FotoUrl,
    DateTime? DataNascimento,
    decimal  SaldoConta,
    int      Nivel,
    int      XP,
    int      XpProximoNivel,
    int      Moedas,
    string   NomeTitulo,
    string   PerfilInvestidor,
    string   NivelExperiencia,
    string   ObjetivoFinanceiro,
    string   DesafioFinanceiro,
    string   FonteRenda,
    decimal  ScoreFinanceiro,
    string   CategoriaPerfil,
    string   ItensResgatados,
    bool     AltoContraste,
    bool     TextoGrande,
    bool     ReduzirAnimacoes,
    bool     PreferenciaLibras
);
