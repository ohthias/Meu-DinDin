using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MeuDinDin.Services;

namespace MeuDinDin.Controllers;

[ApiController][Route("api/recomendacoes")][Authorize]
public class RecomendacoesController(RecomendacaoService svc) : ControllerBase
{
    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet] public async Task<IActionResult> Obter([FromQuery] int? mes, [FromQuery] int? ano)
    {
        var n = DateTime.UtcNow;
        return Ok(await svc.GerarAsync(UserId, mes ?? n.Month, ano ?? n.Year));
    }

    [HttpGet("analise-perfil")] public async Task<IActionResult> AnalisePerfil()
        => Ok(await svc.AnalisarPerfilMLAsync(UserId));
}
