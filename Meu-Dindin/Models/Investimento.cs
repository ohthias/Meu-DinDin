using Meu_Dindin.Models;

namespace Meu_DinDin.Models
{
    public class Investimento
    {
        public int Id { get; set; }
        public int UsuarioId { get; set; }
        public Usuario Usuario { get; set; } = null!;

        /// <summary>Poupança | TesouroDireto | CDB</summary>
        public string Tipo { get; set; } = string.Empty;
        public decimal Valor { get; set; }
        public DateTime DataAporte { get; set; }
        public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
    }
}