import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Plus, RefreshCw, Unlink, Wallet } from 'lucide-react'
import { api } from '../lib/api'
import { somar } from '../lib/analise'
import { dinheiro, intervaloMes } from '../lib/format'
import { useDados, useMes } from '../lib/hooks'
import type { Conexao, Conta, TipoConta } from '../lib/types'
import { ConectarBanco } from '../components/ConectarBanco'
import { ListaTransacoes } from '../components/Transacoes'
import { Campo, Carregando, Modal, SeletorMes, useToast, Vazio } from '../components/ui'
import { Moedas } from '../components/Illustracoes'
import { ExportarExtrato } from '../components/ExportarExtrato'
import { validarConta } from '../lib/regras'

const NOME_TIPO: Record<TipoConta, string> = { corrente: 'Conta corrente', poupanca: 'Poupança', cartao: 'Cartão de crédito', outro: 'Outra' }

const quando = (s: string | null) => {
  if (!s) return 'nunca'
  const min = Math.round((Date.now() - new Date(s).getTime()) / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  if (min < 1440) return `há ${Math.round(min / 60)} h`
  return new Date(s).toLocaleDateString('pt-BR')
}

function LinhaConta({ c }: { c: Conta }) {
  return (
    <Link to={`/contas/${c.id}`} className="conta-pilula">
      <span className="conta-nome">{c.nome}<small>{[c.nome !== NOME_TIPO[c.tipo] && NOME_TIPO[c.tipo], c.numero].filter(Boolean).join(' · ')}</small></span>
      <span className="conta-saldo">
        {c.tipo === 'cartao' ? <small>fatura</small> : null}
        {dinheiro(c.saldo)}
      </span>
    </Link>
  )
}

export function Contas() {
  const avisar = useToast()
  const [nova, setNova] = useState(false)
  const [sincronizando, setSincronizando] = useState<string | null>(null)
  const { dados, recarregar } = useDados(async () => {
    const [conexoes, contas] = await Promise.all([api.conexoes(), api.contas()])
    return { conexoes, contas }
  })
  if (!dados) return <Carregando />
  const manuais = dados.contas.filter((c) => c.origem === 'manual')

  async function atualizar(cx: Conexao) {
    setSincronizando(cx.id)
    const fechar = avisar('Atualizando informações das contas…', 'carregando')
    try {
      await api.ofSincronizar(cx.external_item_id)
      fechar(); avisar(`${cx.instituicao} atualizado.`)
      recarregar()
    } catch (e) {
      fechar(); avisar(e instanceof Error ? e.message : 'Falha ao atualizar.', 'erro')
    } finally { setSincronizando(null) }
  }

  async function desconectar(cx: Conexao) {
    if (!confirm(`Desconectar ${cx.instituicao}? As contas e transações importadas desse banco serão removidas do app.`)) return
    await api.ofDesconectar(cx.external_item_id)
    avisar(`${cx.instituicao} desconectado.`)
    recarregar()
  }

  return (
    <div className="pagina pagina-estreita">
      <header className="pagina-topo">
        <h1 className="titulo-pagina">Contas</h1>
        <ConectarBanco onConcluido={recarregar} />
      </header>

      {!dados.contas.length && (
        <Vazio ilustracao={<Moedas />} titulo="Nenhuma conta ainda"
          texto="Conecte seu banco pelo Open Finance para ver saldos e extratos automaticamente, ou cadastre uma conta manual como a carteira." />
      )}

      {dados.conexoes.map((cx) => {
        const contas = dados.contas.filter((c) => c.conexao_id === cx.id)
        const erro = cx.status === 'LOGIN_ERROR' || cx.status === 'OUTDATED'
        return (
          <section key={cx.id} className="grupo-contas">
            <header className="grupo-topo">
              <span className="banco-logo" style={{ background: cx.instituicao_cor ?? 'var(--navy)' }} aria-hidden="true">
                {cx.instituicao_logo ? <img src={cx.instituicao_logo} alt="" /> : cx.instituicao[0]}
              </span>
              <div>
                <h2>{cx.instituicao}</h2>
                <small className={erro ? 'erro' : 'sutil'}>
                  {cx.status === 'UPDATING' ? 'Sincronizando…' : erro ? 'Precisa reconectar' : `Atualizado ${quando(cx.ultima_sync)}`}
                </small>
              </div>
              <div className="grupo-acoes">
                {erro ? <ConectarBanco itemId={cx.external_item_id} rotulo="Reconectar" variante="secundario" onConcluido={recarregar} /> : (
                  <button className="icone-btn" onClick={() => atualizar(cx)} disabled={sincronizando === cx.id} aria-label={`Atualizar ${cx.instituicao}`}>
                    <RefreshCw size={18} className={sincronizando === cx.id ? 'girando' : ''} />
                  </button>
                )}
                <button className="icone-btn" onClick={() => desconectar(cx)} aria-label={`Desconectar ${cx.instituicao}`}><Unlink size={18} /></button>
              </div>
            </header>
            {contas.map((c) => <LinhaConta key={c.id} c={c} />)}
            {!contas.length && <p className="sutil">Aguardando os dados do banco…</p>}
          </section>
        )
      })}

      <section className="grupo-contas">
        <header className="grupo-topo">
          <span className="banco-logo manual" aria-hidden="true"><Wallet size={18} /></span>
          <div><h2>Contas manuais</h2><small className="sutil">Dinheiro vivo, vale-refeição, contas fora do Open Finance</small></div>
          <div className="grupo-acoes">
            <button className="icone-btn" onClick={() => setNova(true)} aria-label="Adicionar conta manual"><Plus size={20} /></button>
          </div>
        </header>
        {manuais.map((c) => <LinhaConta key={c.id} c={c} />)}
      </section>

      <NovaConta aberto={nova} onFechar={() => setNova(false)} onSalvo={recarregar} quantidade={manuais.length} />
    </div>
  )
}

function NovaConta({ aberto, onFechar, onSalvo, quantidade }: { aberto: boolean; onFechar: () => void; onSalvo: () => void; quantidade: number }) {
  const avisar = useToast()
  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const nova = {
      nome: String(f.get('nome')).trim(), tipo: f.get('tipo') as TipoConta,
      instituicao: String(f.get('instituicao') ?? '').trim(),
      saldo: Number(String(f.get('saldo') || '0').replace(',', '.')),
    }
    const problema = validarConta(nova, quantidade)
    if (problema) return avisar(problema, 'erro')
    try {
      await api.criarConta(nova)
      avisar('Conta criada.'); onSalvo(); onFechar()
    } catch (err) { avisar(err instanceof Error ? err.message : 'Erro ao criar conta.', 'erro') }
  }
  return (
    <Modal titulo="Nova conta manual" aberto={aberto} onFechar={onFechar} estreito>
      <form className="form" onSubmit={salvar}>
        <Campo rotulo="Nome"><input name="nome" required placeholder="Ex.: Carteira" maxLength={40} /></Campo>
        <div className="grade-2">
          <Campo rotulo="Tipo">
            <select name="tipo" defaultValue="outro">{Object.entries(NOME_TIPO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </Campo>
          <Campo rotulo="Saldo atual (R$)"><input name="saldo" inputMode="decimal" placeholder="0,00" /></Campo>
        </div>
        <Campo rotulo="Instituição (opcional)"><input name="instituicao" maxLength={40} /></Campo>
        <button className="btn btn-primario btn-largo">Criar conta</button>
      </form>
    </Modal>
  )
}

export function ContaDetalhe() {
  const { id } = useParams()
  const nav = useNavigate()
  const avisar = useToast()
  const { mes, ano, mover } = useMes()
  const { dados, recarregar } = useDados(async () => {
    const contas = await api.contas()
    const conta = contas.find((c) => c.id === id)
    const ts = conta ? await api.transacoes({ ...intervaloMes(mes, ano), contaId: id }) : []
    return { conta, ts, contas }
  }, [id, mes, ano])
  if (!dados) return <Carregando />
  if (!dados.conta) return <Vazio titulo="Conta não encontrada" texto="Ela pode ter sido removida." acao={<Link to="/contas" className="btn btn-secundario">Voltar para Contas</Link>} />
  const { conta, ts } = dados

  async function excluir() {
    if (!confirm(`Excluir a conta ${conta!.nome}? As transações continuam no extrato, sem conta associada.`)) return
    await api.excluirConta(conta!.id)
    avisar('Conta excluída.'); nav('/contas')
  }

  return (
    <div className="pagina pagina-estreita">
      <div className="conta-detalhe">
        <Link to="/contas" className="voltar" aria-label="Voltar para Contas"><ChevronLeft size={24} /></Link>
        <h1>{conta.nome}</h1>
        <strong className="conta-detalhe-saldo">{dinheiro(conta.saldo)}</strong>
        {conta.limite_credito ? <p className="sutil">Limite de {dinheiro(conta.limite_credito)} · disponível {dinheiro(conta.limite_credito - conta.saldo)}</p> : null}
        <div className="topo-direita">
          <SeletorMes mes={mes} ano={ano} mover={mover} />
          <ExportarExtrato contas={dados.contas} mes={mes} ano={ano} contaId={conta.id} />
        </div>
        <div className="resumo-linha">
          <span>Entradas <b className="receita">{dinheiro(somar(ts, 'receita'))}</b></span>
          <span>Saídas <b>{dinheiro(somar(ts, 'despesa'))}</b></span>
        </div>
        {ts.length ? <ListaTransacoes itens={ts} mostrarConta={false} onExcluir={async (t) => { await api.excluirTransacao(t.id); recarregar() }} />
          : <p className="sutil centro">Sem movimentações neste mês.</p>}
        {conta.origem === 'manual' && <button className="link-simples perigo" onClick={excluir}>Excluir conta</button>}
      </div>
    </div>
  )
}
