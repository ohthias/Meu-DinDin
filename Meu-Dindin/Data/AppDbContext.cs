using Microsoft.EntityFrameworkCore;
using MeuDinDin.Models;

namespace MeuDinDin.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Usuario>              Usuarios              => Set<Usuario>();
    public DbSet<Transacao>            Transacoes            => Set<Transacao>();
    public DbSet<Meta>                 Metas                 => Set<Meta>();
    public DbSet<Investimento>         Investimentos         => Set<Investimento>();
    public DbSet<Desafio>              Desafios              => Set<Desafio>();
    public DbSet<DesafioUsuario>       DesafiosUsuarios      => Set<DesafioUsuario>();
    public DbSet<Medalha>              Medalhas              => Set<Medalha>();
    public DbSet<MedalhaUsuario>       MedalhasUsuarios      => Set<MedalhaUsuario>();
    public DbSet<OnboardingResposta>   OnboardingRespostas   => Set<OnboardingResposta>();
    public DbSet<QuizProgresso>        QuizProgressos        => Set<QuizProgresso>();
    public DbSet<QuizModuloProgresso>  QuizModulosProgressos => Set<QuizModuloProgresso>();
    public DbSet<QuizResultado>        QuizResultados        => Set<QuizResultado>();
    public DbSet<Notificacao>          Notificacoes          => Set<Notificacao>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        // Decimais
        foreach (var t in new[] { "Valor" })
            mb.Entity<Transacao>().Property(x => x.Valor).HasColumnType("decimal(18,2)");

        mb.Entity<Meta>().Property(m => m.ValorTotal).HasColumnType("decimal(18,2)");
        mb.Entity<Meta>().Property(m => m.ValorAtual).HasColumnType("decimal(18,2)");
        mb.Entity<Meta>().Ignore(m => m.Percentual);

        mb.Entity<Investimento>().Property(i => i.Valor).HasColumnType("decimal(18,2)");
        mb.Entity<Usuario>().Property(u => u.SaldoConta).HasColumnType("decimal(18,2)");
        mb.Entity<Usuario>().Property(u => u.ScoreFinanceiro).HasColumnType("decimal(5,2)");

        mb.Entity<DesafioUsuario>().Ignore(d => d.Progresso);

        // Índices
        mb.Entity<Usuario>().HasIndex(u => u.Email).IsUnique();
        mb.Entity<Transacao>().HasIndex(t => new { t.UsuarioId, t.Data });
        mb.Entity<QuizProgresso>().HasIndex(q => new { q.UsuarioId, q.Modulo, q.QuestaoIndex });
        mb.Entity<QuizModuloProgresso>().HasIndex(q => new { q.UsuarioId, q.Modulo }).IsUnique();
        mb.Entity<Notificacao>().HasIndex(n => new { n.UsuarioId, n.Lida });

        // Seed Desafios
        mb.Entity<Desafio>().HasData(
            new Desafio { Id = 1, Titulo = "7 dias sem delivery",         Descricao = "Não peça delivery por 7 dias.", XpRecompensa = 150, DuracaoDias = 7,  Tipo = "economia" },
            new Desafio { Id = 2, Titulo = "Registrar 30 dias seguidos",  Descricao = "Registre transações por 30 dias.", XpRecompensa = 300, DuracaoDias = 30, Tipo = "registro" },
            new Desafio { Id = 3, Titulo = "Guardar 10% da renda",        Descricao = "Guarde pelo menos 10% da renda.", XpRecompensa = 200, DuracaoDias = 30, Tipo = "meta" },
            new Desafio { Id = 4, Titulo = "Semana sem compras supérfluas",Descricao = "Evite gastos não essenciais.",   XpRecompensa = 100, DuracaoDias = 7,  Tipo = "economia" }
        );

        // Seed Medalhas
        mb.Entity<Medalha>().HasData(
            new Medalha { Id = 1, Titulo = "Primeira meta",    Descricao = "Criou sua primeira meta.",          Emoji = "🏅" },
            new Medalha { Id = 2, Titulo = "7 dias seguidos",  Descricao = "Registrou por 7 dias seguidos.",   Emoji = "🔥" },
            new Medalha { Id = 3, Titulo = "Economista",       Descricao = "Economizou 3 meses consecutivos.", Emoji = "🏆" },
            new Medalha { Id = 4, Titulo = "1º quiz feito",    Descricao = "Completou o primeiro quiz.",       Emoji = "📚" },
            new Medalha { Id = 5, Titulo = "Investidor",       Descricao = "Fez o primeiro investimento.",     Emoji = "📈" },
            new Medalha { Id = 6, Titulo = "Nível 10",         Descricao = "Atingiu o nível 10.",              Emoji = "🚀" }
        );
    }
}
