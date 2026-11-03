import type { Profile, Transacao } from './types'
import { MESES_CURTOS } from './format'

export function somar(ts: Transacao[], tipo: 'receita' | 'despesa') {
  return ts.filter((t) => t.tipo === tipo).reduce((s, t) => s + t.valor, 0)
}

export function porCategoria(ts: Transacao[]) {
  const m = new Map<string, number>()
  for (const t of ts) if (t.tipo === 'despesa') m.set(t.categoria, (m.get(t.categoria) ?? 0) + t.valor)
  return [...m.entries()].map(([categoria, total]) => ({ categoria, total })).sort((a, b) => b.total - a.total)
}

export function evolucao(ts: Transacao[], meses = 6) {
  const h = new Date()
  return Array.from({ length: meses }, (_, i) => {
    const d = new Date(h.getFullYear(), h.getMonth() - (meses - 1 - i), 1)
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const doMes = ts.filter((t) => t.data.startsWith(chave))
    return { mes: MESES_CURTOS[d.getMonth()], receitas: somar(doMes, 'receita'), despesas: somar(doMes, 'despesa') }
  })
}

export type Dica = { titulo: string; texto: string; tom: 'alerta' | 'dica' | 'parabens' }

/** Porte das regras do RecomendacaoService.cs original. */
export function dicas(ts: Transacao[], perfil: Profile | null): Dica[] {
  const rec = somar(ts, 'receita'), dep = somar(ts, 'despesa')
  const pctG = rec > 0 ? (dep / rec) * 100 : 0
  const pctE = rec > 0 ? Math.max(0, ((rec - dep) / rec) * 100) : 0
  const cats = porCategoria(ts)
  const lazer = cats.find((c) => c.categoria === 'Lazer')?.total ?? 0
  const r: Dica[] = []
  if (!ts.length) return [{ titulo: 'Comece a registrar', texto: 'Adicione uma transação ou conecte seu banco para ativar a análise do mês.', tom: 'dica' }]
  if (pctG > 90) r.push({ titulo: 'Gastos muito altos', texto: `Despesas em ${pctG.toFixed(0)}% da renda. O maior gasto foi ${cats[0]?.categoria ?? '—'}.`, tom: 'alerta' })
  if (rec > 0 && lazer / rec > 0.3) r.push({ titulo: 'Lazer acima do ideal', texto: `Lazer está em ${((lazer / rec) * 100).toFixed(0)}% da renda. O recomendado é até 30%.`, tom: 'alerta' })
  if (pctE >= 20) r.push({ titulo: 'Boa economia', texto: `Você guardou ${pctE.toFixed(0)}% da renda. Que tal mover uma parte para o Tesouro Selic?`, tom: 'parabens' })
  if (perfil?.desafio_financeiro === 'Não consegue poupar') r.push({ titulo: 'Pague-se primeiro', texto: 'Separe o valor a guardar assim que receber, antes de qualquer gasto.', tom: 'dica' })
  if (perfil?.desafio_financeiro === 'Não sabe investir' && pctG < 80) r.push({ titulo: 'Pronto para investir?', texto: 'Com os gastos sob controle, dá para começar no Tesouro Selic com cerca de R$ 30.', tom: 'dica' })
  if (perfil?.desafio_financeiro === 'Dívidas') r.push({ titulo: 'Foco nas dívidas', texto: 'Quite primeiro as dívidas com juros altos, como cartão e cheque especial.', tom: 'alerta' })
  if (rec > 0 && pctE < 10) r.push({ titulo: 'Regra 50/30/20', texto: `Você guardou ${pctE.toFixed(0)}% este mês. A meta é 20%: corte um gasto de lazer por semana.`, tom: 'dica' })
  if (!r.length) r.push({ titulo: 'Continue assim', texto: `Gastos em ${pctG.toFixed(0)}% da renda. Tente chegar a 20% de economia.`, tom: 'dica' })
  return r.slice(0, 3)
}
