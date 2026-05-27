using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MeuDinDin.Migrations;

/// <inheritdoc />
public partial class InitialCreate : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // ── Usuarios ──────────────────────────────────────────────────────────
        migrationBuilder.CreateTable(
            name: "Usuarios",
            columns: table => new
            {
                Id                  = table.Column<int>(nullable: false).Annotation("Sqlite:Autoincrement", true),
                Nome                = table.Column<string>(nullable: false, defaultValue: ""),
                Email               = table.Column<string>(nullable: false, defaultValue: ""),
                SenhaHash           = table.Column<string>(nullable: false, defaultValue: ""),
                FotoUrl             = table.Column<string>(nullable: true),
                Nivel               = table.Column<int>(nullable: false, defaultValue: 1),
                XP                  = table.Column<int>(nullable: false, defaultValue: 0),
                Moedas              = table.Column<int>(nullable: false, defaultValue: 0),
                NomeTitulo          = table.Column<string>(nullable: false, defaultValue: "Iniciante"),
                PerfilInvestidor    = table.Column<string>(nullable: false, defaultValue: "Conservador"),
                NivelExperiencia    = table.Column<string>(nullable: false, defaultValue: "Iniciante"),
                ObjetivoFinanceiro  = table.Column<string>(nullable: false, defaultValue: ""),
                DesafioFinanceiro   = table.Column<string>(nullable: false, defaultValue: ""),
                FonteRenda          = table.Column<string>(nullable: false, defaultValue: ""),
                PorcentagemPoupanca = table.Column<int>(nullable: false, defaultValue: 0),
                AltoContraste       = table.Column<bool>(nullable: false, defaultValue: false),
                TextoGrande         = table.Column<bool>(nullable: false, defaultValue: false),
                ReduzirAnimacoes    = table.Column<bool>(nullable: false, defaultValue: false),
                PreferenciaLibras   = table.Column<bool>(nullable: false, defaultValue: false),
                CriadoEm           = table.Column<DateTime>(nullable: false)
            },
            constraints: table => table.PrimaryKey("PK_Usuarios", x => x.Id));

        migrationBuilder.CreateIndex(
            name: "IX_Usuarios_Email",
            table: "Usuarios",
            column: "Email",
            unique: true);

        // ── Transacoes ────────────────────────────────────────────────────────
        migrationBuilder.CreateTable(
            name: "Transacoes",
            columns: table => new
            {
                Id             = table.Column<int>(nullable: false).Annotation("Sqlite:Autoincrement", true),
                UsuarioId      = table.Column<int>(nullable: false),
                Tipo           = table.Column<string>(nullable: false, defaultValue: ""),
                Valor          = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                Categoria      = table.Column<string>(nullable: false, defaultValue: ""),
                Descricao      = table.Column<string>(nullable: false, defaultValue: ""),
                FormaPagamento = table.Column<string>(nullable: false, defaultValue: ""),
                Data           = table.Column<DateTime>(nullable: false),
                CriadoEm      = table.Column<DateTime>(nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Transacoes", x => x.Id);
                table.ForeignKey("FK_Transacoes_Usuarios_UsuarioId",
                    x => x.UsuarioId, "Usuarios", "Id", onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_Transacoes_UsuarioId_Data",
            table: "Transacoes",
            columns: new[] { "UsuarioId", "Data" });

        // ── Metas ─────────────────────────────────────────────────────────────
        migrationBuilder.CreateTable(
            name: "Metas",
            columns: table => new
            {
                Id         = table.Column<int>(nullable: false).Annotation("Sqlite:Autoincrement", true),
                UsuarioId  = table.Column<int>(nullable: false),
                Nome       = table.Column<string>(nullable: false, defaultValue: ""),
                ValorTotal = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                ValorAtual = table.Column<decimal>(type: "decimal(18,2)", nullable: false, defaultValue: 0m),
                Prazo      = table.Column<DateTime>(nullable: false),
                Cor        = table.Column<string>(nullable: false, defaultValue: "#639922"),
                CriadoEm  = table.Column<DateTime>(nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Metas", x => x.Id);
                table.ForeignKey("FK_Metas_Usuarios_UsuarioId",
                    x => x.UsuarioId, "Usuarios", "Id", onDelete: ReferentialAction.Cascade);
            });

        // ── Investimentos ─────────────────────────────────────────────────────
        migrationBuilder.CreateTable(
            name: "Investimentos",
            columns: table => new
            {
                Id         = table.Column<int>(nullable: false).Annotation("Sqlite:Autoincrement", true),
                UsuarioId  = table.Column<int>(nullable: false),
                Tipo       = table.Column<string>(nullable: false, defaultValue: ""),
                Valor      = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                DataAporte = table.Column<DateTime>(nullable: false),
                CriadoEm  = table.Column<DateTime>(nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Investimentos", x => x.Id);
                table.ForeignKey("FK_Investimentos_Usuarios_UsuarioId",
                    x => x.UsuarioId, "Usuarios", "Id", onDelete: ReferentialAction.Cascade);
            });

        // ── Desafios ──────────────────────────────────────────────────────────
        migrationBuilder.CreateTable(
            name: "Desafios",
            columns: table => new
            {
                Id           = table.Column<int>(nullable: false).Annotation("Sqlite:Autoincrement", true),
                Titulo       = table.Column<string>(nullable: false, defaultValue: ""),
                Descricao    = table.Column<string>(nullable: false, defaultValue: ""),
                XpRecompensa = table.Column<int>(nullable: false),
                DuracaoDias  = table.Column<int>(nullable: false),
                Tipo         = table.Column<string>(nullable: false, defaultValue: "")
            },
            constraints: table => table.PrimaryKey("PK_Desafios", x => x.Id));

        // Seed desafios
        migrationBuilder.InsertData("Desafios", new[] { "Id","Titulo","Descricao","XpRecompensa","DuracaoDias","Tipo" }, new object[,]
        {
            { 1, "7 dias sem delivery",        "Não peça delivery por 7 dias e economize.",          150, 7,  "economia" },
            { 2, "Registrar 30 dias seguidos", "Registre suas transações todos os dias por 30 dias.",300, 30, "registro" },
            { 3, "Guardar 10% da renda",       "Guarde pelo menos 10% da sua renda este mês.",       200, 30, "meta"     },
            { 4, "Semana sem compras supérfluas","Evite gastos não essenciais por 7 dias.",           100, 7,  "economia" }
        });

        // ── DesafiosUsuarios ──────────────────────────────────────────────────
        migrationBuilder.CreateTable(
            name: "DesafiosUsuarios",
            columns: table => new
            {
                Id          = table.Column<int>(nullable: false).Annotation("Sqlite:Autoincrement", true),
                UsuarioId   = table.Column<int>(nullable: false),
                DesafioId   = table.Column<int>(nullable: false),
                DiaAtual    = table.Column<int>(nullable: false, defaultValue: 0),
                Concluido   = table.Column<bool>(nullable: false, defaultValue: false),
                IniciadoEm  = table.Column<DateTime>(nullable: false),
                ConcluidoEm = table.Column<DateTime>(nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_DesafiosUsuarios", x => x.Id);
                table.ForeignKey("FK_DesafiosUsuarios_Usuarios_UsuarioId",
                    x => x.UsuarioId, "Usuarios", "Id", onDelete: ReferentialAction.Cascade);
                table.ForeignKey("FK_DesafiosUsuarios_Desafios_DesafioId",
                    x => x.DesafioId, "Desafios", "Id", onDelete: ReferentialAction.Cascade);
            });

        // ── Medalhas ──────────────────────────────────────────────────────────
        migrationBuilder.CreateTable(
            name: "Medalhas",
            columns: table => new
            {
                Id       = table.Column<int>(nullable: false).Annotation("Sqlite:Autoincrement", true),
                Titulo   = table.Column<string>(nullable: false, defaultValue: ""),
                Descricao = table.Column<string>(nullable: false, defaultValue: ""),
                Emoji    = table.Column<string>(nullable: false, defaultValue: "🏅")
            },
            constraints: table => table.PrimaryKey("PK_Medalhas", x => x.Id));

        // Seed medalhas
        migrationBuilder.InsertData("Medalhas", new[] { "Id","Titulo","Descricao","Emoji" }, new object[,]
        {
            { 1, "Primeira meta",   "Criou sua primeira meta financeira.",       "🏅" },
            { 2, "7 dias seguidos", "Registrou transações por 7 dias seguidos.", "🔥" },
            { 3, "Economista",      "Economizou em 3 meses consecutivos.",       "🏆" },
            { 4, "1º quiz feito",   "Completou seu primeiro quiz de educação.",  "📚" },
            { 5, "Investidor",      "Fez seu primeiro investimento.",            "📈" },
            { 6, "Nível 10",        "Atingiu o nível 10.",                      "🚀" }
        });

        // ── MedalhasUsuarios ──────────────────────────────────────────────────
        migrationBuilder.CreateTable(
            name: "MedalhasUsuarios",
            columns: table => new
            {
                Id            = table.Column<int>(nullable: false).Annotation("Sqlite:Autoincrement", true),
                UsuarioId     = table.Column<int>(nullable: false),
                MedalhaId     = table.Column<int>(nullable: false),
                ConquistadaEm = table.Column<DateTime>(nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_MedalhasUsuarios", x => x.Id);
                table.ForeignKey("FK_MedalhasUsuarios_Usuarios_UsuarioId",
                    x => x.UsuarioId, "Usuarios", "Id", onDelete: ReferentialAction.Cascade);
                table.ForeignKey("FK_MedalhasUsuarios_Medalhas_MedalhaId",
                    x => x.MedalhaId, "Medalhas", "Id", onDelete: ReferentialAction.Cascade);
            });

        // ── OnboardingRespostas ───────────────────────────────────────────────
        migrationBuilder.CreateTable(
            name: "OnboardingRespostas",
            columns: table => new
            {
                Id            = table.Column<int>(nullable: false).Annotation("Sqlite:Autoincrement", true),
                UsuarioId     = table.Column<int>(nullable: false),
                PerguntaIndex = table.Column<int>(nullable: false),
                RespostaIndex = table.Column<int>(nullable: false),
                RespostaTexto = table.Column<string>(nullable: false, defaultValue: "")
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_OnboardingRespostas", x => x.Id);
                table.ForeignKey("FK_OnboardingRespostas_Usuarios_UsuarioId",
                    x => x.UsuarioId, "Usuarios", "Id", onDelete: ReferentialAction.Cascade);
            });
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable("OnboardingRespostas");
        migrationBuilder.DropTable("MedalhasUsuarios");
        migrationBuilder.DropTable("DesafiosUsuarios");
        migrationBuilder.DropTable("Investimentos");
        migrationBuilder.DropTable("Transacoes");
        migrationBuilder.DropTable("Metas");
        migrationBuilder.DropTable("Medalhas");
        migrationBuilder.DropTable("Desafios");
        migrationBuilder.DropTable("Usuarios");
    }
}
