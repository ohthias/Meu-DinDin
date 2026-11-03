import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowDownLeft, ArrowUpRight, Plus } from 'lucide-react'
import { api } from '../lib/api'
import { dicas, evolucao, porCategoria, somar } from '../lib/analise'
import { dinheiro, intervaloMes, iso, MESES, pct } from '../lib/format'
import { useDados } from '../lib/hooks'
import { MODULOS } from '../lib/educacao'
import { useSessao } from '../components/Sessao'
import { ConectarBanco } from '../components/ConectarBanco'
import { ListaTransacoes, NovaTransacao } from '../components/Transacoes'
import { Barra, Carregando } from '../components/ui'

const CORES_CAT = ['#24408E', '#F5B400', '#E38B5B', '#6E8BD6', '#C9A227', '#9AA6C4', '#D9C7A3']

export function Inicio() {
  const { perfil } = useSessao()
  const h = new Date(), mes = h.getMonth() + 1, ano = h.getFullYear()
  const [nova, setNova] = useState<null | 'despesa' | 'receita'>(null)

  const { dados, recarregar } = useDados(async () => {
    const inicio = iso(new Date(ano, mes - 6, 1))
    const [contas, ts, metas, orc, modulos] = await Promise.all([
      api.contas(), api.transacoes({ de: inicio }), api.metas(), api.orcamentos(mes, ano), api.progressoModulos(),
    ])
    return { contas, ts, metas, orc, modulos }
  })
  if (!dados) return <Carregando />

  const { de } = intervaloMes(mes, ano)
  const doMes = dados.ts.filter((t) => t.data >= de)
  const receitas = somar(doMes, 'receita'), despesas = somar(doMes, 'despesa')
  const contasSaldo = dados.contas.filter((c) => c.tipo !== 'cartao')
  const fatura = dados.contas.filter((c) => c.tipo === 'cartao').reduce((s, c) => s + c.saldo, 0)
  const saldoTotal = contasSaldo.length ? contasSaldo.reduce((s, c) => s + c.saldo, 0) : receitas - despesas
  const cats = porCategoria(doMes)
  const totalCats = cats.reduce((s, c) => s + c.total, 0)
  const gastoPorCat = new Map(cats.map((c) => [c.categoria, c.total]))
  const estourando = dados.orc
    .map((o) => ({ ...o, gasto: gastoPorCat.get(o.categoria) ?? 0 }))
    .filter((o) => o.gasto / o.limite >= 0.9)
  const semBanco = !dados.contas.some((c) => c.origem === 'open_finance')
  const feitos = new Set(dados.modulos.filter((p) => p.concluido_em).map((p) => p.modulo_id))
  const proximoModulo = MODULOS.find((m) => !feitos.has(m.id))

  return (
    <div className="pagina">
      <div className="inicio-grade">
        <section className="col">
          <h1 className="titulo-pagina">Olá,<br />{perfil?.nome?.split(' ')[0] ?? 'você'}.</h1>
          <div className="cartao-saldo">
            <span>Saldo total</span>
            <strong>{dinheiro(saldoTotal)}</strong>
            <small>{contasSaldo.length ? `em ${contasSaldo.length} ${contasSaldo.length === 1 ? 'conta' : 'contas'}` : `resultado de ${MESES[mes - 1]}`}{fatura ? ` · fatura ${dinheiro(fatura)}` : ''}</small>
          </div>
          <div className="grade-2">
            <div className="caixa">
              <span className="caixa-rotulo"><ArrowDownLeft size={16} aria-hidden="true" /> Entradas</span>
              <strong className="receita">{dinheiro(receitas)}</strong>
            </div>
            <div className="caixa">
              <span className="caixa-rotulo"><ArrowUpRight size={16} aria-hidden="true" /> Saídas</span>
              <strong>{dinheiro(despesas)}</strong>
            </div>
          </div>
          <div className="acoes-rapidas">
            <button className="btn btn-primario" onClick={() => setNova('despesa')}><Plus size={18} aria-hidden="true" /> Despesa</button>
            <button className="btn btn-secundario" onClick={() => setNova('receita')}><Plus size={18} aria-hidden="true" /> Receita</button>
          </div>
          {semBanco && (
            <div className="caixa caixa-convite">
              <p><strong>Traga seus bancos para cá.</strong> Com o Open Finance, saldos e extratos aparecem sozinhos.</p>
              <ConectarBanco variante="secundario" onConcluido={recarregar} />
            </div>
          )}
        </section>

        <section className="col">
          <div className="painel">
            <header className="painel-topo"><h2>Gastos de {MESES[mes - 1]}</h2><Link to="/orcamento">Orçamento</Link></header>
            {totalCats === 0 ? <p className="sutil">Nenhuma despesa neste mês.</p> : (
              <>
                <div className="pilha" aria-hidden="true">
                  {cats.map((c, i) => <span key={c.categoria} style={{ flexGrow: c.total, background: CORES_CAT[i % CORES_CAT.length] }} />)}
                </div>
                <ul className="legenda">
                  {cats.slice(0, 6).map((c, i) => (
                    <li key={c.categoria}>
                      <i style={{ background: CORES_CAT[i % CORES_CAT.length] }} />
                      <span>{c.categoria}</span><b>{dinheiro(c.total)}</b><small>{pct(c.total, totalCats)}%</small>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {estourando.map((o) => (
              <p key={o.id} className="alerta-linha">
                {o.gasto >= o.limite ? 'Passou' : 'Quase no limite'}: <b>{o.categoria}</b> usou {pct(o.gasto, o.limite)}% do orçamento.
              </p>
            ))}
          </div>

          <div className="painel">
            <header className="painel-topo"><h2>Metas</h2><Link to="/metas">Ver todas</Link></header>
            {!dados.metas.length ? <p className="sutil">Crie uma meta para acompanhar o que você está juntando.</p> : (
              <ul className="metas-mini">
                {dados.metas.slice(0, 3).map((m) => (
                  <li key={m.id}>
                    <div><span>{m.nome}</span><b>{pct(m.valor_atual, m.valor_total)}%</b></div>
                    <Barra valor={m.valor_atual} total={m.valor_total} cor={m.cor} />
                    <small>{dinheiro(m.valor_atual)} de {dinheiro(m.valor_total)}</small>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="painel">
            <header className="painel-topo"><h2>Dicas para você</h2></header>
            <ul className="dicas">
              {dicas(doMes, perfil).map((d) => (
                <li key={d.titulo} className={`dica-${d.tom}`}><strong>{d.titulo}</strong><p>{d.texto}</p></li>
              ))}
            </ul>
          </div>

          {proximoModulo && (
            <div className="painel">
              <header className="painel-topo"><h2>Aprenda em {proximoModulo.minutos} minutos</h2><Link to="/aprender">{feitos.size} de {MODULOS.length}</Link></header>
              <Link to={`/aprender/${proximoModulo.id}`} className="aprender-mini">
                <span className="modulo-emoji" aria-hidden="true">{proximoModulo.emoji}</span>
                <span><strong>{proximoModulo.titulo}</strong><small>+{proximoModulo.xp} XP e {proximoModulo.moedas} moedas ao concluir</small></span>
              </Link>
            </div>
          )}
        </section>

        <section className="col">
          <div className="painel">
            <header className="painel-topo"><h2>Últimos 6 meses</h2></header>
            <div className="grafico" role="img" aria-label="Entradas e saídas dos últimos seis meses">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={evolucao(dados.ts)} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--linha)" />
                  <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fill: 'var(--tinta-suave)', fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--tinta-suave)', fontSize: 12 }} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toLocaleString('pt-BR')} mil` : String(v))} width={56} />
                  <Tooltip formatter={(v) => dinheiro(Number(v))} contentStyle={{ borderRadius: 12, border: '1.5px solid var(--mostarda)', background: 'var(--papel)' }} />
                  <Area type="monotone" dataKey="receitas" name="Entradas" stroke="#3B8A3E" fill="#3B8A3E" fillOpacity={0.08} strokeWidth={2} />
                  <Area type="monotone" dataKey="despesas" name="Saídas" stroke="#24408E" fill="#24408E" fillOpacity={0.12} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="painel">
            <header className="painel-topo"><h2>Movimentações recentes</h2><Link to="/transacoes">Extrato</Link></header>
            {doMes.length ? <ListaTransacoes itens={dados.ts.slice(0, 7)} contas={dados.contas} /> : <p className="sutil">Nada registrado ainda neste mês.</p>}
          </div>
        </section>
      </div>
      <NovaTransacao key={nova ?? 'x'} aberto={!!nova} tipoInicial={nova ?? 'despesa'} onFechar={() => setNova(null)} onSalvo={recarregar} contas={dados.contas} />
    </div>
  )
}
