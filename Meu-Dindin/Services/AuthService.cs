using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Meu_Dindin.Data;
using Meu_Dindin.DTOs;
using Meu_Dindin.Models;

namespace Meu_Dindin.Services;

public class AuthService(AppDbContext db, IConfiguration config)
{
    // ── Níveis de XP ─────────────────────────────────────────────────────────
    private static readonly int[] XpPorNivel = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5200, 6600];
    private static readonly string[] Titulos  = ["Novato","Poupador","Economizador","Planejador","Financista","Gestor","Economista","Investidor","Especialista","Guru","Mestre DinDin"];

    // ── Registrar ─────────────────────────────────────────────────────────────
    public async Task<(bool Ok, string Erro, AuthResponse? Resp)> RegistrarAsync(RegisterRequest req)
    {
        if (await db.Usuarios.AnyAsync(u => u.Email == req.Email))
            return (false, "E-mail já cadastrado.", null);

        var usuario = new Usuario
        {
            Nome      = req.Nome.Trim(),
            Email     = req.Email.Trim().ToLower(),
            SenhaHash = BCrypt.Net.BCrypt.HashPassword(req.Senha)
        };

        db.Usuarios.Add(usuario);
        await db.SaveChangesAsync();

        var token = GerarToken(usuario);
        return (true, string.Empty, MontarAuthResponse(usuario, token, onboardingCompleto: false));
    }

    // ── Login ─────────────────────────────────────────────────────────────────
    public async Task<(bool Ok, string Erro, AuthResponse? Resp)> LoginAsync(LoginRequest req)
    {
        var usuario = await db.Usuarios
            .FirstOrDefaultAsync(u => u.Email == req.Email.Trim().ToLower());

        if (usuario is null || !BCrypt.Net.BCrypt.Verify(req.Senha, usuario.SenhaHash))
            return (false, "E-mail ou senha incorretos.", null);

        var onboardingCompleto = await db.OnboardingRespostas
            .AnyAsync(o => o.UsuarioId == usuario.Id);

        var token = GerarToken(usuario);
        return (true, string.Empty, MontarAuthResponse(usuario, token, onboardingCompleto));
    }

    // ── Salvar onboarding e adaptar perfil ────────────────────────────────────
    public async Task SalvarOnboardingAsync(int usuarioId, OnboardingRequest req)
    {
        // Remove respostas antigas (se refizer)
        var antigas = db.OnboardingRespostas.Where(o => o.UsuarioId == usuarioId);
        db.OnboardingRespostas.RemoveRange(antigas);

        var novas = req.Respostas.Select(r => new OnboardingResposta
        {
            UsuarioId     = usuarioId,
            PerguntaIndex = r.PerguntaIndex,
            RespostaIndex = r.RespostaIndex,
            RespostaTexto = r.RespostaTexto
        });
        db.OnboardingRespostas.AddRange(novas);

        // Adaptar perfil
        var usuario = await db.Usuarios.FindAsync(usuarioId);
        if (usuario is null) { await db.SaveChangesAsync(); return; }

        var respostas = req.Respostas.ToDictionary(r => r.PerguntaIndex, r => r.RespostaIndex);

        // P0 = Fonte de renda
        usuario.FonteRenda = respostas.GetValueOrDefault(0) switch
        {
            0 => "Bolsa/Estágio",
            1 => "CLT",
            2 => "Freelance",
            3 => "Familiar",
            _ => "Não informado"
        };

        // P1 = Desafio financeiro
        usuario.DesafioFinanceiro = respostas.GetValueOrDefault(1) switch
        {
            0 => "Gastar mais do que ganha",
            1 => "Não consegue poupar",
            2 => "Não sabe investir",
            3 => "Dívidas",
            _ => "Não informado"
        };

        // P2 = Objetivo
        usuario.ObjetivoFinanceiro = respostas.GetValueOrDefault(2) switch
        {
            0 => "Reserva de emergência",
            1 => "Viagem/Compra",
            2 => "Investir",
            3 => "Quitar dívidas",
            _ => "Não informado"
        };

        // P3 = Experiência em investimentos
        int expIdx = respostas.GetValueOrDefault(3);
        usuario.PerfilInvestidor = expIdx switch { 0 or 1 => "Conservador", 2 => "Moderado", 3 => "Arrojado", _ => "Conservador" };
        usuario.NivelExperiencia = expIdx switch { 0 or 1 => "Iniciante", 2 => "Intermediário", 3 => "Avançado", _ => "Iniciante" };

        // P4 = % poupada
        usuario.PorcentagemPoupanca = respostas.GetValueOrDefault(4) switch
        {
            0 => 3, 1 => 7, 2 => 15, 3 => 25, _ => 5
        };

        // P5 = Acessibilidade
        usuario.AltoContraste     = respostas.GetValueOrDefault(5) == 0;
        usuario.TextoGrande       = respostas.GetValueOrDefault(5) == 1;
        usuario.PreferenciaLibras = respostas.GetValueOrDefault(5) == 2;

        await db.SaveChangesAsync();
    }

    // ── Atualizar perfil ──────────────────────────────────────────────────────
    public async Task<(bool Ok, string Erro)> AtualizarPerfilAsync(int usuarioId, AtualizarPerfilRequest req)
    {
        var usuario = await db.Usuarios.FindAsync(usuarioId);
        if (usuario is null) return (false, "Usuário não encontrado.");

        if (!string.IsNullOrWhiteSpace(req.Email) && req.Email != usuario.Email)
        {
            if (await db.Usuarios.AnyAsync(u => u.Email == req.Email && u.Id != usuarioId))
                return (false, "E-mail já está em uso.");
            usuario.Email = req.Email.Trim().ToLower();
        }

        usuario.Nome             = req.Nome.Trim();
        usuario.FotoUrl          = req.FotoUrl;
        usuario.AltoContraste    = req.AltoContraste;
        usuario.TextoGrande      = req.TextoGrande;
        usuario.ReduzirAnimacoes = req.ReduzirAnimacoes;
        usuario.PreferenciaLibras = req.PreferenciaLibras;

        await db.SaveChangesAsync();
        return (true, string.Empty);
    }

    public async Task<(bool Ok, string Erro)> AlterarSenhaAsync(int usuarioId, AlterarSenhaRequest req)
    {
        var usuario = await db.Usuarios.FindAsync(usuarioId);
        if (usuario is null) return (false, "Usuário não encontrado.");
        if (!BCrypt.Net.BCrypt.Verify(req.SenhaAtual, usuario.SenhaHash))
            return (false, "Senha atual incorreta.");

        usuario.SenhaHash = BCrypt.Net.BCrypt.HashPassword(req.NovaSenha);
        await db.SaveChangesAsync();
        return (true, string.Empty);
    }

    public async Task<PerfilResponse?> ObterPerfilAsync(int usuarioId)
    {
        var u = await db.Usuarios.FindAsync(usuarioId);
        if (u is null) return null;
        return new PerfilResponse(u.Id, u.Nome, u.Email, u.FotoUrl, u.Nivel, u.XP, u.Moedas,
            u.NomeTitulo, u.PerfilInvestidor, u.NivelExperiencia, u.ObjetivoFinanceiro,
            u.DesafioFinanceiro, u.FonteRenda, u.AltoContraste, u.TextoGrande,
            u.ReduzirAnimacoes, u.PreferenciaLibras);
    }

    // ── XP / Nível ────────────────────────────────────────────────────────────
    public static void AdicionarXP(Usuario usuario, int xp)
    {
        usuario.XP += xp;
        for (int i = XpPorNivel.Length - 1; i >= 0; i--)
        {
            if (usuario.XP >= XpPorNivel[i])
            {
                usuario.Nivel     = i + 1;
                usuario.NomeTitulo = i < Titulos.Length ? Titulos[i] : Titulos[^1];
                break;
            }
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private string GerarToken(Usuario usuario)
    {
        var key     = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]!));
        var creds   = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims  = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
            new Claim(ClaimTypes.Name,  usuario.Nome),
            new Claim(ClaimTypes.Email, usuario.Email),
        };
        var jwt = new JwtSecurityToken(
            claims:   claims,
            expires:  DateTime.UtcNow.AddDays(30),
            signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(jwt);
    }

    private static AuthResponse MontarAuthResponse(Usuario u, string token, bool onboardingCompleto) =>
        new(token, u.Id, u.Nome, u.Email, u.Nivel, u.XP, u.Moedas,
            u.PerfilInvestidor, onboardingCompleto, u.AltoContraste, u.TextoGrande, u.ReduzirAnimacoes);
}