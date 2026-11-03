import { useState, type FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { dataLonga, dinheiro, hojeIso, pct } from '../lib/format'
import { useDados } from '../lib/hooks'
import type { Meta } from '../lib/types'
import { Barra, Campo, Carregando, Modal, useToast, Vazio } from '../components/ui'
import { useSessao } from '../components/Sessao'
import { Cofrinho } from '../components/Illustracoes'
import { validarDeposito, validarMeta } from '../lib/regras'

const CORES = ['#F5B400', '#24408E', '#3B8A3E', '#E38B5B']

function mesesAte(prazo: string | null) {
  if (!prazo) return null
  const [a, m] = prazo.split('-').map(Number)
  const h = new Date()
  return Math.max(1, (a - h.getFullYear()) * 12 + (m - 1 - h.getMonth()))
}

export function Metas() {
  const avisar = useToast()
  const { recarregarPerfil } = useSessao()
  const [nova, setNova] = useState(false)
  const [deposito, setDeposito] = useState<Meta | null>(null)
  const { dados, recarregar } = useDados(() => api.metas())
  if (!dados) return <Carregando />

  async function criar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const meta = {
      nome: String(f.get('nome')).trim(),
      valor_total: Number(String(f.get('valor')).replace(/\./g, '').replace(',', '.')),
      prazo: String(f.get('prazo')) || null,
      cor: String(f.get('cor')),
    }
    const problema = validarMeta(meta, dados!.filter((m) => m.valor_atual < m.valor_total).length)
    if (problema) return avisar(problema, 'erro')
    try {
      await api.criarMeta(meta)
      avisar('Meta criada. +25 XP'); setNova(false); recarregar(); recarregarPerfil()
    } catch (err) { avisar(err instanceof Error ? err.message : 'Não foi possível criar a meta.', 'erro') }
  }
  async function depositar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const v = Number(String(new FormData(e.currentTarget).get('valor')).replace(',', '.'))
    if (!deposito) return
    const problema = validarDeposito(v)
    if (problema) return avisar(problema, 'erro')
    try {
      await api.depositarMeta(deposito.id, v)
      avisar(`${dinheiro(v)} guardados em ${deposito.nome}.`); setDeposito(null); recarregar()
    } catch (err) { avisar(err instanceof Error ? err.message : 'Não foi possível guardar.', 'erro') }
  }

  return (
    <div className="pagina pagina-estreita">
      <header className="pagina-topo">
        <h1 className="titulo-pagina">Metas</h1>
        <button className="btn btn-primario" onClick={() => setNova(true)}><Plus size={18} aria-hidden="true" /> Nova meta</button>
      </header>

      {!dados.length ? (
        <Vazio ilustracao={<Cofrinho nivel={0.15} tamanho={150} />} titulo="Para que você está juntando?"
          texto="Uma viagem, a reserva de emergência, um notebook. Crie a meta e acompanhe cada depósito." />
      ) : (
        <ul className="metas">
          {dados.map((m) => {
            const falta = m.valor_total - m.valor_atual
            const meses = mesesAte(m.prazo)
            return (
              <li key={m.id} className="meta" style={{ ['--cor-meta' as string]: m.cor }}>
                <div className="meta-topo">
                  <h2>{m.nome}</h2>
                  <button className="icone-btn" aria-label={`Excluir meta ${m.nome}`} onClick={async () => {
                    if (confirm(`Excluir a meta ${m.nome}?`)) { await api.excluirMeta(m.id); recarregar() }
                  }}><Trash2 size={16} /></button>
                </div>
                <p className="meta-valor"><strong>{dinheiro(m.valor_atual)}</strong> de {dinheiro(m.valor_total)} · {pct(m.valor_atual, m.valor_total)}%</p>
                <Barra valor={m.valor_atual} total={m.valor_total} cor={m.cor} />
                <p className="sutil">
                  {falta <= 0 ? 'Meta alcançada.' : meses ? `Guarde ${dinheiro(falta / meses)} por mês para chegar até ${dataLonga(m.prazo!)}.` : `Faltam ${dinheiro(falta)}.`}
                </p>
                {falta > 0 && <button className="btn btn-secundario" onClick={() => setDeposito(m)}>Guardar dinheiro</button>}
              </li>
            )
          })}
        </ul>
      )}

      <Modal titulo="Nova meta" aberto={nova} onFechar={() => setNova(false)} estreito>
        <form className="form" onSubmit={criar}>
          <Campo rotulo="Nome"><input name="nome" required placeholder="Ex.: Reserva de emergência" maxLength={50} /></Campo>
          <div className="grade-2">
            <Campo rotulo="Valor da meta (R$)"><input name="valor" inputMode="decimal" required /></Campo>
            <Campo rotulo="Prazo"><input name="prazo" type="date" min={hojeIso()} /></Campo>
          </div>
          <fieldset className="cores">
            <legend>Cor</legend>
            {CORES.map((c, i) => (
              <label key={c}><input type="radio" name="cor" value={c} defaultChecked={i === 0} /><span style={{ background: c }} aria-label={c} /></label>
            ))}
          </fieldset>
          <button className="btn btn-primario btn-largo">Criar meta</button>
        </form>
      </Modal>

      <Modal titulo={`Guardar em ${deposito?.nome ?? ''}`} aberto={!!deposito} onFechar={() => setDeposito(null)} estreito>
        <form className="form" onSubmit={depositar}>
          <Campo rotulo="Valor (R$)" dica={deposito ? `Faltam ${dinheiro(deposito.valor_total - deposito.valor_atual)}.` : undefined}>
            <input name="valor" inputMode="decimal" required autoFocus />
          </Campo>
          <button className="btn btn-primario btn-largo">Guardar</button>
        </form>
      </Modal>
    </div>
  )
}
