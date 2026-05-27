using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MeuDinDin.DTOs;
using MeuDinDin.Services;

namespace MeuDinDin.Controllers;

[ApiController][Route("api/transacoes")][Authorize]
public class TransacoesController(TransacaoService svc, GamificacaoService gam) : ControllerBase
{
    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet] public async Task<IActionResult> Listar([FromQuery] int? mes, [FromQuery] int? ano)
    {
        var n = DateTime.UtcNow;
        var lista = mes.HasValue ? await svc.ListarAsync(UserId, mes.Value, ano ?? n.Year)
                                 : await svc.ListarTodasAsync(UserId);
        return Ok(lista);
    }

    [HttpGet("periodo")] public async Task<IActionResult> ListarPeriodo(
        [FromQuery] int mesInicio, [FromQuery] int anoInicio, [FromQuery] int mesFim, [FromQuery] int anoFim)
        => Ok(await svc.ListarPeriodoAsync(UserId, mesInicio, anoInicio, mesFim, anoFim));

    [HttpPost] public async Task<IActionResult> Adicionar([FromBody] TransacaoRequest req)
    {
        if (req.Valor <= 0) return BadRequest(new { erro = "Valor deve ser positivo." });
        if (req.Tipo is not ("receita" or "despesa")) return BadRequest(new { erro = "Tipo inválido." });
        var t = await svc.AdicionarAsync(UserId, req);
        await gam.AdicionarXPAsync(UserId, 10);
        return Created($"/api/transacoes/{t.Id}", t);
    }

    [HttpDelete("{id:int}")] public async Task<IActionResult> Remover(int id)
        => await svc.RemoverAsync(UserId, id) ? NoContent() : NotFound();

    [HttpGet("resumo")] public async Task<IActionResult> Resumo([FromQuery] int? mes, [FromQuery] int? ano)
    {
        var n = DateTime.UtcNow;
        return Ok(await svc.ObterResumoAsync(UserId, mes ?? n.Month, ano ?? n.Year));
    }

    [HttpGet("resumo/periodo")] public async Task<IActionResult> ResumoPeriodo(
        [FromQuery] int mesInicio, [FromQuery] int anoInicio, [FromQuery] int mesFim, [FromQuery] int anoFim)
        => Ok(await svc.ObterResumoPeriodoAsync(UserId, mesInicio, anoInicio, mesFim, anoFim));

    [HttpGet("evolucao")] public async Task<IActionResult> Evolucao([FromQuery] int meses = 6)
        => Ok(await svc.EvolucaoMensalAsync(UserId, meses));
}
