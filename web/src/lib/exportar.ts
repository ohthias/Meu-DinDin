// Exportação do extrato. CSV e OFX seguem o mesmo layout da API em C#
// (api/MeuDinDin.Api/Exportacao/Extrato.cs); o PDF é gerado só no navegador.
import type { Conta, Transacao } from './types'
import { dinheiro } from './format'

export type FormatoExtrato = 'csv' | 'ofx' | 'pdf'

const dataBR = (s: string) => s.split('-').reverse().join('/')
const valorBR = (n: number) => n.toFixed(2).replace('.', ',')
const assinado = (t: Transacao) => (t.tipo === 'despesa' ? -t.valor : t.valor)
const ordenar = (ts: Transacao[]) => [...ts].sort((a, b) => a.data.localeCompare(b.data))

function campoCsv(v: string) {
  return /[;"\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

export function gerarCsv(ts: Transacao[], contas: Conta[]): string {
  const nome = new Map(contas.map((c) => [c.id, c.nome]))
  const linhas = ['Data;Descrição;Categoria;Tipo;Valor;Forma de pagamento;Conta;Origem']
  for (const t of ordenar(ts)) {
    linhas.push([
      dataBR(t.data), campoCsv(t.descricao), campoCsv(t.categoria), t.tipo === 'receita' ? 'Entrada' : 'Saída',
      valorBR(assinado(t)), campoCsv(t.forma_pagamento), campoCsv((t.conta_id && nome.get(t.conta_id)) || ''),
      t.origem === 'open_finance' ? 'Open Finance' : 'Manual',
    ].join(';'))
  }
  // BOM para o Excel reconhecer UTF-8
  return '﻿' + linhas.join('\r\n') + '\r\n'
}

const escOfx = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const dataOfx = (s: string) => s.replace(/-/g, '')

export function gerarOfx(ts: Transacao[], de: string, ate: string, conta?: Conta, agora = new Date()): string {
  const servidor = agora.toISOString().replace(/[-:T]/g, '').slice(0, 14)
  const corpo = ordenar(ts).map((t) => {
    const nome = (t.descricao || t.categoria).slice(0, 32)
    return `<STMTTRN><TRNTYPE>${t.tipo === 'despesa' ? 'DEBIT' : 'CREDIT'}<DTPOSTED>${dataOfx(t.data)}<TRNAMT>${assinado(t).toFixed(2)}` +
      `<FITID>${t.id.replace(/-/g, '')}<NAME>${escOfx(nome)}<MEMO>${escOfx(t.categoria)}</STMTTRN>`
  })
  const saldo = (conta ? conta.saldo : ts.reduce((s, t) => s + assinado(t), 0)).toFixed(2)
  return [
    'OFXHEADER:100', 'DATA:OFXSGML', 'VERSION:102', 'SECURITY:NONE', 'ENCODING:UTF-8', 'CHARSET:NONE', 'COMPRESSION:NONE', 'OLDFILEUID:NONE', 'NEWFILEUID:NONE', '',
    '<OFX>',
    `<SIGNONMSGSRSV1><SONRS><STATUS><CODE>0<SEVERITY>INFO</STATUS><DTSERVER>${servidor}<LANGUAGE>POR</SONRS></SIGNONMSGSRSV1>`,
    '<BANKMSGSRSV1><STMTTRNRS><TRNUID>1<STATUS><CODE>0<SEVERITY>INFO</STATUS>',
    '<STMTRS><CURDEF>BRL',
    `<BANKACCTFROM><BANKID>0000<ACCTID>${escOfx(conta ? conta.id.replace(/-/g, '') : 'MEUDINDIN')}<ACCTTYPE>CHECKING</BANKACCTFROM>`,
    `<BANKTRANLIST><DTSTART>${dataOfx(de)}<DTEND>${dataOfx(ate)}`,
    ...corpo,
    '</BANKTRANLIST>',
    `<LEDGERBAL><BALAMT>${saldo}<DTASOF>${dataOfx(ate)}</LEDGERBAL>`,
    '</STMTRS></STMTTRNRS></BANKMSGSRSV1>',
    '</OFX>', '',
  ].join('\r\n')
}

/** PDF com resumo do período, totais por categoria e a lista completa. */
export async function gerarPdf(ts: Transacao[], contas: Conta[], opcoes: { de: string; ate: string; titulo: string; nome: string }): Promise<Blob> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const nomeConta = new Map(contas.map((c) => [c.id, c.nome]))
  const entradas = ts.filter((t) => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0)
  const saidas = ts.filter((t) => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0)
  const largura = doc.internal.pageSize.getWidth()

  doc.setFillColor(245, 180, 0)
  doc.rect(0, 0, largura, 6, 'F')
  doc.setFont('times', 'bold').setFontSize(22).setTextColor(31, 29, 26)
  doc.text('dindin', 40, 48)
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(107, 100, 88)
  doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, largura - 40, 48, { align: 'right' })
  doc.setFont('helvetica', 'bold').setFontSize(15).setTextColor(31, 29, 26)
  doc.text(opcoes.titulo, 40, 80)
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(107, 100, 88)
  doc.text(`${opcoes.nome} · ${dataBR(opcoes.de)} a ${dataBR(opcoes.ate)} · ${ts.length} movimentações`, 40, 96)

  const caixas: [string, string][] = [['Entradas', dinheiro(entradas)], ['Saídas', dinheiro(saidas)], ['Resultado', dinheiro(entradas - saidas)]]
  caixas.forEach(([rotulo, valor], i) => {
    const x = 40 + i * 175
    doc.setDrawColor(246, 215, 126).setLineWidth(1).roundedRect(x, 112, 165, 50, 8, 8)
    doc.setFontSize(9).setTextColor(107, 100, 88).text(rotulo, x + 12, 130)
    doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(31, 29, 26).text(valor, x + 12, 150)
    doc.setFont('helvetica', 'normal')
  })

  const porCat = new Map<string, number>()
  for (const t of ts) if (t.tipo === 'despesa') porCat.set(t.categoria, (porCat.get(t.categoria) ?? 0) + t.valor)
  const cats = [...porCat.entries()].sort((a, b) => b[1] - a[1])
  autoTable(doc, {
    startY: 180,
    head: [['Saídas por categoria', 'Valor', '%']],
    body: cats.map(([c, v]) => [c, dinheiro(v), `${saidas ? Math.round((v / saidas) * 100) : 0}%`]),
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 4, textColor: [31, 29, 26] },
    headStyles: { fontStyle: 'bold', fillColor: [244, 235, 218] },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right', cellWidth: 50 } },
    didParseCell: (d) => { if (d.section === 'head' && d.column.index > 0) d.cell.styles.halign = 'right' },
    margin: { left: 40, right: 40 },
  })

  autoTable(doc, {
    head: [['Data', 'Descrição', 'Categoria', 'Conta', 'Valor']],
    body: ordenar(ts).map((t) => [
      dataBR(t.data), t.descricao || t.categoria, t.categoria, (t.conta_id && nomeConta.get(t.conta_id)) || '—',
      `${t.tipo === 'despesa' ? '- ' : '+ '}${dinheiro(t.valor)}`,
    ]),
    theme: 'striped',
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 4, textColor: [31, 29, 26] },
    headStyles: { fillColor: [36, 64, 142], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [255, 248, 236] },
    columnStyles: { 0: { cellWidth: 58 }, 4: { halign: 'right', cellWidth: 80 } },
    didParseCell: (d) => {
      if (d.section === 'head' && d.column.index === 4) d.cell.styles.halign = 'right'
      if (d.section === 'body' && d.column.index === 4 && String(d.cell.raw).startsWith('+')) d.cell.styles.textColor = [59, 138, 62]
    },
    margin: { left: 40, right: 40 },
  })

  const paginas = doc.getNumberOfPages()
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p)
    doc.setFontSize(8).setTextColor(150, 140, 125)
    doc.text(`Meu DinDin · página ${p} de ${paginas}`, largura / 2, doc.internal.pageSize.getHeight() - 20, { align: 'center' })
  }
  return doc.output('blob')
}

export function baixar(conteudo: Blob | string, nome: string, tipo: string) {
  const blob = typeof conteudo === 'string' ? new Blob([conteudo], { type: tipo }) : conteudo
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
