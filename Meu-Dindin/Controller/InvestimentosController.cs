using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MeuDinDin.Services;
using Meu_Dindin.Services;
using Meu_Dindin.DTOs;

namespace MeuDinDin.Controllers;

[ApiController]
[Route("api/investimentos")]
[Authorize]
public class InvestimentosController(
    InvestimentoService investimentoService,
    GamificacaoService  gamificacaoService) : ControllerBase
{
    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // GET /api/investimentos
    [HttpGet]
    [ProducesResponseType<List<InvestimentoResponse>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Listar()
        => Ok(await investimentoService.ListarAsync(UserId));

    // GET /api/investimentos/resumo
    [HttpGet("resumo")]
    [ProducesResponseType<List<ResumoPorTipoDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Resumo()
        => Ok(await investimentoService.ResumoAsync(UserId));

    // POST /api/investimentos
    [HttpPost]
    [ProducesResponseType<InvestimentoResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Adicionar([FromBody] InvestimentoRequest req)
    {
        if (req.Valor < 30)
            return BadRequest(new { erro = "Valor mínimo de aporte é R$30,00." });

        var validos = new[] { "Poupança", "TesouroDireto", "CDB" };
        if (!validos.Contains(req.Tipo))
            return BadRequest(new { erro = "Tipo inválido. Use: Poupança, TesouroDireto ou CDB." });

        var inv = await investimentoService.AdicionarAsync(UserId, req);

        // Gamificação: +50 XP por aporte
        await gamificacaoService.AdicionarXPAsync(UserId, 50);

        return Created($"/api/investimentos/{inv.Id}", inv);
    }

    // DELETE /api/investimentos/{id}
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Remover(int id)
    {
        var ok = await investimentoService.RemoverAsync(UserId, id);
        return ok ? NoContent() : NotFound();
    }
}