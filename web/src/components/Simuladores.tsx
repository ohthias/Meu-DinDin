import { useId, useState } from 'react'
import { dinheiro } from '../lib/format'

function Numero({ rotulo, valor, onChange, sufixo, passo = 1, min = 0, max }: {
  rotulo: string; valor: number; onChange: (n: number) => void; sufixo?: string; passo?: number; min?: number; max?: number
}) {
  const id = useId()
  return (
    <label className="sim-campo" htmlFor={id}>
      <span>{rotulo}</span>
      <span className="sim-entrada">
        {!sufixo && <i>R$</i>}
        <input id={id} type="number" inputMode="decimal" value={Number.isFinite(valor) ? valor : ''} step={passo} min={min} max={max}
          onChange={(e) => onChange(Math.max(min, Number(e.target.value) || 0))} />
        {sufixo && <i>{sufixo}</i>}
      </span>
    </label>
  )
}

function Moldura({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="simulador" role="group" aria-label={titulo}>
      <h4>{titulo}</h4>
      {children}
    </div>
  )
}

export function Regra503020() {
  const [renda, setRenda] = useState(2000)
  const partes = [
    { nome: 'Necessidades', p: 0.5, cor: 'var(--navy)' },
    { nome: 'Desejos', p: 0.3, cor: 'var(--mostarda)' },
    { nome: 'Futuro', p: 0.2, cor: 'var(--verde)' },
  ]
  return (
    <Moldura titulo="Calcule sua divisão">
      <Numero rotulo="Renda líquida por mês" valor={renda} onChange={setRenda} passo={100} />
      <div className="sim-pilha" aria-hidden="true">{partes.map((x) => <span key={x.nome} style={{ flexGrow: x.p, background: x.cor }} />)}</div>
      <dl className="sim-resultado">
        {partes.map((x) => <div key={x.nome}><dt>{x.nome} ({x.p * 100}%)</dt><dd>{dinheiro(renda * x.p)}</dd></div>)}
      </dl>
    </Moldura>
  )
}

export function SimReserva() {
  const [gastos, setGastos] = useState(1500)
  const [meses, setMeses] = useState(4)
  const [porMes, setPorMes] = useState(300)
  const alvo = gastos * meses
  const tempo = porMes > 0 ? Math.ceil(alvo / porMes) : Infinity
  return (
    <Moldura titulo="Quanto e em quanto tempo">
      <div className="sim-grade">
        <Numero rotulo="Gastos essenciais por mês" valor={gastos} onChange={setGastos} passo={100} />
        <Numero rotulo="Meses de proteção" valor={meses} onChange={(n) => setMeses(Math.min(12, Math.max(1, n)))} sufixo="meses" min={1} max={12} />
        <Numero rotulo="Quanto consigo guardar por mês" valor={porMes} onChange={setPorMes} passo={50} />
      </div>
      <p className="sim-frase">
        Sua reserva ideal é <strong>{dinheiro(alvo)}</strong>.{' '}
        {Number.isFinite(tempo) ? <>Guardando {dinheiro(porMes)} por mês, você chega lá em <strong>{tempo} {tempo === 1 ? 'mês' : 'meses'}</strong>{tempo > 12 ? ` (cerca de ${(tempo / 12).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} anos)` : ''}.</> : 'Defina um valor para guardar por mês.'}
      </p>
    </Moldura>
  )
}

export function SimJuros() {
  const [inicial, setInicial] = useState(500)
  const [mensal, setMensal] = useState(200)
  const [taxa, setTaxa] = useState(10)
  const [anos, setAnos] = useState(10)
  const i = Math.pow(1 + taxa / 100, 1 / 12) - 1
  const n = anos * 12
  let saldo = inicial
  const pontos: number[] = []
  for (let k = 1; k <= n; k++) {
    saldo = saldo * (1 + i) + mensal
    if (k % 12 === 0) pontos.push(saldo)
  }
  const investido = inicial + mensal * n
  const juros = saldo - investido
  const max = Math.max(...pontos, 1)
  return (
    <Moldura titulo="Simulador de juros compostos">
      <div className="sim-grade">
        <Numero rotulo="Valor inicial" valor={inicial} onChange={setInicial} passo={100} />
        <Numero rotulo="Aporte por mês" valor={mensal} onChange={setMensal} passo={50} />
        <Numero rotulo="Rendimento ao ano" valor={taxa} onChange={(v) => setTaxa(Math.min(30, v))} sufixo="%" passo={0.5} max={30} />
        <Numero rotulo="Por quanto tempo" valor={anos} onChange={(v) => setAnos(Math.min(40, Math.max(1, v)))} sufixo="anos" min={1} max={40} />
      </div>
      <div className="sim-barras" aria-hidden="true">
        {pontos.map((p, k) => {
          const inv = inicial + mensal * 12 * (k + 1)
          return (
            <span key={k} style={{ height: `${(p / max) * 100}%` }}>
              <b style={{ height: `${Math.min(100, (inv / p) * 100)}%` }} />
            </span>
          )
        })}
      </div>
      <dl className="sim-resultado">
        <div><dt>Você colocou</dt><dd>{dinheiro(investido)}</dd></div>
        <div><dt>Juros ganhos</dt><dd className="receita">{dinheiro(juros)}</dd></div>
        <div><dt>Total</dt><dd><strong>{dinheiro(saldo)}</strong></dd></div>
      </dl>
      <p className="sutil">Barras: total por ano. A parte escura é o que você colocou; o resto são juros. Simulação sem impostos nem taxas.</p>
    </Moldura>
  )
}

