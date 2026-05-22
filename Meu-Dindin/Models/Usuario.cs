using Meu_DinDin.Models;

namespace Meu_Dindin.Models
{
    public class Usuario
    {
        public int    Id            { get; set; }
        public string Nome          { get; set; } = string.Empty;
        public string Email         { get; set; } = string.Empty;
        public string SenhaHash     { get; set; } = string.Empty;
        public string? FotoUrl      { get; set; }

        // Gamificação
        public int    Nivel         { get; set; } = 1;
        public int    XP            { get; set; } = 0;
        public int    Moedas        { get; set; } = 0;
        public string NomeTitulo    { get; set; } = "Iniciante";

        // Perfil financeiro (resultado do onboarding)
        public string PerfilInvestidor { get; set; } = "Conservador"; // Conservador | Moderado | Arrojado
        public string NivelExperiencia { get; set; } = "Iniciante";   // Iniciante | Intermediário | Avançado
        public string ObjetivoFinanceiro { get; set; } = string.Empty;
        public string DesafioFinanceiro  { get; set; } = string.Empty;
        public string FonteRenda         { get; set; } = string.Empty;
        public int    PorcentagemPoupanca { get; set; } = 0;           // % guardada por mês

        // Acessibilidade
        public bool   AltoContraste    { get; set; } = false;
        public bool   TextoGrande      { get; set; } = false;
        public bool   ReduzirAnimacoes { get; set; } = false;
        public bool   PreferenciaLibras { get; set; } = false;

        public DateTime CriadoEm { get; set; } = DateTime.UtcNow;

        // Navegação
        public ICollection<Transacao>           Transacoes           { get; set; } = new List<Transacao>();
        public ICollection<Meta>                Metas                { get; set; } = new List<Meta>();
        public ICollection<OnboardingResposta>  OnboardingRespostas  { get; set; } = new List<OnboardingResposta>();
        public ICollection<DesafioUsuario>      Desafios             { get; set; } = new List<DesafioUsuario>();
        public ICollection<MedalhaUsuario>      Medalhas             { get; set; } = new List<MedalhaUsuario>();
        public ICollection<Investimento>        Investimentos        { get; set; } = new List<Investimento>();
    }
}