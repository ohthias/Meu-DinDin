using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MeuDinDin.Data;
using MeuDinDin.DTOs;
using MeuDinDin.Models;

namespace MeuDinDin.Services;

public class AuthService(AppDbContext db, IConfiguration config)
{
    private static readonly int[]    XpPorNivel = [0,100,300,600,1000,1500,2200,3000,4000,5200,6600];
    private static readonly string[] Titulos    = ["Novato","Poupador","Economizador","Planejador","Financista","Gestor","Economista","Investidor","Especialista","Guru","Mestre DinDin"];

    public async Task<(bool Ok, string Erro, AuthResponse? Resp)> RegistrarAsync(RegisterRequest req)
    {
        if (await db.Usuarios.AnyAsync(u => u.Email == req.Email.Trim().ToLower()))
            return (false, "E-mail já cadastrado.", null);

        var usuario = new Usuario
        {
            Nome            = req.Nome.Trim(),
            Email           = req.Email.Trim().ToLower(),
            SenhaHash       = BCrypt.Net.BCrypt.HashPassword(req.Senha),
            DataNascimento  = req.DataNascimento.Date,
            SaldoConta      = 0
        };
        db.Usuarios.Add(usuario);
        await db.SaveChangesAsync();

        // Notificação de boas-vindas
        db.Notificacoes.Add(new Notificacao
        {
            UsuarioId = usuario.Id,
            Titulo    = "Bem-vindo ao Meu DinDin! 🎉",
            Mensagem  = $"Olá {usuario.Nome.Split(' ')[0]}! Complete o questionário para personalizarmos sua experiência.",
            Tipo      = "info", Icone = "🎉"
        });
        await db.SaveChangesAsync();

        return (true, string.Empty, await MontarAuthResponseAsync(usuario, GerarToken(usuario), false));
    }

    public async Task<(bool Ok, string Erro, AuthResponse? Resp)> LoginAsync(LoginRequest req)
    {
        var usuario = await db.Usuarios.FirstOrDefaultAsync(u => u.Email == req.Email.Trim().ToLower());
        if (usuario is null || !BCrypt.Net.BCrypt.Verify(req.Senha, usuario.SenhaHash))
            return (false, "E-mail ou senha incorretos.", null);

        var onboardingCompleto = await db.OnboardingRespostas.AnyAsync(o => o.UsuarioId == usuario.Id);
        return (true, string.Empty, await MontarAuthResponseAsync(usuario, GerarToken(usuario), onboardingCompleto));
    }

