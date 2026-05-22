using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MeuDinDin.Services;
using Meu_Dindin.Services;
using Meu_Dindin.DTOs;

namespace MeuDinDin.Controllers;

[ApiController]
[Route("api/metas")]
[Authorize]
public class MetasController(MetaService metaService, GamificacaoService gamificacaoService) : ControllerBase
{
    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // GET /api/metas
    [HttpGet]
    [ProducesResponseType<List<MetaResponse>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Listar()
        => Ok(await metaService.ListarAsync(UserId));

    // POST /api/metas
    [HttpPost]
    [ProducesResponseType<MetaResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Criar([FromBody] MetaRequest req)
    {
        if (req.ValorTotal <= 0)
            return BadRequest(new { erro = "Valor total deve ser positivo." });

        var meta = await metaService.CriarAsync(UserId, req);

        // Gamificação: +25 XP por nova meta + medalha "Primeira meta"
        await gamificacaoService.AdicionarXPAsync(UserId, 25);
        await gamificacaoService.ConcederMedalhaAsync(UserId, medalhaId: 1);

        return Created($"/api/metas/{meta.Id}", meta);
    }

    // PATCH /api/metas/{id}/valor
    [HttpPatch("{id:int}/valor")]
    [ProducesResponseType<MetaResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AtualizarValor(int id, [FromBody] AtualizarMetaValorRequest req)
    {
        var meta = await metaService.AtualizarValorAsync(UserId, id, req);
        return meta is null ? NotFound() : Ok(meta);
    }

    // DELETE /api/metas/{id}
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Remover(int id)
    {
        var ok = await metaService.RemoverAsync(UserId, id);
        return ok ? NoContent() : NotFound();
    }
}