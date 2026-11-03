const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const dinheiro = (v: number) => brl.format(v)
export const dinheiroCurto = (v: number) =>
  Math.abs(v) >= 10000 ? `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : brl.format(v)

export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
export const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const hojeIso = () => iso(new Date())

/** Primeiro e último dia de um mês (mes 1–12). */
export function intervaloMes(mes: number, ano: number) {
  return { de: iso(new Date(ano, mes - 1, 1)), ate: iso(new Date(ano, mes, 0)) }
}

export const dataCurta = (s: string) => {
  const [, m, d] = s.split('-')
  return `${d}/${m}`
}
export const dataLonga = (s: string) => {
  const [a, m, d] = s.split('-').map(Number)
  return `${d} de ${MESES[m - 1]} de ${a}`
}

export const pct = (v: number, total: number) => (total > 0 ? Math.round((v / total) * 100) : 0)
