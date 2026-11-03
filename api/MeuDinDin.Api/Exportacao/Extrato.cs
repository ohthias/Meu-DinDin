using System.Globalization;
using System.Text;
using MeuDinDin.Api.Dados;

namespace MeuDinDin.Api.Exportacao;

/// <summary>Formatos de exportação do extrato.</summary>
public enum FormatoExtrato
{
    /// <summary>Planilha (separador ";" e vírgula decimal, abre direto no Excel em português).</summary>
    csv,
    /// <summary>Open Financial Exchange 1.0.2, aceito por GnuCash, Money e outros gerenciadores.</summary>
    ofx,
}

/// <summary>Gera o extrato nos formatos de arquivo. Mesmo layout de web/src/lib/exportar.ts.</summary>
public static class Extrato
{
    private static readonly CultureInfo PtBr = CultureInfo.GetCultureInfo("pt-BR");

    private static string Csv(string? v)
    {
        v ??= "";
        return v.IndexOfAny([';', '"', '\n', '\r']) >= 0 ? $"\"{v.Replace("\"", "\"\"")}\"" : v;
    }

    public static byte[] GerarCsv(IEnumerable<TransacaoLinha> ts, IReadOnlyDictionary<Guid, string> contas)
    {
        var sb = new StringBuilder();
        sb.Append("Data;Descrição;Categoria;Tipo;Valor;Forma de pagamento;Conta;Origem\r\n");
        foreach (var t in ts.OrderBy(t => t.Data))
        {
            var valor = (t.EhDespesa ? -t.Valor : t.Valor).ToString("0.00", PtBr);
            var conta = t.ContaId is { } id && contas.TryGetValue(id, out var nome) ? nome : "";
            sb.Append(string.Join(';',
                t.Data.ToString("dd/MM/yyyy"), Csv(t.Descricao), Csv(t.Categoria), t.EhReceita ? "Entrada" : "Saída",
                valor, Csv(t.FormaPagamento), Csv(conta), t.Origem == "open_finance" ? "Open Finance" : "Manual"));
            sb.Append("\r\n");
        }
        // BOM para o Excel reconhecer UTF-8
        return [.. Encoding.UTF8.GetPreamble(), .. Encoding.UTF8.GetBytes(sb.ToString())];
    }

    private static string Ofx(string v) => v.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;");

    public static byte[] GerarOfx(IReadOnlyList<TransacaoLinha> ts, DateOnly de, DateOnly ate, string contaId, decimal? saldo, DateTime agora)
    {
        static string D(DateOnly d) => d.ToString("yyyyMMdd");
        var sb = new StringBuilder();
        sb.Append("OFXHEADER:100\r\nDATA:OFXSGML\r\nVERSION:102\r\nSECURITY:NONE\r\nENCODING:UTF-8\r\nCHARSET:NONE\r\nCOMPRESSION:NONE\r\nOLDFILEUID:NONE\r\nNEWFILEUID:NONE\r\n\r\n");
        sb.Append("<OFX>\r\n<SIGNONMSGSRSV1><SONRS><STATUS><CODE>0<SEVERITY>INFO</STATUS>");
        sb.Append($"<DTSERVER>{agora:yyyyMMddHHmmss}<LANGUAGE>POR</SONRS></SIGNONMSGSRSV1>\r\n");
        sb.Append("<BANKMSGSRSV1><STMTTRNRS><TRNUID>1<STATUS><CODE>0<SEVERITY>INFO</STATUS>\r\n<STMTRS><CURDEF>BRL\r\n");
        sb.Append($"<BANKACCTFROM><BANKID>0000<ACCTID>{Ofx(contaId)}<ACCTTYPE>CHECKING</BANKACCTFROM>\r\n");
        sb.Append($"<BANKTRANLIST><DTSTART>{D(de)}<DTEND>{D(ate)}\r\n");
        foreach (var t in ts.OrderBy(t => t.Data))
        {
            var valor = (t.EhDespesa ? -t.Valor : t.Valor).ToString("0.00", CultureInfo.InvariantCulture);
            var nome = string.IsNullOrWhiteSpace(t.Descricao) ? t.Categoria : t.Descricao;
            if (nome.Length > 32) nome = nome[..32];
            sb.Append($"<STMTTRN><TRNTYPE>{(t.EhDespesa ? "DEBIT" : "CREDIT")}<DTPOSTED>{D(t.Data)}<TRNAMT>{valor}");
            sb.Append($"<FITID>{t.Id:N}<NAME>{Ofx(nome)}<MEMO>{Ofx(t.Categoria)}</STMTTRN>\r\n");
        }
        sb.Append("</BANKTRANLIST>\r\n");
        var bal = (saldo ?? ts.Sum(t => t.EhDespesa ? -t.Valor : t.Valor)).ToString("0.00", CultureInfo.InvariantCulture);
        sb.Append($"<LEDGERBAL><BALAMT>{bal}<DTASOF>{D(ate)}</LEDGERBAL>\r\n</STMTRS></STMTTRNRS></BANKMSGSRSV1>\r\n</OFX>\r\n");
        return Encoding.UTF8.GetBytes(sb.ToString());
    }
}
