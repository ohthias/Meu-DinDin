import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Cpu, Repeat, TriangleAlert, Wand2 } from 'lucide-react'
import { api } from '../lib/api'
import { analise as apiAnalise, analiseDisponivel } from '../lib/apiAnalise'
import { dataCurta, dinheiro, iso, MESES, MESES_CURTOS } from '../lib/format'
import { useDados } from '../lib/hooks'
import { anomalias, Categorizador, carregarMotor, fechamentoDoMes, preverGastos, recorrencias } from '../lib/ml'
import { saudeFinanceira, type Saude } from '../lib/saude'
import { Barra, Carregando, useToast, Vazio } from '../components/ui'

export function Analise() {
  const avisar = useToast()
  const [aplicadas, setAplicadas] = useState<Set<string>>(new Set())
  const hoje = new Date()
  const { dados, erro, recarregar } = useDados(async () => {
    const inicio = new Date(hoje.getFullYear() - 1, hoje.getMonth(), 1)
    const [motor, ts, contas, investimentos, orcamentos] = await Promise.all([
      carregarMotor(), api.transacoes({ de: iso(inicio) }), api.contas(), api.investimentos(), api.orcamentos(hoje.getMonth() + 1, hoje.getFullYear()),
    ])
    let saude: Saude & { origem: 'api' | 'local' } = { ...saudeFinanceira({ transacoes: ts, contas, investimentos, orcamentos }, hoje), origem: 'local' }
    if (analiseDisponivel) {
      try { saude = { ...(await apiAnalise.saude()) as Saude, origem: 'api' } } catch { /* mantém o cálculo local */ }
    }
    const categorizador = new Categorizador(motor)
    categorizador.treinar(ts)
    const semCategoria = ts
      .filter((t) => t.tipo === 'despesa' && t.categoria === 'Outro' && t.origem === 'manual' && t.descricao)
      .map((t) => ({ t, s: categorizador.sugerir(t.descricao) }))
      .filter((x) => x.s)
      .slice(0, 8)
    return {
      saude,
      previsao: preverGastos(motor, ts, hoje),
      fechamento: fechamentoDoMes(ts, hoje),
      anomalias: anomalias(motor, ts, hoje),
      recorrentes: recorrencias(ts, hoje),
      semCategoria,
      temDados: ts.length > 0,
    }
  })
  if (erro) return <Vazio titulo="Não foi possível analisar" texto={erro} acao={<button className="btn btn-secundario" onClick={recarregar}>Tentar de novo</button>} />
  if (!dados) return <Carregando />
  if (!dados.temDados) return <Vazio titulo="Ainda não há o que analisar" texto="Registre transações ou conecte seu banco. Com um ou dois meses de histórico as previsões já começam a aparecer." acao={<Link to="/contas" className="btn btn-primario">Conectar banco</Link>} />

  const { saude, previsao, fechamento } = dados
  const proximoMes = MESES[(hoje.getMonth() + 1) % 12]
  const totalRecorrente = dados.recorrentes.reduce((s, r) => s + r.valorMedio, 0)
  const maxHist = Math.max(1, ...previsao.categorias.flatMap((c) => [...c.historico, c.previsto]))
  const sobra = fechamento.receitaMedia - fechamento.previsto

  async function aplicar(id: string, categoria: string) {
    await api.alterarCategoria(id, categoria)
    setAplicadas((a) => new Set(a).add(id))
    avisar(`Categoria alterada para ${categoria}.`)
  }

  return (
    <div className="pagina pagina-estreita">
      <header className="pagina-topo"><h1 className="titulo-pagina">Análise</h1></header>

      <section className="saude">
        <div className="saude-nota" style={{ ['--p' as string]: saude.pontuacao }}>
          <strong>{saude.pontuacao}</strong><span>de 100</span>
        </div>
        <div className="saude-texto">
          <h2>{saude.faixa}</h2>
          <p>Sua saúde financeira, somando seis critérios. Toque em cada um para ver como melhorar.</p>
        </div>
      </section>
      <ul className="componentes">
        {saude.componentes.map((c) => (
          <li key={c.id}>
            <details>
              <summary>
                <span>{c.nome}</span>
                <b>{c.pontos}<small>/{c.maximo}</small></b>
                <Barra valor={c.pontos} total={c.maximo} cor={c.pontos / c.maximo >= 0.7 ? 'var(--verde)' : c.pontos / c.maximo >= 0.4 ? 'var(--mostarda)' : 'var(--erro)'} />
              </summary>
              <p>{c.detalhe}</p>
              <p className="sutil">{c.dica}</p>
            </details>
          </li>
        ))}
      </ul>

      <section className="painel">
        <header className="painel-topo"><h2>Como {MESES[hoje.getMonth()]} deve fechar</h2></header>
        <div className="fechamento">
          <div><span>Já saiu</span><strong>{dinheiro(fechamento.gastoAteHoje)}</strong></div>
          <div><span>Deve sair até o fim do mês</span><strong>{dinheiro(fechamento.restanteMedio)}</strong></div>
          <div><span>Total previsto</span><strong>{dinheiro(fechamento.previsto)}</strong></div>
        </div>
        {fechamento.receitaMedia > 0 && (
          <p className={`aviso-linha ${sobra < 0 ? 'ruim' : 'bom'}`}>
            {sobra >= 0
              ? `No ritmo dos últimos meses, sobram cerca de ${dinheiro(sobra)} da sua entrada média de ${dinheiro(fechamento.receitaMedia)}.`
              : `No ritmo dos últimos meses, as saídas passam a sua entrada média em ${dinheiro(-sobra)}. Vale segurar os gastos variáveis.`}
          </p>
        )}
      </section>

      <section className="painel">
        <header className="painel-topo">
          <h2>Previsão para {proximoMes}</h2>
          <small className="sutil">{dinheiro(previsao.total.minimo)} a {dinheiro(previsao.total.maximo)}</small>
        </header>
        <p className="previsao-total"><strong>{dinheiro(previsao.total.previsto)}</strong> em saídas, contra média de {dinheiro(previsao.total.media)} nos últimos meses.</p>
        <ul className="previsoes">
          {previsao.categorias.slice(0, 7).map((c) => {
            const variacao = c.media > 0 ? (c.previsto - c.media) / c.media : 0
            return (
              <li key={c.categoria}>
                <span className="previsao-nome">{c.categoria}</span>
                <span className="mini-barras" aria-label={`Histórico: ${c.historico.map((v, i) => `${MESES_CURTOS[Number(previsao.meses[i].slice(5)) - 1]} ${dinheiro(v)}`).join(', ')}`}>
                  {c.historico.map((v, i) => <i key={i} style={{ height: `${(v / maxHist) * 100}%` }} />)}
                  <i className="previsto" style={{ height: `${(c.previsto / maxHist) * 100}%` }} />
                </span>
                <b>{dinheiro(c.previsto)}</b>
                <small className={variacao > 0.15 ? 'erro' : variacao < -0.15 ? 'receita' : 'sutil'}>
                  {Math.abs(variacao) < 0.05 ? 'estável' : `${variacao > 0 ? '+' : ''}${Math.round(variacao * 100)}%`}
                </small>
              </li>
            )
          })}
        </ul>
        <p className="sutil">Barras: últimos 6 meses; a mais clara é a previsão. Modelo de Holt, que acompanha nível e tendência de cada categoria.</p>
      </section>

      <section className="painel">
        <header className="painel-topo"><h2><TriangleAlert size={18} aria-hidden="true" /> Fora do padrão</h2><small className="sutil">últimos 60 dias</small></header>
        {!dados.anomalias.length ? <p className="sutil">Nenhum gasto muito acima do seu normal. Bom sinal.</p> : (
          <ul className="lista-insight">
            {dados.anomalias.map((a) => (
              <li key={a.transacao.id}>
                <span><strong>{a.transacao.descricao || a.transacao.categoria}</strong><small>{dataCurta(a.transacao.data)} · {a.transacao.categoria}</small></span>
                <span className="direita"><b>{dinheiro(a.transacao.valor)}</b><small>{a.vezes.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}× o seu normal ({dinheiro(a.mediana)})</small></span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="painel">
        <header className="painel-topo"><h2><Repeat size={18} aria-hidden="true" /> Gastos que se repetem</h2>{totalRecorrente > 0 && <small className="sutil">{dinheiro(totalRecorrente)} por mês</small>}</header>
        {!dados.recorrentes.length ? <p className="sutil">Nenhuma assinatura ou conta fixa identificada ainda. Elas aparecem depois de três meses seguidos.</p> : (
          <ul className="lista-insight">
            {dados.recorrentes.map((r) => (
              <li key={r.descricao}>
                <span><strong>{r.descricao}</strong><small>{r.categoria} · {r.meses} meses seguidos</small></span>
                <span className="direita"><b>{dinheiro(r.valorMedio)}</b><small>próxima por volta de {dataCurta(r.proximo)}</small></span>
              </li>
            ))}
          </ul>
        )}
        {dados.recorrentes.length > 0 && <p className="sutil">Por ano, isso soma {dinheiro(totalRecorrente * 12)}. Vale revisar o que você não usa mais.</p>}
      </section>

      {dados.semCategoria.length > 0 && (
        <section className="painel">
          <header className="painel-topo"><h2><Wand2 size={18} aria-hidden="true" /> Sugestões de categoria</h2></header>
          <p className="sutil">Transações em "Outro" que o modelo reconheceu pelo texto e pelo seu histórico.</p>
          <ul className="lista-insight">
            {dados.semCategoria.map(({ t, s }) => (
              <li key={t.id}>
                <span><strong>{t.descricao}</strong><small>{dataCurta(t.data)} · {dinheiro(t.valor)}</small></span>
                {aplicadas.has(t.id) ? <span className="selo-ok">{s!.categoria}</span> : (
                  <button className="btn btn-secundario" onClick={() => aplicar(t.id, s!.categoria)}>
                    {s!.categoria} <small className="sutil">{Math.round(s!.confianca * 100)}%</small>
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="nota-motor">
        <Cpu size={16} aria-hidden="true" />
        Previsões, gastos fora do padrão e categorias são calculados no seu navegador por um motor em WebAssembly: seus dados não saem do aparelho para estas contas.
        {saude.origem === 'api' ? ' A pontuação de saúde vem da API de análise.' : ''}
      </p>
    </div>
  )
}
