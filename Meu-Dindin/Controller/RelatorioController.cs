using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MeuDinDin.Data;
using MeuDinDin.DTOs;
using MeuDinDin.Services;

namespace MeuDinDin.Controllers;

[ApiController][Route("api/relatorio")][Authorize]
public class RelatorioController(AppDbContext db, TransacaoService transacaoSvc) : ControllerBase
{
    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet("csv")] public async Task<IActionResult> ExportarCsv(
        [FromQuery] int mesInicio, [FromQuery] int anoInicio,
        [FromQuery] int mesFim,    [FromQuery] int anoFim)
    {
        var trans = await transacaoSvc.ListarPeriodoAsync(UserId, mesInicio, anoInicio, mesFim, anoFim);
        var sb = new StringBuilder();
        sb.AppendLine("Data,Tipo,Categoria,Descricao,FormaPagamento,Valor");
        foreach (var t in trans)
            sb.AppendLine($"{t.Data:dd/MM/yyyy},{t.Tipo},{t.Categoria},\"{t.Descricao}\",{t.FormaPagamento},{t.Valor:F2}");
        var bytes = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
        return File(bytes, "text/csv; charset=utf-8", $"meudindin_{mesInicio}-{anoInicio}_a_{mesFim}-{anoFim}.csv");
    }

    [HttpGet("dados")] public async Task<IActionResult> Dados(
        [FromQuery] int mesInicio, [FromQuery] int anoInicio,
        [FromQuery] int mesFim,    [FromQuery] int anoFim)
    {
        var trans   = await transacaoSvc.ListarPeriodoAsync(UserId, mesInicio, anoInicio, mesFim, anoFim);
        var resumo  = await transacaoSvc.ObterResumoPeriodoAsync(UserId, mesInicio, anoInicio, mesFim, anoFim);
        var evolucao = await transacaoSvc.EvolucaoMensalAsync(UserId, 6);
        var usuario = await db.Usuarios.FindAsync(UserId);
        return Ok(new { trans, resumo, evolucao, nomeUsuario = usuario?.Nome });
    }
}
