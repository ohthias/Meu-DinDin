using Microsoft.EntityFrameworkCore;
using Meu_Dindin.Models;
using Meu_DinDin.Models;

namespace Meu_Dindin.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Usuario>           Usuarios           => Set<Usuario>();
    public DbSet<Transacao>         Transacoes         => Set<Transacao>();
    public DbSet<Meta>              Metas              => Set<Meta>();
    public DbSet<Investimento>      Investimentos      => Set<Investimento>();
    public DbSet<Desafio>           Desafios           => Set<Desafio>();
    public DbSet<DesafioUsuario>    DesafiosUsuarios   => Set<DesafioUsuario>();
    public DbSet<Medalha>           Medalhas           => Set<Medalha>();
    public DbSet<MedalhaUsuario>    MedalhasUsuarios   => Set<MedalhaUsuario>();
    public DbSet<OnboardingResposta> OnboardingRespostas => Set<OnboardingResposta>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        // ── Precisão decimal ────────────────────────────────────────────────
        mb.Entity<Transacao>()
          .Property(t => t.Valor)
          .HasColumnType("decimal(18,2)");

        mb.Entity<Meta>()
          .Property(m => m.ValorTotal)
          .HasColumnType("decimal(18,2)");
        mb.Entity<Meta>()
          .Property(m => m.ValorAtual)
          .HasColumnType("decimal(18,2)");
        mb.Entity<Meta>()
          .Ignore(m => m.Percentual); // propriedade calculada

        mb.Entity<Investimento>()
          .Property(i => i.Valor)
          .HasColumnType("decimal(18,2)");

        mb.Entity<DesafioUsuario>()
          .Ignore(d => d.Progresso); // propriedade calculada

        // ── Índices ─────────────────────────────────────────────────────────
        mb.Entity<Usuario>()
          .HasIndex(u => u.Email)
          .IsUnique();

        mb.Entity<Transacao>()
          .HasIndex(t => new { t.UsuarioId, t.Data });

        // ── Seed: Desafios padrão ────────────────────────────────────────────
        mb.Entity<Desafio>().HasData(
            new Desafio { Id = 1, Titulo = "7 dias sem delivery",       Descricao = "Não peça delivery por 7 dias e economize.",         XpRecompensa = 150, DuracaoDias = 7,  Tipo = "economia" },
            new Desafio { Id = 2, Titulo = "Registrar 30 dias seguidos",Descricao = "Registre suas transações todos os dias por 30 dias.",XpRecompensa = 300, DuracaoDias = 30, Tipo = "registro" },
            new Desafio { Id = 3, Titulo = "Guardar 10% da renda",      Descricao = "Guarde pelo menos 10% da sua renda este mês.",       XpRecompensa = 200, DuracaoDias = 30, Tipo = "meta"     },
            new Desafio { Id = 4, Titulo = "Semana sem compras supérfluas", Descricao = "Evite gastos não essenciais por 7 dias.",         XpRecompensa = 100, DuracaoDias = 7,  Tipo = "economia" }
        );

        // ── Seed: Medalhas padrão ────────────────────────────────────────────
        mb.Entity<Medalha>().HasData(
            new Medalha { Id = 1, Titulo = "Primeira meta",     Descricao = "Criou sua primeira meta financeira.",       Emoji = "🏅" },
            new Medalha { Id = 2, Titulo = "7 dias seguidos",   Descricao = "Registrou transações por 7 dias seguidos.", Emoji = "🔥" },
            new Medalha { Id = 3, Titulo = "Economista",        Descricao = "Economizou em 3 meses consecutivos.",       Emoji = "🏆" },
            new Medalha { Id = 4, Titulo = "1º quiz feito",     Descricao = "Completou seu primeiro quiz de educação.",  Emoji = "📚" },
            new Medalha { Id = 5, Titulo = "Investidor",        Descricao = "Fez seu primeiro investimento.",            Emoji = "📈" },
            new Medalha { Id = 6, Titulo = "Nível 10",          Descricao = "Atingiu o nível 10.",                      Emoji = "🚀" }
        );
    }
}