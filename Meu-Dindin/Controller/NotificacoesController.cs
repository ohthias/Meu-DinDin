using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MeuDinDin.Data;
using MeuDinDin.DTOs;

namespace MeuDinDin.Controllers;

[ApiController][Route("api/notificacoes")][Authorize]
public class NotificacoesController(AppDbContext db) : ControllerBase
{
    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet] public async Task<IActionResult> Listar([FromQuery] bool? apenasNaoLidas)
    {
        var q = db.Notificacoes.Where(n => n.UsuarioId == UserId);
        if (apenasNaoLidas == true) q = q.Where(n => !n.Lida);
        var lista = await q.OrderByDescending(n => n.CriadaEm)
            .Select(n => new NotificacaoResponse(n.Id, n.Titulo, n.Mensagem, n.Tipo, n.Icone, n.Lida, n.CriadaEm))
            .Take(50).ToListAsync();
        return Ok(lista);
    }

    [HttpGet("count")] public async Task<IActionResult> Count()
    {
        var count = await db.Notificacoes.CountAsync(n => n.UsuarioId == UserId && !n.Lida);
        return Ok(new { count });
    }

    [HttpPatch("{id:int}/ler")] public async Task<IActionResult> Ler(int id)
    {
        var n = await db.Notificacoes.FirstOrDefaultAsync(n => n.Id == id && n.UsuarioId == UserId);
        if (n is null) return NotFound();
        n.Lida = true;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPatch("ler-todas")] public async Task<IActionResult> LerTodas()
    {
        await db.Notificacoes.Where(n => n.UsuarioId == UserId && !n.Lida)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.Lida, true));
        return NoContent();
    }

    [HttpDelete("{id:int}")] public async Task<IActionResult> Deletar(int id)
    {
        var n = await db.Notificacoes.FirstOrDefaultAsync(n => n.Id == id && n.UsuarioId == UserId);
        if (n is null) return NotFound();
        db.Notificacoes.Remove(n);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
