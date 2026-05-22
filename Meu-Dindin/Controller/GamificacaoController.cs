using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MeuDinDin.Services;
using Meu_Dindin.DTOs;

namespace MeuDinDin.Controllers;

[ApiController]
[Route("api/gamificacao")]
[Authorize]
public class GamificacaoController(GamificacaoService gamificacaoService) : ControllerBase
{
    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // GET /api/gamificacao
    [HttpGet]
    [ProducesResponseType<GamificacaoResumoResponse>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Resumo()
        => Ok(await gamificacaoService.ObterResumoAsync(UserId));

    // GET /api/gamificacao/desafios
    [HttpGet("desafios")]
    [ProducesResponseType<List<DesafioResponse>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Desafios()
        => Ok(await gamificacaoService.ObterDesafiosAsync(UserId));

    // POST /api/gamificacao/desafios/{desafioId}/avancar
    [HttpPost("desafios/{desafioId:int}/avancar")]
    [ProducesResponseType<DesafioResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AvancarDesafio(int desafioId)
    {
        var resultado = await gamificacaoService.AvancarDesafioAsync(UserId, desafioId);
        return resultado is null ? NotFound() : Ok(resultado);
    }

    // GET /api/gamificacao/medalhas
    [HttpGet("medalhas")]
    [ProducesResponseType<List<MedalhaResponse>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Medalhas()
        => Ok(await gamificacaoService.ObterMedalhasAsync(UserId));

    // POST /api/gamificacao/loja/resgatar
    [HttpPost("loja/resgatar")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ResgatarRecompensa([FromBody] ResgatarRequest req)
    {
        var (ok, erro) = await gamificacaoService.ResgatarRecompensaAsync(UserId, req.Custo);
        return ok ? NoContent() : BadRequest(new { erro });
    }
}

public record ResgatarRequest(int Custo);