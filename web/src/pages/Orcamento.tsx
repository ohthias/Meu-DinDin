import { useEffect, useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { api } from '../lib/api'
import { porCategoria } from '../lib/analise'
import { dinheiro, intervaloMes, MESES, pct } from '../lib/format'
import { useDados, useMes } from '../lib/hooks'
import { CATEGORIAS_DESPESA, type Orcamento as Orc } from '../lib/types'
import { Cofrinho } from '../components/Illustracoes'
import { validarOrcamento } from '../lib/regras'
import { Campo, Carregando, Modal, SeletorMes, useToast } from '../components/ui'

const chaveAviso = (o: Orc) => `aviso-orc-${o.categoria}-${o.mes}-${o.ano}`
const jaAvisado = (k: string) => { try { return sessionStorage.getItem(k) === '1' } catch { return false } }
const marcarAvisado = (k: string) => { try { sessionStorage.setItem(k, '1') } catch { /* sem storage */ } }

export function Orcamento() {
  const avisar = useToast()
  const { mes, ano, mover } = useMes()
  const [editando, setEditando] = useState<{ categoria: string; limite?: number; id?: string } | null>(null)
  const [alerta, setAlerta] = useState<(Orc & { gasto: number }) | null>(null)
  const { dados, recarregar } = useDados(async () => {
    const [orcs, ts] = await Promise.all([api.orcamentos(mes, ano), api.transacoes(intervaloMes(mes, ano))])
    return { orcs, ts }
  }, [mes, ano])

  const gastos = new Map(porCategoria(dados?.ts ?? []).map((c) => [c.categoria, c.total]))
  const linhas = (dados?.orcs ?? []).map((o) => ({ ...o, gasto: gastos.get(o.categoria) ?? 0 }))

  // "Ei!" — avisa uma vez por sessão quando uma categoria passa de 90%
  useEffect(() => {
    const critico = linhas.filter((o) => o.gasto / o.limite >= 0.9 && !jaAvisado(chaveAviso(o)))
      .sort((a, b) => b.gasto / b.limite - a.gasto / a.limite)[0]
    if (critico) setAlerta(critico)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados])

  if (!dados) return <Carregando />
  const totalLimite = linhas.reduce((s, o) => s + o.limite, 0)
  const totalGasto = linhas.reduce((s, o) => s + o.gasto, 0)
  const semOrcamento = porCategoria(dados.ts).filter((c) => !dados.orcs.some((o) => o.categoria === c.categoria))

  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const limite = Number(String(f.get('limite')).replace(',', '.'))
    const orcamento = { categoria: String(f.get('categoria')), limite, mes, ano }
    const problema = validarOrcamento(orcamento)
    if (problema) return avisar(problema, 'erro')
    try {
      await api.salvarOrcamento(orcamento)
      avisar('Orçamento salvo.'); setEditando(null); recarregar()
    } catch (err) { avisar(err instanceof Error ? err.message : 'Não foi possível salvar.', 'erro') }
  }
  async function remover() {
    if (!editando?.id) return
    await api.excluirOrcamento(editando.id)
    setEditando(null); recarregar()
  }

  return (
    <div className="pagina pagina-estreita">
      <header className="pagina-topo">
        <h1 className="titulo-pagina">Orçamento</h1>
        <SeletorMes mes={mes} ano={ano} mover={mover} />
      </header>

      <section className="orc-cofre">
        <Cofrinho nivel={totalLimite ? totalGasto / totalLimite : 0} tamanho={210} />
        <p className="orc-total"><strong>{dinheiro(totalGasto)}</strong> <span>/ {dinheiro(totalLimite)}</span></p>
        <p className="sutil">{totalLimite ? `${pct(totalGasto, totalLimite)}% do orçamento de ${MESES[mes - 1]}` : 'Defina limites por categoria para encher o cofrinho.'}</p>
      </section>

      <section className="orc-barras" aria-label="Orçamento por categoria">
        {linhas.map((o) => {
          const p = o.gasto / o.limite
          return (
            <button key={o.id} className={`orc-coluna ${p >= 0.9 ? 'quente' : ''} ${p > 1 ? 'estourou' : ''} ${p === 0 ? 'zerado' : ''}`}
              onClick={() => setEditando({ categoria: o.categoria, limite: o.limite, id: o.id })}
              aria-label={`${o.categoria}: ${dinheiro(o.gasto)} de ${dinheiro(o.limite)}, ${Math.round(p * 100)}%. Editar limite.`}>
              <span className="orc-tubo">
                <span className="orc-limite">{dinheiro(o.limite).replace(',00', '')}</span>
                <span className="orc-cheio" style={{ height: `${Math.min(100, p * 100)}%` }}>
                  <b>{Math.round(p * 100)}%</b>
                </span>
              </span>
              <span className="orc-nome">{o.categoria}</span>
            </button>
          )
        })}
        <button className="orc-coluna orc-nova" onClick={() => setEditando({ categoria: semOrcamento[0]?.categoria ?? CATEGORIAS_DESPESA.find((c) => !dados.orcs.some((o) => o.categoria === c)) ?? 'Outro' })}>
          <span className="orc-tubo"><Plus size={24} aria-hidden="true" /></span>
          <span className="orc-nome">Nova</span>
        </button>
      </section>

      {semOrcamento.length > 0 && (
        <p className="sutil centro">Sem limite definido: {semOrcamento.map((c) => `${c.categoria} (${dinheiro(c.total)})`).join(', ')}.</p>
      )}

      <Modal titulo={editando?.id ? `Limite de ${editando.categoria}` : 'Novo limite'} aberto={!!editando} onFechar={() => setEditando(null)} estreito>
        {editando && (
          <form className="form" onSubmit={salvar}>
            <Campo rotulo="Categoria">
              <select name="categoria" defaultValue={editando.categoria} disabled={!!editando.id}>
                {CATEGORIAS_DESPESA.map((c) => <option key={c}>{c}</option>)}
              </select>
              {editando.id && <input type="hidden" name="categoria" value={editando.categoria} />}
            </Campo>
            <Campo rotulo={`Limite para ${MESES[mes - 1]} (R$)`}>
              <input name="limite" inputMode="decimal" defaultValue={editando.limite ?? ''} required autoFocus />
            </Campo>
            <button className="btn btn-primario btn-largo">Salvar limite</button>
            {editando.id && <button type="button" className="link-simples perigo" onClick={remover}>Remover limite</button>}
          </form>
        )}
      </Modal>

      <Modal titulo="Ei!" aberto={!!alerta} onFechar={() => { if (alerta) marcarAvisado(chaveAviso(alerta)); setAlerta(null) }} estreito>
        {alerta && (
          <div className="alerta-orc">
            <p>Você já usou <strong>{pct(alerta.gasto, alerta.limite)}%</strong> do orçamento de <strong>{alerta.categoria}</strong> em {MESES[alerta.mes - 1]}.</p>
            <p className="sutil">{alerta.gasto > alerta.limite ? `Passou ${dinheiro(alerta.gasto - alerta.limite)} do limite.` : `Restam ${dinheiro(alerta.limite - alerta.gasto)}.`}</p>
            <button className="btn btn-primario btn-largo" onClick={() => { marcarAvisado(chaveAviso(alerta)); setAlerta(null) }}>Entendi</button>
          </div>
        )}
      </Modal>
    </div>
  )
}
