// Cálculos de investimentos. A API em C# (api/) faz as mesmas contas com indicadores
// do Banco Central em tempo real; estas funções servem para a tela responder na hora
// e para o app funcionar sem a API (modo demonstração).

export type TipoProduto = 'Poupanca' | 'TesouroSelic' | 'TesouroPrefixado' | 'TesouroIPCA' | 'CDB' | 'LCI' | 'LCA'
export type Indexador = 'pos_cdi' | 'pre' | 'ipca' | 'selic' | 'poupanca'

export interface Indicadores {
  selic: number // % a.a.
  cdi: number // % a.a.
  ipca12m: number // % acumulado em 12 meses
  dataReferencia: string // yyyy-mm-dd
  fonte: 'banco-central' | 'referencia'
}

/** Valores de referência usados quando a API não está disponível. Selic do Copom de 16/09/2026; IPCA 12m até set/2026. */
export const INDICADORES_REFERENCIA: Indicadores = {
  selic: 13.75, cdi: 13.65, ipca12m: 4.58, dataReferencia: '2026-09-16', fonte: 'referencia',
}

export interface Produto {
  tipo: TipoProduto
  nome: string
  indexador: Indexador
  taxaPadrao: number
  isentoIR: boolean
  fgc: boolean
  liquidezDiaria: boolean
  descricao: string
  rotuloTaxa: string // como a pessoa informa a taxa
}

export const PRODUTOS: Record<TipoProduto, Produto> = {
  Poupanca: { tipo: 'Poupanca', nome: 'Poupança', indexador: 'poupanca', taxaPadrao: 0, isentoIR: true, fgc: true, liquidezDiaria: true,
    descricao: 'Rende 0,5% ao mês + TR quando a Selic está acima de 8,5%. Isenta de IR, mas costuma perder para o CDI.', rotuloTaxa: '' },
  TesouroSelic: { tipo: 'TesouroSelic', nome: 'Tesouro Selic', indexador: 'selic', taxaPadrao: 100, isentoIR: false, fgc: false, liquidezDiaria: true,
    descricao: 'Título público que acompanha a Selic. Resgate em até um dia útil: o favorito para reserva de emergência.', rotuloTaxa: '% da Selic' },
  TesouroPrefixado: { tipo: 'TesouroPrefixado', nome: 'Tesouro Prefixado', indexador: 'pre', taxaPadrao: 13, isentoIR: false, fgc: false, liquidezDiaria: false,
    descricao: 'Taxa fixa combinada na compra. Bom se os juros caírem; vender antes do vencimento pode dar perda.', rotuloTaxa: '% ao ano' },
  TesouroIPCA: { tipo: 'TesouroIPCA', nome: 'Tesouro IPCA+', indexador: 'ipca', taxaPadrao: 7, isentoIR: false, fgc: false, liquidezDiaria: false,
    descricao: 'Paga a inflação mais uma taxa fixa. Protege o poder de compra em objetivos longos, como aposentadoria.', rotuloTaxa: 'IPCA + % ao ano' },
  CDB: { tipo: 'CDB', nome: 'CDB', indexador: 'pos_cdi', taxaPadrao: 105, isentoIR: false, fgc: true, liquidezDiaria: true,
    descricao: 'Empréstimo ao banco, normalmente atrelado ao CDI. Coberto pelo FGC até R$ 250 mil por instituição.', rotuloTaxa: '% do CDI' },
  LCI: { tipo: 'LCI', nome: 'LCI', indexador: 'pos_cdi', taxaPadrao: 92, isentoIR: true, fgc: true, liquidezDiaria: false,
    descricao: 'Letra de Crédito Imobiliário. Isenta de IR para pessoa física e coberta pelo FGC; costuma ter carência.', rotuloTaxa: '% do CDI' },
  LCA: { tipo: 'LCA', nome: 'LCA', indexador: 'pos_cdi', taxaPadrao: 92, isentoIR: true, fgc: true, liquidezDiaria: false,
    descricao: 'Letra de Crédito do Agronegócio. Mesmas regras gerais da LCI: isenta de IR e coberta pelo FGC.', rotuloTaxa: '% do CDI' },
}

/** Taxa efetiva ao ano (em fração, 0.12 = 12%) de um produto com os indicadores dados. */
export function taxaAnual(indexador: Indexador, taxa: number, ind: Indicadores): number {
  const anualDeDiaria = (aa: number, pct: number) => Math.pow(1 + (Math.pow(1 + aa / 100, 1 / 252) - 1) * (pct / 100), 252) - 1
  switch (indexador) {
    case 'pos_cdi': return anualDeDiaria(ind.cdi, taxa)
    case 'selic': return anualDeDiaria(ind.selic, taxa || 100)
    case 'pre': return taxa / 100
    case 'ipca': return (1 + ind.ipca12m / 100) * (1 + taxa / 100) - 1
    case 'poupanca': return ind.selic > 8.5 ? Math.pow(1.005, 12) - 1 : (ind.selic * 0.7) / 100
  }
}

