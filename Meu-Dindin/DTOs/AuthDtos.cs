namespace Meu_Dindin.DTOs;

// ── Auth ──────────────────────────────────────────────────────────────────────
public record RegisterRequest(string Nome, string Email, string Senha);

public record LoginRequest(string Email, string Senha);

public record AuthResponse(
    string Token,
    int    UsuarioId,
    string Nome,
    string Email,
    int    Nivel,
    int    XP,
    int    Moedas,
    string PerfilInvestidor,
    bool   OnboardingCompleto,
    bool   AltoContraste,
    bool   TextoGrande,
    bool   ReduzirAnimacoes
);

// ── Onboarding ────────────────────────────────────────────────────────────────
public record OnboardingRequest(List<OnboardingRespostaDto> Respostas);

public record OnboardingRespostaDto(int PerguntaIndex, int RespostaIndex, string RespostaTexto);

// ── Perfil ────────────────────────────────────────────────────────────────────
public record AtualizarPerfilRequest(
    string  Nome,
    string  Email,
    string? FotoUrl,
    bool    AltoContraste,
    bool    TextoGrande,
    bool    ReduzirAnimacoes,
    bool    PreferenciaLibras
);

public record AlterarSenhaRequest(string SenhaAtual, string NovaSenha);

public record PerfilResponse(
    int     Id,
    string  Nome,
    string  Email,
    string? FotoUrl,
    int     Nivel,
    int     XP,
    int     Moedas,
    string  NomeTitulo,
    string  PerfilInvestidor,
    string  NivelExperiencia,
    string  ObjetivoFinanceiro,
    string  DesafioFinanceiro,
    string  FonteRenda,
    bool    AltoContraste,
    bool    TextoGrande,
    bool    ReduzirAnimacoes,
    bool    PreferenciaLibras
);