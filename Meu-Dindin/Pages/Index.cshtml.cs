using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Meu_Dindin.Pages;

public class IndexModel : PageModel
{
    [BindProperty]
    public string Nome { get; set; } = string.Empty;

    [BindProperty]
    public string Email { get; set; } = string.Empty;

    [BindProperty]
    public string Senha { get; set; } = string.Empty;

    public string MensagemErro { get; set; } = string.Empty;

    public void OnGet()
    {
    }

    public IActionResult OnPost()
    {
        // Validação básica
        if (string.IsNullOrWhiteSpace(Nome) ||
            string.IsNullOrWhiteSpace(Email) ||
            string.IsNullOrWhiteSpace(Senha))
        {
            MensagemErro = "Preencha todos os campos.";
            return Page();
        }

        if (Email == "admin@email.com" && Senha == "123456")
        {
            TempData["NomeUsuario"] = Nome;
            TempData["EmailUsuario"] = Email;

            return RedirectToPage("/Dashboard");
        }

        MensagemErro = "E-mail ou senha inválidos.";
        return Page();
    }
}
