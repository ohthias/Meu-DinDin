namespace MeuDinDin.Models;

public class Meta
{
    public int      Id         { get; set; }
    public int      UsuarioId  { get; set; }
    public Usuario  Usuario    { get; set; } = null!;
    public string   Nome       { get; set; } = string.Empty;
    public decimal  ValorTotal { get; set; }
    public decimal  ValorAtual { get; set; } = 0;
    public DateTime Prazo      { get; set; }
    public string   Cor        { get; set; } = "#639922";
    public DateTime CriadoEm  { get; set; } = DateTime.UtcNow;
    public decimal Percentual => ValorTotal > 0
        ? Math.Min(100, Math.Round(ValorAtual / ValorTotal * 100, 1)) : 0;
}
