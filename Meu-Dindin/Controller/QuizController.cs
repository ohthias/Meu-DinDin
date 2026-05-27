using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MeuDinDin.DTOs;
using MeuDinDin.Services;

namespace MeuDinDin.Controllers;

[ApiController][Route("api/quiz")][Authorize]
public class QuizController(QuizService svc) : ControllerBase
{
    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet("progresso")]               public async Task<IActionResult> Progressos()        => Ok(await svc.ObterTodosProgressosAsync(UserId));
    [HttpGet("historico/{modulo}")]      public async Task<IActionResult> Historico(string modulo) => Ok(await svc.ObterHistoricoModuloAsync(UserId, modulo));
    [HttpGet("resultados")]              public async Task<IActionResult> Resultados()         => Ok(await svc.ObterResultadosAsync(UserId));
    [HttpPost("responder")]              public async Task<IActionResult> Responder([FromBody] QuizRespostaRequest req) => Ok(await svc.RegistrarRespostaAsync(UserId, req));
    [HttpPost("finalizar")]              public async Task<IActionResult> Finalizar([FromBody] QuizResultadoRequest req) => Ok(await svc.FinalizarModuloAsync(UserId, req));
}
