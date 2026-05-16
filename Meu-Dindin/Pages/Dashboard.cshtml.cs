using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Meu_Dindin.Pages;

public class DashboardModel : PageModel
{
    public string NomeUsuario { get; set; } = "";
    public string EmailUsuario { get; set; } = "";

    public string PrimeiroNome =>
        string.IsNullOrWhiteSpace(NomeUsuario)
            ? "Usuário"
            : NomeUsuario.Split(' ')[0];

    public IActionResult OnGet()
    {
        if (TempData["NomeUsuario"] == null ||
            TempData["EmailUsuario"] == null)
        {
            return RedirectToPage("/Index");
        }

        NomeUsuario = TempData["NomeUsuario"]?.ToString() ?? "";
        EmailUsuario = TempData["EmailUsuario"]?.ToString() ?? "";

        // Mantém TempData disponível após refresh
        TempData.Keep();

        return Page();
    }

    public IActionResult OnPostLogout()
    {
        TempData.Clear();
        return RedirectToPage("/Index");
    }
}
