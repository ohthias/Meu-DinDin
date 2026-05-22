using System.Security.Claims;
using Meu_Dindin.DTOs;
using Meu_Dindin.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MeuDinDin.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AuthService authService) : ControllerBase
{
    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // POST /api/auth/register
    [HttpPost("register")]
    [ProducesResponseType<AuthResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Nome)  ||
            string.IsNullOrWhiteSpace(req.Email) ||
            req.Senha.Length < 8)
            return BadRequest(new { erro = "Nome, e-mail e senha (mín. 8 caracteres) são obrigatórios." });

        var (ok, erro, resp) = await authService.RegistrarAsync(req);
        return ok ? Created(string.Empty, resp) : BadRequest(new { erro });
    }

    // POST /api/auth/login
    [HttpPost("login")]
    [ProducesResponseType<AuthResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        var (ok, erro, resp) = await authService.LoginAsync(req);
        return ok ? Ok(resp) : Unauthorized(new { erro });
    }

    // POST /api/auth/onboarding
    [HttpPost("onboarding")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Onboarding([FromBody] OnboardingRequest req)
    {
        await authService.SalvarOnboardingAsync(UserId, req);
        return NoContent();
    }

    // GET /api/auth/perfil
    [HttpGet("perfil")]
    [Authorize]
    [ProducesResponseType<PerfilResponse>(StatusCodes.Status200OK)]
    public async Task<IActionResult> ObterPerfil()
    {
        var perfil = await authService.ObterPerfilAsync(UserId);
        return perfil is null ? NotFound() : Ok(perfil);
    }

    // PUT /api/auth/perfil
    [HttpPut("perfil")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> AtualizarPerfil([FromBody] AtualizarPerfilRequest req)
    {
        var (ok, erro) = await authService.AtualizarPerfilAsync(UserId, req);
        return ok ? NoContent() : BadRequest(new { erro });
    }

    // PUT /api/auth/senha
    [HttpPut("senha")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> AlterarSenha([FromBody] AlterarSenhaRequest req)
    {
        var (ok, erro) = await authService.AlterarSenhaAsync(UserId, req);
        return ok ? NoContent() : BadRequest(new { erro });
    }
}