/** Alíquota de IR da renda fixa pela tabela regressiva (prazo em dias corridos). */
export function aliquotaIR(dias: number): number {
  if (dias <= 180) return 0.225
  if (dias <= 360) return 0.2
  if (dias <= 720) return 0.175
  return 0.15
}

export interface Posicao {
  id: string
  tipo: TipoProduto
  aplicado: number
  bruto: number
  rendimento: number
  ir: number
  liquido: number
  dias: number
  taxaAnualEfetiva: number
}

const DIA = 864e5
export const diasEntre = (de: string, ate: Date) => Math.max(0, Math.floor((ate.getTime() - new Date(de + 'T00:00:00').getTime()) / DIA))

export function posicao(i: { id: string; tipo: TipoProduto; valor: number; data_aporte: string; indexador: Indexador; taxa: number },
  ind: Indicadores, hoje = new Date()): Posicao {
  const dias = diasEntre(i.data_aporte, hoje)
  const aa = taxaAnual(i.indexador, i.taxa, ind)
  const bruto = i.valor * Math.pow(1 + aa, dias / 365)
  const rendimento = bruto - i.valor
  const ir = PRODUTOS[i.tipo].isentoIR ? 0 : Math.max(0, rendimento) * aliquotaIR(dias)
  return { id: i.id, tipo: i.tipo, aplicado: i.valor, bruto, rendimento, ir, liquido: bruto - ir, dias, taxaAnualEfetiva: aa }
}

// ── Alocação ───────────────────────────────────────────────────────────────
export type Classe = 'Pós-fixado' | 'Inflação' | 'Prefixado'
export const classeDe = (ix: Indexador): Classe => (ix === 'ipca' ? 'Inflação' : ix === 'pre' ? 'Prefixado' : 'Pós-fixado')

/** Referência educativa de divisão por perfil. Não é recomendação de investimento. */
export const REFERENCIA_PERFIL: Record<string, Record<Classe, number>> = {
  Conservador: { 'Pós-fixado': 70, 'Inflação': 20, 'Prefixado': 10 },
  Moderado: { 'Pós-fixado': 50, 'Inflação': 30, 'Prefixado': 20 },
  Arrojado: { 'Pós-fixado': 35, 'Inflação': 35, 'Prefixado': 30 },
}

// ── Simulação de objetivo ──────────────────────────────────────────────────
export interface ResultadoObjetivo {
  tipo: TipoProduto
  aporteMensal: number // necessário para chegar ao alvo (líquido de IR)
  totalAportado: number
  rendimentoLiquido: number
  taxaAnualEfetiva: number
}

/**
 * Aporte mensal para atingir `alvo` (líquido de IR) em `meses`, partindo de `inicial`.
 * Usa a alíquota de IR do prazo total; aportes mais recentes pagariam um pouco mais, então é uma estimativa.
 */
export function aporteNecessario(tipo: TipoProduto, taxa: number, alvo: number, meses: number, inicial: number, ind: Indicadores): ResultadoObjetivo {
  const p = PRODUTOS[tipo]
  const aa = taxaAnual(p.indexador, taxa, ind)
  const r = Math.pow(1 + aa, 1 / 12) - 1
  const g = Math.pow(1 + r, meses)
  const s = r > 0 ? (g - 1) / r : meses
  const t = p.isentoIR ? 0 : aliquotaIR(meses * 30)
  const A = Math.max(0, (alvo - (1 - t) * inicial * g - t * inicial) / ((1 - t) * s + t * meses))
  const totalAportado = inicial + A * meses
  return { tipo, aporteMensal: A, totalAportado, rendimentoLiquido: alvo - totalAportado, taxaAnualEfetiva: aa }
}

/** Evolução mês a mês (líquido de IR) com aporte fixo. */
export function projecao(tipo: TipoProduto, taxa: number, inicial: number, mensal: number, meses: number, ind: Indicadores) {
  const p = PRODUTOS[tipo]
  const r = Math.pow(1 + taxaAnual(p.indexador, taxa, ind), 1 / 12) - 1
  const pontos: { mes: number; aportado: number; liquido: number }[] = []
  let bruto = inicial
  for (let m = 1; m <= meses; m++) {
    bruto = bruto * (1 + r) + mensal
    const aportado = inicial + mensal * m
    const ir = p.isentoIR ? 0 : Math.max(0, bruto - aportado) * aliquotaIR(m * 30)
    pontos.push({ mes: m, aportado, liquido: bruto - ir })
  }
  return pontos
}
