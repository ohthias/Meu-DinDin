using Meu_Dindin.Models;

namespace Meu_DinDin.Models
{
    public class Transacao
    {
        public int       Id             { get; set; }
        public int       UsuarioId      { get; set; }
        public Usuario   Usuario        { get; set; } = null!;

        /// <summary>"receita" ou "despesa"</summary>
        public string    Tipo           { get; set; } = string.Empty;
        public decimal   Valor          { get; set; }
        public string    Categoria      { get; set; } = string.Empty;
        public string    Descricao      { get; set; } = string.Empty;
        public string    FormaPagamento { get; set; } = string.Empty;
        public DateTime  Data           { get; set; }
        public DateTime  CriadoEm      { get; set; } = DateTime.UtcNow;
    }
}