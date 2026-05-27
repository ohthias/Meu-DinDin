using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MeuDinDin.DTOs;
using MeuDinDin.Services;

namespace MeuDinDin.Controllers;

[ApiController][Route("api/metas")][Authorize]
public class MetasController(MetaService svc, GamificacaoService gam) : ControllerBase
{
    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet] public async Task<IActionResult> Listar() => Ok(await svc.ListarAsync(UserId));

    [HttpPost] public async Task<IActionResult> Criar([FromBody] MetaRequest req)
    {
        if (req.ValorTotal <= 0) return BadRequest(new { erro = "Valor total deve ser positivo." });
        var meta = await svc.CriarAsync(UserId, req);
        await gam.AdicionarXPAsync(UserId, 25);
        await gam.ConcederMedalhaAsync(UserId, 1);
        return Created($"/api/metas/{meta.Id}", meta);
    }

    [HttpPost("{id:int}/depositar")] public async Task<IActionResult> Depositar(int id, [FromBody] DepositarMetaRequest req)
    {
        var (ok, erro, meta) = await svc.DepositarAsync(UserId, id, req);
        return ok ? Ok(meta) : BadRequest(new { erro });
    }

    [HttpPost("{id:int}/resgatar")] public async Task<IActionResult> Resgatar(int id, [FromBody] AtualizarMetaValorRequest req)
    {
        var (ok, erro, meta) = await svc.ResgatarAsync(UserId, id, req.NovoValorAtual);
        return ok ? Ok(meta) : BadRequest(new { erro });
    }

    [HttpDelete("{id:int}")] public async Task<IActionResult> Remover(int id)
        => await svc.RemoverAsync(UserId, id) ? NoContent() : NotFound();
}
