using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MeuDinDin.DTOs;
using MeuDinDin.Services;

namespace MeuDinDin.Controllers;

[ApiController][Route("api/gamificacao")][Authorize]
public class GamificacaoController(GamificacaoService svc) : ControllerBase
{
    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]                    public async Task<IActionResult> Resumo()   => Ok(await svc.ObterResumoAsync(UserId));
    [HttpGet("desafios")]        public async Task<IActionResult> Desafios() => Ok(await svc.ObterDesafiosAsync(UserId));
    [HttpGet("medalhas")]        public async Task<IActionResult> Medalhas() => Ok(await svc.ObterMedalhasAsync(UserId));

    [HttpPost("desafios/{id:int}/avancar")] public async Task<IActionResult> Avancar(int id)
    {
        var r = await svc.AvancarDesafioAsync(UserId, id);
        return r is null ? NotFound() : Ok(r);
    }

    [HttpPost("loja/resgatar")] public async Task<IActionResult> ResgatarLoja([FromBody] ResgatarLojaRequest req)
    {
        var (ok, erro) = await svc.ResgatarLojaAsync(UserId, req);
        return ok ? NoContent() : BadRequest(new { erro });
    }
}
