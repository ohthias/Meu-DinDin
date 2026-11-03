import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Wand2 } from 'lucide-react'
import { Categorizador, carregarMotor } from '../lib/ml'
import { REGRAS, validarTransacao } from '../lib/regras'
import { Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { dataCurta, dinheiro, hojeIso } from '../lib/format'
import { CATEGORIAS_DESPESA, CATEGORIAS_RECEITA, FORMAS_PAGAMENTO, type Conta, type TipoTransacao, type Transacao } from '../lib/types'
import { Campo, Modal, useToast } from './ui'
import { useSessao } from './Sessao'

/** Lista no estilo extrato: data · descrição · valor (receitas em verde). */
export function ListaTransacoes({ itens, contas, onExcluir, mostrarConta = true }: {
  itens: Transacao[]; contas?: Conta[]; onExcluir?: (t: Transacao) => void; mostrarConta?: boolean
}) {
  const nomeConta = (id: string | null) => contas?.find((c) => c.id === id)?.nome
  return (
    <ul className={`extrato ${onExcluir ? 'com-acoes' : ''}`}>
      {itens.map((t) => (
        <li key={t.id}>
          <span className="extrato-data">{dataCurta(t.data)}</span>
          <span className="extrato-desc">
            <span className={t.tipo === 'receita' ? 'receita' : ''}>{t.descricao || t.categoria}</span>
            <small>{t.categoria}{mostrarConta && nomeConta(t.conta_id) ? ` · ${nomeConta(t.conta_id)}` : ''}{t.origem === 'open_finance' ? ' · Open Finance' : ''}</small>
          </span>
          <span className={`extrato-valor ${t.tipo === 'receita' ? 'receita' : ''}`}>
            {t.tipo === 'receita' ? '+ ' : '- '}{dinheiro(t.valor)}
          </span>
          {onExcluir && t.origem === 'manual' ? (
            <button className="icone-btn excluir" onClick={() => onExcluir(t)} aria-label={`Excluir ${t.descricao || t.categoria}`}><Trash2 size={16} /></button>
          ) : onExcluir ? <span className="excluir" aria-hidden="true" /> : null}
        </li>
      ))}
    </ul>
  )
}

export function NovaTransacao({ aberto, onFechar, onSalvo, contas, tipoInicial = 'despesa' }: {
  aberto: boolean; onFechar: () => void; onSalvo: () => void; contas: Conta[]; tipoInicial?: TipoTransacao
}) {
  const avisar = useToast()
  const { recarregarPerfil } = useSessao()
  const [tipo, setTipo] = useState<TipoTransacao>(tipoInicial)
  const [valor, setValor] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState<string>(CATEGORIAS_DESPESA[0])
  const [escolhaManual, setEscolhaManual] = useState(false)
  const modelo = useRef<Categorizador | null>(null)
  const manuais = contas.filter((c) => c.origem === 'manual')
  const cats = tipo === 'despesa' ? CATEGORIAS_DESPESA : CATEGORIAS_RECEITA

  // Treina o categorizador (WebAssembly) com o histórico quando o diálogo abre
  useEffect(() => {
    if (!aberto || modelo.current) return
    let vivo = true
    ;(async () => {
      const desde = new Date(); desde.setMonth(desde.getMonth() - 6)
      const [motor, historico] = await Promise.all([carregarMotor(), api.transacoes({ de: desde.toISOString().slice(0, 10) })])
      if (!vivo) return
      const c = new Categorizador(motor); c.treinar(historico); modelo.current = c
    })().catch(() => { /* sem sugestão, sem problema */ })
    return () => { vivo = false }
  }, [aberto])
  const sugestao = tipo === 'despesa' && descricao.length >= 3 ? modelo.current?.sugerir(descricao) ?? null : null
  useEffect(() => {
    if (sugestao && !escolhaManual) setCategoria(sugestao.categoria)
  }, [sugestao?.categoria, escolhaManual]) // eslint-disable-line react-hooks/exhaustive-deps

  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const v = Number(valor.replace(/\./g, '').replace(',', '.'))
    const nova = {
      tipo, valor: v,
      categoria: String(f.get('categoria')),
      descricao: descricao.trim(),
      forma_pagamento: String(f.get('forma') ?? ''),
      data: String(f.get('data')),
      conta_id: (f.get('conta') as string) || null,
    }
    const problema = validarTransacao(nova)
    if (problema) return setErro(problema)
    setSalvando(true)
    try {
      await api.criarTransacao(nova)
      avisar(`${tipo === 'despesa' ? 'Despesa' : 'Receita'} registrada. +10 XP`)
      setValor(''); setErro(null); setDescricao(''); setEscolhaManual(false)
      recarregarPerfil()
      onSalvo(); onFechar()
    } catch (err) {
      avisar(err instanceof Error ? err.message : 'Não foi possível salvar.', 'erro')
    } finally { setSalvando(false) }
  }

  return (
    <Modal titulo="Nova transação" aberto={aberto} onFechar={onFechar}>
      <form onSubmit={salvar} className="form">
        <div className="segmentado" role="radiogroup" aria-label="Tipo">
          {(['despesa', 'receita'] as const).map((t) => (
            <button type="button" key={t} role="radio" aria-checked={tipo === t} className={tipo === t ? 'ativo' : ''} onClick={() => setTipo(t)}>
              {t === 'despesa' ? 'Despesa' : 'Receita'}
            </button>
          ))}
        </div>
        <Campo rotulo="Valor (R$)">
          <input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="0,00" autoFocus required />
        </Campo>
        <Campo rotulo="Descrição">
          <input name="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder={tipo === 'despesa' ? 'Ex.: almoço no bandejão' : 'Ex.: bolsa do estágio'} maxLength={REGRAS.tamanhoDescricao} />
        </Campo>
        <div className="grade-2">
          <Campo rotulo="Categoria">
            <select name="categoria" value={tipo === 'despesa' ? categoria : undefined} defaultValue={tipo === 'receita' ? cats[0] : undefined} key={tipo}
              onChange={(e) => { setCategoria(e.target.value); setEscolhaManual(true) }}>
              {cats.map((c) => <option key={c}>{c}</option>)}
            </select>
            {sugestao && !escolhaManual && <span className="sugestao"><Wand2 size={13} aria-hidden="true" /> sugerida pelo seu histórico</span>}
          </Campo>
          <Campo rotulo="Data"><input name="data" type="date" defaultValue={hojeIso()} max={hojeIso()} min={`${new Date().getFullYear() - REGRAS.anosRetroativos}-01-01`} required /></Campo>
          <Campo rotulo="Forma de pagamento">
            <select name="forma">{FORMAS_PAGAMENTO.map((c) => <option key={c}>{c}</option>)}</select>
          </Campo>
          <Campo rotulo="Conta">
            <select name="conta" defaultValue="">
              <option value="">Sem conta</option>
              {manuais.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Campo>
        </div>
        <p className="sutil">Transações de bancos conectados via Open Finance entram sozinhas.</p>
        {erro && <p className="campo-msg erro" role="alert">{erro}</p>}
        <button className="btn btn-primario btn-largo" disabled={salvando}>{salvando ? 'Salvando…' : `Registrar ${tipo}`}</button>
      </form>
    </Modal>
  )
}
