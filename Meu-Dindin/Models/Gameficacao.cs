namespace Meu_Dindin.Models;

// ── Desafios ──────────────────────────────────────────────────────────────────
public class Desafio
{
    public int Id { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public int XpRecompensa { get; set; }
    public int DuracaoDias { get; set; }
    public string Tipo { get; set; } = string.Empty; // economia | registro | meta
}

public class DesafioUsuario
{
    public int Id { get; set; }
    public int UsuarioId { get; set; }
    public Usuario Usuario { get; set; } = null!;
    public int DesafioId { get; set; }
    public Desafio Desafio { get; set; } = null!;

    public int DiaAtual { get; set; } = 0;
    public bool Concluido { get; set; } = false;
    public DateTime IniciadoEm { get; set; } = DateTime.UtcNow;
    public DateTime? ConcluidoEm { get; set; }

    public decimal Progresso => Desafio?.DuracaoDias > 0
        ? Math.Min(100, Math.Round((decimal)DiaAtual / Desafio.DuracaoDias * 100, 1))
        : 0;
}

// ── Medalhas ──────────────────────────────────────────────────────────────────
public class Medalha
{
    public int Id { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public string Emoji { get; set; } = "🏅";
}

public class MedalhaUsuario
{
    public int Id { get; set; }
    public int UsuarioId { get; set; }
    public Usuario Usuario { get; set; } = null!;
    public int MedalhaId { get; set; }
    public Medalha Medalha { get; set; } = null!;
    public DateTime ConquistadaEm { get; set; } = DateTime.UtcNow;
}

// ── Onboarding ────────────────────────────────────────────────────────────────
public class OnboardingResposta
{
    public int Id { get; set; }
    public int UsuarioId { get; set; }
    public Usuario Usuario { get; set; } = null!;
    public int PerguntaIndex { get; set; }
    public int RespostaIndex { get; set; }
    public string RespostaTexto { get; set; } = string.Empty;
}