using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MeuDinDin.Services;
using Meu_Dindin.Services;
using Meu_Dindin.DTOs;

namespace MeuDinDin.Controllers;

[ApiController]
[Route("api/transacoes")]
[Authorize]
public class TransacoesController(
    TransacaoService transacaoService,
    GamificacaoService gamificacaoService) : ControllerBase
{
    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // GET /api/transacoes?mes=5&ano=2026
    [HttpGet]
    [ProducesResponseType<List<TransacaoResponse>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Listar([FromQuery] int? mes, [FromQuery] int? ano)
    {
        var agora = DateTime.UtcNow;
        var lista = mes.HasValue
            ? await transacaoService.ListarAsync(UserId, mes.Value, ano ?? agora.Year)
            : await transacaoService.ListarTodasAsync(UserId);
        return Ok(lista);
    }

    // POST /api/transacoes
    [HttpPost]
    [ProducesResponseType<TransacaoResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Adicionar([FromBody] TransacaoRequest req)
    {
        if (req.Valor <= 0)
            return BadRequest(new { erro = "O valor deve ser positivo." });
        if (req.Tipo is not ("receita" or "despesa"))
            return BadRequest(new { erro = "Tipo deve ser 'receita' ou 'despesa'." });

        var transacao = await transacaoService.AdicionarAsync(UserId, req);

        // Gamificação: +10 XP por transação registrada
        await gamificacaoService.AdicionarXPAsync(UserId, 10);

        return Created($"/api/transacoes/{transacao.Id}", transacao);
    }

    // DELETE /api/transacoes/{id}
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Remover(int id)
    {
        var ok = await transacaoService.RemoverAsync(UserId, id);
        return ok ? NoContent() : NotFound();
    }

    // GET /api/transacoes/resumo?mes=5&ano=2026
    [HttpGet("resumo")]
    [ProducesResponseType<ResumoFinanceiroResponse>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Resumo([FromQuery] int? mes, [FromQuery] int? ano)
    {
        var agora  = DateTime.UtcNow;
        var resumo = await transacaoService.ObterResumoAsync(
            UserId, mes ?? agora.Month, ano ?? agora.Year);
        return Ok(resumo);
    }

    // GET /api/transacoes/evolucao?meses=5
    [HttpGet("evolucao")]
    [ProducesResponseType<List<EvolucaoMensalDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> EvolucaoMensal([FromQuery] int meses = 5)
    {
        var evolucao = await transacaoService.EvolucaoMensalAsync(UserId, meses);
        return Ok(evolucao);
    }
}