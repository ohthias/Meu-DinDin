import { useState, type FormEvent } from 'react'
import { Download } from 'lucide-react'
import { api } from '../lib/api'
import { baixar, gerarCsv, gerarOfx, gerarPdf, type FormatoExtrato } from '../lib/exportar'
import { hojeIso, intervaloMes, iso, MESES } from '../lib/format'
import type { Conta } from '../lib/types'
import { Campo, Modal, useToast } from './ui'

type Periodo = 'mes' | '3meses' | 'ano' | 'personalizado'

const FORMATOS: { id: FormatoExtrato; nome: string; texto: string }[] = [
  { id: 'pdf', nome: 'PDF', texto: 'Relatório para ler, imprimir ou enviar, com resumo por categoria.' },
  { id: 'csv', nome: 'Planilha (CSV)', texto: 'Abre no Excel, Google Planilhas e Numbers.' },
  { id: 'ofx', nome: 'OFX', texto: 'Para importar em outros gerenciadores financeiros.' },
]

/** Botão + diálogo de exportação. `mes`/`ano` definem o período padrão; `contaId` pré-seleciona uma conta. */
export function ExportarExtrato({ contas, mes, ano, contaId }: { contas: Conta[]; mes: number; ano: number; contaId?: string }) {
  const avisar = useToast()
  const [aberto, setAberto] = useState(false)
  const [formato, setFormato] = useState<FormatoExtrato>('pdf')
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [gerando, setGerando] = useState(false)
  const h = new Date()

  function intervalo(f: FormData): { de: string; ate: string; rotulo: string } {
    switch (periodo) {
      case 'mes': return { ...intervaloMes(mes, ano), rotulo: `${MESES[mes - 1]} de ${ano}` }
      case '3meses': return { de: iso(new Date(h.getFullYear(), h.getMonth() - 2, 1)), ate: hojeIso(), rotulo: 'últimos 3 meses' }
      case 'ano': return { de: `${h.getFullYear()}-01-01`, ate: hojeIso(), rotulo: `${h.getFullYear()} até hoje` }
      case 'personalizado': return { de: String(f.get('de')), ate: String(f.get('ate')), rotulo: 'período personalizado' }
    }
  }

  async function exportar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const { de, ate, rotulo } = intervalo(f)
    if (!de || !ate || ate < de) return avisar('Escolha uma data final depois da inicial.', 'erro')
    const conta = contas.find((c) => c.id === f.get('conta')) ?? undefined
    setGerando(true)
    try {
      const ts = await api.transacoes({ de, ate, contaId: conta?.id })
      if (!ts.length) { avisar('Não há movimentações nesse período.', 'erro'); return }
      const base = `extrato-${conta ? conta.nome.toLowerCase().replace(/\s+/g, '-') + '-' : ''}${de}-a-${ate}`
      if (formato === 'csv') baixar(gerarCsv(ts, contas), `${base}.csv`, 'text/csv;charset=utf-8')
      if (formato === 'ofx') baixar(gerarOfx(ts, de, ate, conta), `${base}.ofx`, 'application/x-ofx')
      if (formato === 'pdf') baixar(await gerarPdf(ts, contas, { de, ate, titulo: `Extrato · ${rotulo}`, nome: conta?.nome ?? 'Todas as contas' }), `${base}.pdf`, 'application/pdf')
      avisar(`Extrato exportado: ${ts.length} movimentações.`)
      setAberto(false)
    } catch (err) {
      avisar(err instanceof Error ? err.message : 'Não foi possível exportar.', 'erro')
    } finally { setGerando(false) }
  }

  return (
    <>
      <button className="btn btn-secundario" onClick={() => setAberto(true)}><Download size={17} aria-hidden="true" /> Exportar</button>
      <Modal titulo="Exportar extrato" aberto={aberto} onFechar={() => setAberto(false)}>
        <form className="form" onSubmit={exportar}>
          <fieldset className="opcoes-formato">
            <legend>Formato</legend>
            {FORMATOS.map((x) => (
              <label key={x.id} className={formato === x.id ? 'ativo' : ''}>
                <input type="radio" name="formato" value={x.id} checked={formato === x.id} onChange={() => setFormato(x.id)} />
                <strong>{x.nome}</strong><span>{x.texto}</span>
              </label>
            ))}
          </fieldset>
          <div className="grade-2">
            <Campo rotulo="Período">
              <select value={periodo} onChange={(e) => setPeriodo(e.target.value as Periodo)}>
                <option value="mes">{MESES[mes - 1]} de {ano}</option>
                <option value="3meses">Últimos 3 meses</option>
                <option value="ano">{h.getFullYear()} até hoje</option>
                <option value="personalizado">Escolher datas</option>
              </select>
            </Campo>
            <Campo rotulo="Conta">
              <select name="conta" defaultValue={contaId ?? ''}>
                <option value="">Todas as contas</option>
                {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </Campo>
            {periodo === 'personalizado' && <>
              <Campo rotulo="De"><input name="de" type="date" max={hojeIso()} required /></Campo>
              <Campo rotulo="Até"><input name="ate" type="date" max={hojeIso()} defaultValue={hojeIso()} required /></Campo>
            </>}
          </div>
          <button className="btn btn-primario btn-largo" disabled={gerando}>{gerando ? 'Gerando…' : `Baixar ${FORMATOS.find((x) => x.id === formato)!.nome}`}</button>
        </form>
      </Modal>
    </>
  )
}
