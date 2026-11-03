import { useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Plus, Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { analise, analiseDisponivel } from '../lib/apiAnalise'
import { dataCurta, dataLonga, dinheiro, hojeIso } from '../lib/format'
import { useDados } from '../lib/hooks'
import {
  aporteNecessario, classeDe, INDICADORES_REFERENCIA, posicao, PRODUTOS, projecao, REFERENCIA_PERFIL,
  type Classe, type Indicadores, type Posicao, type TipoProduto,
} from '../lib/investimentos'
import type { Investimento } from '../lib/types'
import { Campo, Carregando, Modal, useToast, Vazio } from '../components/ui'
import { useSessao } from '../components/Sessao'
import { Moedas } from '../components/Illustracoes'
import { validarInvestimento, validarResgate } from '../lib/regras'

const CLASSES: Classe[] = ['Pós-fixado', 'Inflação', 'Prefixado']
const COR_CLASSE: Record<Classe, string> = { 'Pós-fixado': 'var(--navy)', 'Inflação': 'var(--mostarda)', 'Prefixado': '#E38B5B' }
const pctBR = (v: number, casas = 2) => `${v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`

/** Indicadores da API (Banco Central) quando ela está configurada; senão, valores de referência. */
async function obterIndicadores(): Promise<Indicadores> {
  if (!analiseDisponivel) return INDICADORES_REFERENCIA
  try {
    const i = await analise.indicadores()
    return { selic: i.selic, cdi: i.cdi, ipca12m: i.ipca12m, dataReferencia: i.dataReferencia, fonte: i.fonte === 'banco-central' ? 'banco-central' : 'referencia' }
  } catch { return INDICADORES_REFERENCIA }
}

export function Investir() {
  const [params, setParams] = useSearchParams()
  const aba = params.get('aba') === 'simular' ? 'simular' : 'carteira'
  const { perfil } = useSessao()
  const { dados, recarregar } = useDados(async () => {
    const [ind, investimentos] = await Promise.all([obterIndicadores(), api.investimentos()])
    // Com a API de análise, a carteira vem calculada do servidor; sem ela, calculamos aqui com a mesma regra.
    let posicoes: Posicao[]
    if (analiseDisponivel) {
      try {
        const c = await analise.carteira()
        posicoes = c.posicoes.map((p) => ({ id: p.id, tipo: p.tipo, aplicado: p.aplicado, bruto: p.bruto, rendimento: p.rendimento, ir: p.impostoRenda, liquido: p.liquido, dias: p.dias, taxaAnualEfetiva: p.taxaAnualEfetiva / 100 }))
      } catch {
        posicoes = investimentos.filter((i) => !i.resgatado_em).map((i) => posicao(i, ind))
      }
    } else posicoes = investimentos.filter((i) => !i.resgatado_em).map((i) => posicao(i, ind))
    return { ind, investimentos, posicoes }
  })
  if (!dados) return <Carregando />
  const { ind } = dados

  return (
    <div className="pagina pagina-estreita">
      <header className="pagina-topo"><h1 className="titulo-pagina">Investir</h1></header>

      <section className="indicadores" aria-label="Indicadores">
        <div><span>Selic</span><strong>{pctBR(ind.selic)}</strong></div>
        <div><span>CDI</span><strong>{pctBR(ind.cdi)}</strong></div>
        <div><span>IPCA 12 meses</span><strong>{pctBR(ind.ipca12m)}</strong></div>
        <p>{ind.fonte === 'banco-central' ? `Banco Central, ${dataLonga(ind.dataReferencia)}.` : `Valores de referência de ${dataLonga(ind.dataReferencia)}. Configure a API de análise para receber os dados atualizados do Banco Central.`}</p>
      </section>

      <div className="segmentado abas" role="tablist">
        <button role="tab" aria-selected={aba === 'carteira'} className={aba === 'carteira' ? 'ativo' : ''} onClick={() => setParams({})}>Minha carteira</button>
        <button role="tab" aria-selected={aba === 'simular'} className={aba === 'simular' ? 'ativo' : ''} onClick={() => setParams({ aba: 'simular' })}>Simular objetivo</button>
      </div>

      {aba === 'carteira'
        ? <Carteira investimentos={dados.investimentos} posicoes={dados.posicoes} perfil={perfil?.perfil_investidor ?? 'Conservador'} ind={ind} recarregar={recarregar} />
        : <Simulador ind={ind} />}

      <p className="sutil">Estimativas com as taxas atuais, sem IOF, taxa de custódia ou TR. Rentabilidade passada não garante resultado futuro. O Meu DinDin não é consultoria de investimentos.</p>
    </div>
  )
}

// ── Carteira ───────────────────────────────────────────────────────────────
function Carteira({ investimentos, posicoes, perfil, ind, recarregar }: {
  investimentos: Investimento[]; posicoes: Posicao[]; perfil: string; ind: Indicadores; recarregar: () => void
}) {
  const avisar = useToast()
  const { recarregarPerfil } = useSessao()
  const [novo, setNovo] = useState(false)
  const [resgate, setResgate] = useState<{ inv: Investimento; pos: Posicao } | null>(null)
  const ativos = investimentos.filter((i) => !i.resgatado_em)
  const resgatados = investimentos.filter((i) => i.resgatado_em)
  const pos = new Map(posicoes.map((p) => [p.id, p]))
  const total = { aplicado: 0, bruto: 0, ir: 0, liquido: 0 }
  for (const p of posicoes) { total.aplicado += p.aplicado; total.bruto += p.bruto; total.ir += p.ir; total.liquido += p.liquido }
  const porClasse = CLASSES.map((c) => ({
    classe: c,
    valor: ativos.filter((i) => classeDe(i.indexador) === c).reduce((s, i) => s + (pos.get(i.id)?.liquido ?? i.valor), 0),
  }))
  const referencia = REFERENCIA_PERFIL[perfil] ?? REFERENCIA_PERFIL.Conservador
  const liquidezDiaria = ativos.filter((i) => i.liquidez_diaria).reduce((s, i) => s + (pos.get(i.id)?.liquido ?? i.valor), 0)

  return (
    <>
      <section className="carteira-totais">
        <div><span>Valor líquido hoje</span><strong>{dinheiro(total.liquido)}</strong></div>
        <div><span>Aplicado</span><b>{dinheiro(total.aplicado)}</b></div>
        <div><span>Rendimento líquido</span><b className="receita">+ {dinheiro(total.liquido - total.aplicado)}</b></div>
        <div><span>IR estimado no resgate</span><b>{dinheiro(total.ir)}</b></div>
        <div><span>Com resgate em 1 dia</span><b>{dinheiro(liquidezDiaria)}</b></div>
      </section>

      {ativos.length > 0 && (
        <section className="painel">
          <header className="painel-topo"><h2>Divisão da carteira</h2><small className="sutil">Referência do perfil {perfil}</small></header>
          <div className="alocacao" aria-hidden="true">
            {porClasse.filter((c) => c.valor > 0).map((c) => <span key={c.classe} style={{ flexGrow: c.valor, background: COR_CLASSE[c.classe] }} />)}
          </div>
          <ul className="alocacao-lista">
            {porClasse.map((c) => {
              const atual = total.liquido ? (c.valor / total.liquido) * 100 : 0
              return (
                <li key={c.classe}>
                  <i style={{ background: COR_CLASSE[c.classe] }} />
                  <span>{c.classe}</span>
                  <b>{Math.round(atual)}%</b>
                  <small>referência {referencia[c.classe]}%</small>
                </li>
              )
            })}
          </ul>
          <p className="sutil">A referência é educativa e considera só renda fixa. Antes de diversificar, garanta a reserva de emergência em produtos com resgate diário.</p>
        </section>
      )}

      <section className="painel">
        <header className="painel-topo">
          <h2>Aplicações</h2>
          <button className="btn btn-primario" onClick={() => setNovo(true)}><Plus size={17} aria-hidden="true" /> Registrar aporte</button>
        </header>
        {!ativos.length ? (
          <Vazio ilustracao={<Moedas />} titulo="Nenhuma aplicação ainda" texto="Registre o que você já investiu para acompanhar o rendimento estimado e o imposto no resgate." />
        ) : (
          <ul className="aplicacoes">
            {ativos.map((i) => {
              const p = pos.get(i.id) ?? posicao(i, ind)
              const prod = PRODUTOS[i.tipo]
              return (
                <li key={i.id}>
                  <div className="aplicacao-topo">
                    <div>
                      <strong>{prod.nome}{i.emissor ? ` · ${i.emissor}` : ''}</strong>
                      <small>{descreverTaxa(i)} · desde {dataCurta(i.data_aporte)}{i.vencimento ? ` · vence ${dataCurta(i.vencimento)}/${i.vencimento.slice(2, 4)}` : ''} · {i.liquidez_diaria ? 'resgate diário' : 'sem liquidez diária'}</small>
                    </div>
                    <strong className="aplicacao-valor">{dinheiro(p.liquido)}</strong>
                  </div>
                  <dl className="aplicacao-numeros">
                    <div><dt>Aplicado</dt><dd>{dinheiro(p.aplicado)}</dd></div>
                    <div><dt>Bruto</dt><dd>{dinheiro(p.bruto)}</dd></div>
                    <div><dt>IR ({prod.isentoIR ? 'isento' : `${p.dias} dias`})</dt><dd>{dinheiro(p.ir)}</dd></div>
                    <div><dt>Rende ao ano</dt><dd>{pctBR(p.taxaAnualEfetiva * 100)}</dd></div>
                  </dl>
                  <div className="aplicacao-acoes">
                    <button className="link-simples" onClick={() => setResgate({ inv: i, pos: p })}>Registrar resgate</button>
                    <button className="icone-btn" aria-label={`Excluir aplicação em ${prod.nome}`} onClick={async () => {
                      if (!confirm('Excluir este registro? Use "Registrar resgate" se você tirou o dinheiro.')) return
                      await api.excluirInvestimento(i.id); recarregar()
                    }}><Trash2 size={16} /></button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        {resgatados.length > 0 && (
          <details className="resgatados">
            <summary>{resgatados.length} {resgatados.length === 1 ? 'aplicação resgatada' : 'aplicações resgatadas'}</summary>
            <ul>{resgatados.map((i) => <li key={i.id}><span>{PRODUTOS[i.tipo].nome} · {dataCurta(i.resgatado_em!)}</span><span>{dinheiro(i.valor)} → {dinheiro(i.valor_resgate ?? 0)}</span></li>)}</ul>
          </details>
        )}
      </section>

      <NovoAporte aberto={novo} onFechar={() => setNovo(false)} onSalvo={() => { recarregar(); recarregarPerfil() }} ind={ind} />

      <Modal titulo="Registrar resgate" aberto={!!resgate} onFechar={() => setResgate(null)} estreito>
        {resgate && (
          <form className="form" onSubmit={async (e) => {
            e.preventDefault()
            const f = new FormData(e.currentTarget)
            const valor = Number(String(f.get('valor')).replace(/\./g, '').replace(',', '.')), data = String(f.get('data'))
            const problema = validarResgate({ valor, data, dataAporte: resgate.inv.data_aporte })
            if (problema) return avisar(problema, 'erro')
            try {
              await api.resgatarInvestimento(resgate.inv.id, valor, data)
              avisar('Resgate registrado e lançado como entrada no extrato.'); setResgate(null); recarregar()
            } catch (err) { avisar(err instanceof Error ? err.message : 'Erro ao resgatar.', 'erro') }
          }}>
            <p className="sutil">O valor estimado hoje é {dinheiro(resgate.pos.liquido)} líquido. Confira o valor que caiu na sua conta.</p>
            <div className="grade-2">
              <Campo rotulo="Valor recebido (R$)"><input name="valor" inputMode="decimal" defaultValue={resgate.pos.liquido.toFixed(2).replace('.', ',')} required /></Campo>
              <Campo rotulo="Data"><input name="data" type="date" defaultValue={hojeIso()} max={hojeIso()} required /></Campo>
            </div>
            <button className="btn btn-primario btn-largo">Registrar resgate</button>
          </form>
        )}
      </Modal>
    </>
  )
}

function descreverTaxa(i: Investimento) {
  switch (i.indexador) {
    case 'pos_cdi': return `${i.taxa.toLocaleString('pt-BR')}% do CDI`
    case 'selic': return 'Selic'
    case 'pre': return `${i.taxa.toLocaleString('pt-BR')}% ao ano`
    case 'ipca': return `IPCA + ${i.taxa.toLocaleString('pt-BR')}%`
    case 'poupanca': return 'regra da poupança'
  }
}

function NovoAporte({ aberto, onFechar, onSalvo, ind }: { aberto: boolean; onFechar: () => void; onSalvo: () => void; ind: Indicadores }) {
  const avisar = useToast()
  const [tipo, setTipo] = useState<TipoProduto>('TesouroSelic')
  const [taxa, setTaxa] = useState(String(PRODUTOS.TesouroSelic.taxaPadrao))
  const prod = PRODUTOS[tipo]
  const aa = useMemo(() => posicao({ id: '', tipo, valor: 100, data_aporte: hojeIso(), indexador: prod.indexador, taxa: Number(taxa.replace(',', '.')) || 0 }, ind).taxaAnualEfetiva, [tipo, taxa, ind, prod.indexador])

  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const valor = Number(String(f.get('valor')).replace(/\./g, '').replace(',', '.'))
    const aporte = {
      tipo, valor, data_aporte: String(f.get('data')), indexador: prod.indexador,
      taxa: prod.indexador === 'poupanca' ? 0 : Number(taxa.replace(',', '.')),
      emissor: String(f.get('emissor') ?? '').trim(), vencimento: String(f.get('vencimento') ?? '') || null,
      liquidez_diaria: f.get('liquidez') === 'on',
    }
    const problema = validarInvestimento(aporte)
    if (problema) return avisar(problema, 'erro')
    try {
      await api.criarInvestimento(aporte)
      avisar('Aporte registrado. +50 XP'); onSalvo(); onFechar()
    } catch (err) { avisar(err instanceof Error ? err.message : 'Não foi possível salvar.', 'erro') }
  }

  return (
    <Modal titulo="Registrar aporte" aberto={aberto} onFechar={onFechar}>
      <form className="form" onSubmit={salvar}>
        <Campo rotulo="Produto">
          <select value={tipo} onChange={(e) => { const t = e.target.value as TipoProduto; setTipo(t); setTaxa(String(PRODUTOS[t].taxaPadrao)) }}>
            {Object.values(PRODUTOS).map((p) => <option key={p.tipo} value={p.tipo}>{p.nome}</option>)}
          </select>
        </Campo>
        <p className="sutil">{prod.descricao}</p>
        <div className="grade-2">
          <Campo rotulo="Valor aplicado (R$)"><input name="valor" inputMode="decimal" required autoFocus /></Campo>
          <Campo rotulo="Data da aplicação"><input name="data" type="date" defaultValue={hojeIso()} max={hojeIso()} required /></Campo>
          {prod.indexador !== 'poupanca' && (
            <Campo rotulo={`Taxa (${prod.rotuloTaxa})`} dica={`≈ ${pctBR(aa * 100)} ao ano hoje`}>
              <input inputMode="decimal" value={taxa} onChange={(e) => setTaxa(e.target.value.replace(/[^\d.,]/g, ''))} required />
            </Campo>
          )}
          <Campo rotulo="Vencimento (opcional)"><input name="vencimento" type="date" min={hojeIso()} /></Campo>
          <Campo rotulo="Banco ou emissor (opcional)"><input name="emissor" maxLength={40} placeholder={tipo.startsWith('Tesouro') ? 'Tesouro Nacional' : 'Ex.: Banco X'} /></Campo>
        </div>
        <label className="checkbox"><input type="checkbox" name="liquidez" defaultChecked={prod.liquidezDiaria} key={tipo} /> Posso resgatar a qualquer dia útil</label>
        <button className="btn btn-primario btn-largo">Registrar aporte</button>
      </form>
    </Modal>
  )
}

// ── Simulador de objetivo ──────────────────────────────────────────────────
function Simulador({ ind }: { ind: Indicadores }) {
  const [alvo, setAlvo] = useState(10000)
  const [meses, setMeses] = useState(24)
  const [inicial, setInicial] = useState(500)
  const [escolhido, setEscolhido] = useState<TipoProduto>('CDB')
  const resultados = (Object.keys(PRODUTOS) as TipoProduto[])
    .map((t) => aporteNecessario(t, PRODUTOS[t].taxaPadrao, alvo, meses, inicial, ind))
    .sort((a, b) => a.aporteMensal - b.aporteMensal)
  const melhor = resultados[0]
  const r = resultados.find((x) => x.tipo === escolhido)!
  const pontos = projecao(escolhido, PRODUTOS[escolhido].taxaPadrao, inicial, r.aporteMensal, meses, ind)
    .filter((p) => p.mes % Math.max(1, Math.round(meses / 24)) === 0 || p.mes === meses)

  const n = (v: string) => Math.max(0, Number(v) || 0)
  return (
    <>
      <section className="painel">
        <header className="painel-topo"><h2>Qual é o objetivo?</h2></header>
        <div className="sim-grade">
          <label className="sim-campo"><span>Quero ter</span><span className="sim-entrada"><i>R$</i><input type="number" inputMode="decimal" value={alvo} step={500} onChange={(e) => setAlvo(n(e.target.value))} /></span></label>
          <label className="sim-campo"><span>Em</span><span className="sim-entrada"><input type="number" value={meses} min={1} max={480} onChange={(e) => setMeses(Math.min(480, Math.max(1, n(e.target.value))))} /><i>meses</i></span></label>
          <label className="sim-campo"><span>Já tenho</span><span className="sim-entrada"><i>R$</i><input type="number" inputMode="decimal" value={inicial} step={100} onChange={(e) => setInicial(n(e.target.value))} /></span></label>
        </div>
        {alvo > 0 && <p className="sim-frase">Com <strong>{PRODUTOS[melhor.tipo].nome}</strong>, guardando <strong>{dinheiro(melhor.aporteMensal)} por mês</strong> você chega a {dinheiro(alvo)} em {meses} meses, já descontado o IR.</p>}
      </section>

      <section className="painel">
        <header className="painel-topo"><h2>Comparando produtos</h2><small className="sutil">taxas típicas de mercado</small></header>
        <table className="tabela-sim">
          <thead><tr><th>Produto</th><th>Rende ao ano</th><th>Por mês</th><th>Juros líquidos</th></tr></thead>
          <tbody>
            {resultados.map((x) => (
              <tr key={x.tipo} className={x.tipo === escolhido ? 'ativo' : ''} onClick={() => setEscolhido(x.tipo)} tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setEscolhido(x.tipo) }} aria-selected={x.tipo === escolhido}>
                <td>{PRODUTOS[x.tipo].nome}{PRODUTOS[x.tipo].isentoIR ? <small> isento de IR</small> : null}</td>
                <td>{pctBR(x.taxaAnualEfetiva * 100, 1)}</td>
                <td><strong>{dinheiro(x.aporteMensal)}</strong></td>
                <td className="receita">{dinheiro(x.rendimentoLiquido)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="sutil">Toque em um produto para ver a evolução. Prefixado e IPCA+ podem variar se vendidos antes do vencimento; LCI e LCA costumam ter carência.</p>
      </section>

      <section className="painel">
        <header className="painel-topo"><h2>Evolução com {PRODUTOS[escolhido].nome}</h2></header>
        <div className="grafico" role="img" aria-label={`Valor líquido mês a mês até ${dinheiro(alvo)}`}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={pontos} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--linha)" />
              <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fill: 'var(--tinta-suave)', fontSize: 12 }} tickFormatter={(m) => `${m}m`} />
              <YAxis tickLine={false} axisLine={false} width={64} tick={{ fill: 'var(--tinta-suave)', fontSize: 12 }} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : String(Math.round(v)))} />
              <Tooltip formatter={(v) => dinheiro(Number(v))} labelFormatter={(m) => `Mês ${m}`} contentStyle={{ borderRadius: 12, border: '1.5px solid var(--mostarda)', background: 'var(--papel)' }} />
              <Line type="monotone" dataKey="aportado" name="Você colocou" stroke="var(--navy)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="liquido" name="Valor líquido" stroke="#3B8A3E" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </>
  )
}