    public async Task SalvarOnboardingAsync(int usuarioId, OnboardingRequest req)
    {
        var antigas = db.OnboardingRespostas.Where(o => o.UsuarioId == usuarioId);
        db.OnboardingRespostas.RemoveRange(antigas);

        db.OnboardingRespostas.AddRange(req.Respostas.Select(r => new OnboardingResposta
        {
            UsuarioId = usuarioId, PerguntaIndex = r.PerguntaIndex,
            RespostaIndex = r.RespostaIndex, RespostaTexto = r.RespostaTexto
        }));

        var usuario = await db.Usuarios.FindAsync(usuarioId);
        if (usuario is null) { await db.SaveChangesAsync(); return; }

        var m = req.Respostas.ToDictionary(r => r.PerguntaIndex, r => r.RespostaIndex);
        usuario.FonteRenda        = m.GetValueOrDefault(0) switch { 0=>"Bolsa/Estágio",1=>"CLT",2=>"Freelance",3=>"Familiar",_=>"Não informado" };
        usuario.DesafioFinanceiro = m.GetValueOrDefault(1) switch { 0=>"Gastar mais do que ganha",1=>"Não consegue poupar",2=>"Não sabe investir",3=>"Dívidas",_=>"Não informado" };
        usuario.ObjetivoFinanceiro= m.GetValueOrDefault(2) switch { 0=>"Reserva de emergência",1=>"Viagem/Compra",2=>"Investir",3=>"Quitar dívidas",_=>"Não informado" };
        int exp = m.GetValueOrDefault(3);
        usuario.PerfilInvestidor  = exp switch { 0 or 1=>"Conservador",2=>"Moderado",3=>"Arrojado",_=>"Conservador" };
        usuario.NivelExperiencia  = exp switch { 0 or 1=>"Iniciante",2=>"Intermediário",3=>"Avançado",_=>"Iniciante" };
        usuario.PorcentagemPoupanca = m.GetValueOrDefault(4) switch { 0=>3,1=>7,2=>15,3=>25,_=>5 };
        usuario.AltoContraste     = m.GetValueOrDefault(5) == 0;
        usuario.TextoGrande       = m.GetValueOrDefault(5) == 1;
        usuario.PreferenciaLibras = m.GetValueOrDefault(5) == 2;

        await db.SaveChangesAsync();

        // Notificação de onboarding concluído
        db.Notificacoes.Add(new Notificacao
        {
            UsuarioId = usuarioId, Titulo = "Perfil configurado! 🎯",
            Mensagem  = "Seu perfil foi personalizado. Confira as recomendações no dashboard.",
            Tipo = "conquista", Icone = "🎯"
        });
        await db.SaveChangesAsync();
    }

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
        usuario.DataNascimento   = req.DataNascimento;
        usuario.AltoContraste    = req.AltoContraste;
        usuario.TextoGrande      = req.TextoGrande;
        usuario.ReduzirAnimacoes = req.ReduzirAnimacoes;
        usuario.PreferenciaLibras= req.PreferenciaLibras;
        await db.SaveChangesAsync();
        return (true, string.Empty);
    }

    public async Task<(bool Ok, string Erro)> AlterarSenhaAsync(int usuarioId, AlterarSenhaRequest req)
    {
        var usuario = await db.Usuarios.FindAsync(usuarioId);
        if (usuario is null) return (false, "Usuário não encontrado.");
        if (!BCrypt.Net.BCrypt.Verify(req.SenhaAtual, usuario.SenhaHash)) return (false, "Senha atual incorreta.");
        usuario.SenhaHash = BCrypt.Net.BCrypt.HashPassword(req.NovaSenha);
        await db.SaveChangesAsync();
        return (true, string.Empty);
    }

    public async Task<PerfilResponse?> ObterPerfilAsync(int usuarioId)
    {
        var u = await db.Usuarios.FindAsync(usuarioId);
        if (u is null) return null;
        int nivelIdx = Math.Min(u.Nivel - 1, XpPorNivel.Length - 1);
        int xpProx   = nivelIdx + 1 < XpPorNivel.Length ? XpPorNivel[nivelIdx + 1] : XpPorNivel[^1];
        return new PerfilResponse(u.Id, u.Nome, u.Email, u.FotoUrl, u.DataNascimento, u.SaldoConta,
            u.Nivel, u.XP, xpProx, u.Moedas, u.NomeTitulo, u.PerfilInvestidor, u.NivelExperiencia,
            u.ObjetivoFinanceiro, u.DesafioFinanceiro, u.FonteRenda, u.ScoreFinanceiro,
            u.CategoriaPerfil, u.ItensResgatados, u.AltoContraste, u.TextoGrande,
            u.ReduzirAnimacoes, u.PreferenciaLibras);
    }

    public static void AdicionarXP(Usuario usuario, int xp)
    {
        usuario.XP += xp;
        for (int i = XpPorNivel.Length - 1; i >= 0; i--)
        {
            if (usuario.XP >= XpPorNivel[i])
            {
                usuario.Nivel      = i + 1;
                usuario.NomeTitulo = i < Titulos.Length ? Titulos[i] : Titulos[^1];
                break;
            }
        }
    }

    private string GerarToken(Usuario usuario)
    {
        var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var jwt   = new JwtSecurityToken(
            claims: [
                new Claim(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
                new Claim(ClaimTypes.Name,  usuario.Nome),
                new Claim(ClaimTypes.Email, usuario.Email)
            ],
            expires: DateTime.UtcNow.AddDays(30),
            signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(jwt);
    }

    private async Task<AuthResponse> MontarAuthResponseAsync(Usuario u, string token, bool onboardingCompleto)
    {
        int nivelIdx = Math.Min(u.Nivel - 1, XpPorNivel.Length - 1);
        _ = nivelIdx; // used for future
        return new AuthResponse(token, u.Id, u.Nome, u.Email, u.FotoUrl, u.DataNascimento,
            u.SaldoConta, u.Nivel, u.XP, u.Moedas, u.NomeTitulo, u.PerfilInvestidor,
            u.NivelExperiencia, u.ObjetivoFinanceiro, u.DesafioFinanceiro, u.FonteRenda,
            u.ScoreFinanceiro, u.CategoriaPerfil, u.ItensResgatados,
            onboardingCompleto, u.AltoContraste, u.TextoGrande, u.ReduzirAnimacoes, u.PreferenciaLibras);
    }
}