export function SimInflacao() {
  const [valor, setValor] = useState(1000)
  const [inflacao, setInflacao] = useState(4.5)
  const [anos, setAnos] = useState(5)
  const poder = valor / Math.pow(1 + inflacao / 100, anos)
  return (
    <Moldura titulo="O que a inflação faz com o dinheiro parado">
      <div className="sim-grade">
        <Numero rotulo="Dinheiro guardado sem render" valor={valor} onChange={setValor} passo={100} />
        <Numero rotulo="Inflação ao ano" valor={inflacao} onChange={(v) => setInflacao(Math.min(30, v))} sufixo="%" passo={0.5} max={30} />
        <Numero rotulo="Anos" valor={anos} onChange={(v) => setAnos(Math.min(30, Math.max(1, v)))} sufixo="anos" min={1} max={30} />
      </div>
      <p className="sim-frase">
        Daqui a {anos} {anos === 1 ? 'ano' : 'anos'}, seus {dinheiro(valor)} vão comprar o que hoje custa <strong>{dinheiro(poder)}</strong>, uma perda de {Math.round((1 - poder / valor) * 100)}% do poder de compra.
      </p>
    </Moldura>
  )
}

type Divida = { nome: string; saldo: number; juros: number }
function simular(dividas: Divida[], extra: number, ordem: 'avalanche' | 'bola') {
  const ds = dividas.map((d) => ({ ...d, minimo: Math.max(30, d.saldo * 0.05) }))
  let meses = 0, jurosTotal = 0
  while (ds.some((d) => d.saldo > 0.01) && meses < 600) {
    meses++
    for (const d of ds) if (d.saldo > 0) { const j = d.saldo * (d.juros / 100); d.saldo += j; jurosTotal += j }
    let sobra = extra
    for (const d of ds) if (d.saldo > 0) { const p = Math.min(d.minimo, d.saldo); d.saldo -= p }
    const alvo = ds.filter((d) => d.saldo > 0).sort((a, b) => (ordem === 'avalanche' ? b.juros - a.juros : a.saldo - b.saldo))
    for (const d of alvo) { const p = Math.min(sobra, d.saldo); d.saldo -= p; sobra -= p; if (sobra <= 0) break }
    // dívida quitada libera o mínimo dela para as outras no mês seguinte
    for (const d of ds) if (d.saldo <= 0.01 && d.minimo) { extra += d.minimo; d.minimo = 0; d.saldo = 0 }
  }
  return { meses, jurosTotal }
}

export function SimDivida() {
  const [extra, setExtra] = useState(150)
  const dividas: Divida[] = [
    { nome: 'Cartão (rotativo)', saldo: 1200, juros: 12 },
    { nome: 'Empréstimo pessoal', saldo: 3000, juros: 4 },
    { nome: 'Celular parcelado', saldo: 600, juros: 2 },
  ]
  const av = simular(dividas, extra, 'avalanche')
  const bn = simular(dividas, extra, 'bola')
  return (
    <Moldura titulo="Avalanche ou bola de neve?">
      <ul className="sim-dividas">
        {dividas.map((d) => <li key={d.nome}><span>{d.nome}</span><span>{dinheiro(d.saldo)} · {d.juros}% a.m.</span></li>)}
      </ul>
      <Numero rotulo="Valor extra por mês, além dos mínimos" valor={extra} onChange={setExtra} passo={50} />
      <dl className="sim-resultado">
        <div><dt>Avalanche</dt><dd>{av.meses} meses · {dinheiro(av.jurosTotal)} de juros</dd></div>
        <div><dt>Bola de neve</dt><dd>{bn.meses} meses · {dinheiro(bn.jurosTotal)} de juros</dd></div>
      </dl>
      <p className="sutil">Exemplo com parcela mínima de 5% do saldo. Com estas taxas, a avalanche economiza {dinheiro(Math.max(0, bn.jurosTotal - av.jurosTotal))}.</p>
    </Moldura>
  )
}

export const SIMULADORES = { 'regra-503020': Regra503020, reserva: SimReserva, juros: SimJuros, inflacao: SimInflacao, divida: SimDivida }
