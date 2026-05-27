using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MeuDinDin.DTOs;
using MeuDinDin.Services;

namespace MeuDinDin.Controllers;

[ApiController][Route("api/investimentos")][Authorize]
public class InvestimentosController(InvestimentoService svc, GamificacaoService gam) : ControllerBase
{
    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]           public async Task<IActionResult> Listar()  => Ok(await svc.ListarAsync(UserId));
    [HttpGet("resumo")] public async Task<IActionResult> Resumo()  => Ok(await svc.ResumoAsync(UserId));

    [HttpPost] public async Task<IActionResult> Adicionar([FromBody] InvestimentoRequest req)
    {
        if (req.Valor < 30) return BadRequest(new { erro = "Valor mínimo de aporte é R$30,00." });
        if (!new[] { "Poupança","TesouroDireto","CDB" }.Contains(req.Tipo))
            return BadRequest(new { erro = "Tipo inválido." });
        var (ok, erro, inv) = await svc.AdicionarAsync(UserId, req);
        if (!ok) return BadRequest(new { erro });
        await gam.AdicionarXPAsync(UserId, 50);
        return Created($"/api/investimentos/{inv!.Id}", inv);
    }

    [HttpPost("{id:int}/resgatar")] public async Task<IActionResult> Resgatar(int id)
    {
        var (ok, erro, valor) = await svc.ResgatarAsync(UserId, id);
        return ok ? Ok(new { valorResgatado = valor }) : BadRequest(new { erro });
    }
}
