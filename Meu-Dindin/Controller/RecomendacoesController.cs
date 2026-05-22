using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Meu_Dindin.DTOs;
using Meu_Dindin.Services;

namespace MeuDinDin.Controllers;

[ApiController]
[Route("api/recomendacoes")]
[Authorize]
public class RecomendacoesController(RecomendacaoService recomendacaoService) : ControllerBase
{
    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // GET /api/recomendacoes?mes=5&ano=2026
    [HttpGet]
    [ProducesResponseType<List<RecomendacaoResponse>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Obter([FromQuery] int? mes, [FromQuery] int? ano)
    {
        var agora = DateTime.UtcNow;
        var recs  = await recomendacaoService.GerarAsync(UserId, mes ?? agora.Month, ano ?? agora.Year);
        return Ok(recs);
    }
}