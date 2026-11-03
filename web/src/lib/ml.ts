// Análises que rodam no navegador usando o motor em WebAssembly (web/wasm/motor.ts).
import { instantiate } from '../wasm/motor.js'
import { CATEGORIAS_DESPESA, type Transacao } from './types'
import { iso } from './format'

type Motor = Awaited<ReturnType<typeof instantiate>>
let motorPromise: Promise<Motor> | null = null

/** Carrega o .wasm uma vez. `bytes` permite injetar o binário (testes em Node). */
export function carregarMotor(bytes?: () => Promise<BufferSource>): Promise<Motor> {
  if (!motorPromise) {
    motorPromise = (async () => {
      const modulo = bytes
        ? await WebAssembly.compile(await bytes())
        : await WebAssembly.compileStreaming(fetch((await import('../wasm/motor.wasm?url')).default))
      return instantiate(modulo, { env: {} })
    })()
  }
  return motorPromise
}

// ── Texto → tokens ─────────────────────────────────────────────────────────
const PARADAS = new Set(['de', 'da', 'do', 'das', 'dos', 'com', 'para', 'por', 'pix', 'compra', 'pagamento', 'pag', 'pgto', 'transf', 'transferencia', 'ted', 'doc', 'debito', 'credito', 'cartao', 'em', 'no', 'na', 'ltda', 'sa', 'me', 'eireli'])

export function normalizar(texto: string) {
  return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function fnv1a(s: string) {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) }
  return h >>> 0 & 0x7fffffff
}

/** Palavras relevantes + prefixos de 5 letras (generaliza "uberpass" → "uber…"). */
export function tokenizar(texto: string): number[] {
  const out: number[] = []
  for (const p of normalizar(texto).split(' ')) {
    if (p.length < 3 || PARADAS.has(p)) continue
    out.push(fnv1a(p))
    if (p.length > 5) out.push(fnv1a('#' + p.slice(0, 5)))
  }
  return out
}

// Exemplos iniciais para o modelo funcionar antes de haver histórico próprio
const SEMENTES: Record<string, string[]> = {
  'Alimentação': ['mercado supermercado', 'ifood delivery', 'restaurante almoco', 'padaria cafe', 'lanchonete lanche', 'pizzaria pizza', 'acougue hortifruti', 'rappi', 'bandejao', 'feira'],
  'Transporte': ['uber corrida', 'ônibus bilhete unico', 'metro recarga', 'posto gasolina combustivel', 'estacionamento', 'taxi', 'cabify', 'pedagio', 'trem passagem'],
  'Moradia': ['aluguel', 'condominio', 'conta de luz energia enel', 'conta de agua sabesp', 'internet fibra', 'gas botijao', 'iptu'],
  'Saúde': ['farmacia drogaria', 'consulta medica', 'dentista', 'academia', 'plano de saude', 'exame laboratorio', 'psicologo terapia'],
  'Educação': ['curso online', 'faculdade mensalidade', 'livraria livro', 'material escolar', 'udemy alura', 'apostila'],
  'Lazer': ['cinema ingresso', 'show festival', 'bar cerveja', 'viagem hotel', 'steam jogo', 'balada', 'teatro', 'parque'],
  'Roupas': ['loja roupa', 'tenis calcado', 'renner riachuelo', 'camiseta', 'shein', 'zara'],
  'Streaming': ['netflix', 'spotify assinatura musica', 'disney plus', 'prime video', 'youtube premium', 'max hbo', 'deezer'],
}

// ── Categorização automática (Naive Bayes no WASM) ─────────────────────────
export class Categorizador {
  private classes: string[] = []
  private treinado = false
  private motor: Motor
  constructor(motor: Motor) { this.motor = motor }

  treinar(historico: Pick<Transacao, 'descricao' | 'categoria' | 'tipo'>[]) {
    const docs: { tokens: number[]; classe: string }[] = []
    for (const [cat, frases] of Object.entries(SEMENTES)) for (const f of frases) docs.push({ tokens: tokenizar(f), classe: cat })
    // o histórico pesa o dobro das sementes: o jeito da pessoa escrever ganha prioridade
    for (const t of historico) {
      if (t.tipo !== 'despesa' || t.categoria === 'Outro' || !t.descricao) continue
      const tk = tokenizar(t.descricao)
      if (tk.length) { docs.push({ tokens: tk, classe: t.categoria }); docs.push({ tokens: tk, classe: t.categoria }) }
    }
    this.classes = [...new Set([...CATEGORIAS_DESPESA.filter((c) => c !== 'Outro'), ...docs.map((d) => d.classe)])]
    const idx = new Map(this.classes.map((c, i) => [c, i]))
    const tokens: number[] = [], inicio: number[] = [], rotulos: number[] = []
    for (const d of docs) { inicio.push(tokens.length); tokens.push(...d.tokens); rotulos.push(idx.get(d.classe)!) }
    this.motor.nbTreinar(Int32Array.from(tokens), Int32Array.from(inicio), Int32Array.from(rotulos), this.classes.length, 4096)
    this.treinado = true
  }

  /** Sugestão com confiança; null quando o texto não dá pista suficiente. */
  sugerir(descricao: string, confiancaMinima = 0.5): { categoria: string; confianca: number } | null {
    if (!this.treinado) return null
    const tk = tokenizar(descricao)
    if (!tk.length) return null
    const p = this.motor.nbPrever(Int32Array.from(tk))
    if (!p.some((v) => v > 0)) return null
    let melhor = 0
    for (let i = 1; i < p.length; i++) if (p[i] > p[melhor]) melhor = i
    return p[melhor] >= confiancaMinima ? { categoria: this.classes[melhor], confianca: p[melhor] } : null
  }
}

// ── Séries mensais ─────────────────────────────────────────────────────────
const chaveMes = (d: Date) => iso(d).slice(0, 7)
export function mesesAnteriores(n: number, hoje = new Date()) {
  return Array.from({ length: n }, (_, i) => chaveMes(new Date(hoje.getFullYear(), hoje.getMonth() - n + i, 1)))
}

/** Gasto total por mês fechado (sem o mês corrente). */
export function serieMensal(ts: Transacao[], meses: string[], categoria?: string) {
  return meses.map((m) => ts.filter((t) => t.tipo === 'despesa' && t.data.startsWith(m) && (!categoria || t.categoria === categoria)).reduce((s, t) => s + t.valor, 0))
}

export interface Previsao { categoria: string; previsto: number; minimo: number; maximo: number; media: number; historico: number[] }

/** Previsão do próximo mês por categoria e total, com faixa de 80%. */
export function preverGastos(motor: Motor, ts: Transacao[], hoje = new Date()): { total: Previsao; categorias: Previsao[]; meses: string[] } {
  const meses = mesesAnteriores(6, hoje)
  const calc = (categoria: string, serie: number[]): Previsao => {
    const ativos = serie.findIndex((v) => v > 0)
    const util = ativos < 0 ? [] : serie.slice(ativos)
    const r = motor.holt(Float64Array.from(util), 1)
    const previsto = util.length ? r[3] : 0
    const sigma = r[2]
    const media = util.length ? util.reduce((a, b) => a + b, 0) / util.length : 0
    return { categoria, previsto, minimo: Math.max(0, previsto - 1.28 * sigma), maximo: previsto + 1.28 * sigma, media, historico: serie }
  }
  const cats = [...new Set(ts.filter((t) => t.tipo === 'despesa').map((t) => t.categoria))]
  // só categorias com gasto em pelo menos 3 dos 6 meses: com menos que isso não há padrão para prever
  const categorias = cats.map((c) => calc(c, serieMensal(ts, meses, c)))
    .filter((p) => p.historico.filter((v) => v > 0).length >= 3)
    .sort((a, b) => b.previsto - a.previsto)
  return { total: calc('Total', serieMensal(ts, meses)), categorias, meses }
}

/**
 * Onde o mês corrente deve fechar: o que já saiu + o que costuma sair do dia de hoje até o fim do mês
 * (média dos 3 meses anteriores para os mesmos dias).
 */
export function fechamentoDoMes(ts: Transacao[], hoje = new Date()) {
  const dia = hoje.getDate()
  const atual = chaveMes(hoje)
  const gastoAteHoje = ts.filter((t) => t.tipo === 'despesa' && t.data.startsWith(atual)).reduce((s, t) => s + t.valor, 0)
  const anteriores = mesesAnteriores(3, hoje)
  const comDados = anteriores.filter((m) => ts.some((t) => t.data.startsWith(m)))
  const restanteMedio = comDados.length
    ? comDados.map((m) => ts.filter((t) => t.tipo === 'despesa' && t.data.startsWith(m) && Number(t.data.slice(8, 10)) > dia).reduce((s, t) => s + t.valor, 0))
        .reduce((a, b) => a + b, 0) / comDados.length
    : 0
  const receitaMedia = comDados.length
    ? comDados.map((m) => ts.filter((t) => t.tipo === 'receita' && t.data.startsWith(m)).reduce((s, t) => s + t.valor, 0)).reduce((a, b) => a + b, 0) / comDados.length
    : 0
  return { gastoAteHoje, restanteMedio, previsto: gastoAteHoje + restanteMedio, receitaMedia }
}

// ── Gastos fora do padrão ──────────────────────────────────────────────────
export interface Anomalia { transacao: Transacao; z: number; vezes: number; mediana: number }

export function anomalias(motor: Motor, ts: Transacao[], hoje = new Date(), diasRecentes = 60): Anomalia[] {
  const desde = iso(new Date(hoje.getFullYear() - 1, hoje.getMonth(), hoje.getDate()))
  const recente = iso(new Date(hoje.getTime() - diasRecentes * 864e5))
  const despesas = ts.filter((t) => t.tipo === 'despesa' && t.data >= desde)
  const cats = [...new Set(despesas.map((t) => t.categoria))]
  const grupo = new Map(cats.map((c, i) => [c, i]))
  const z = motor.zRobusto(Float64Array.from(despesas.map((t) => t.valor)), Int32Array.from(despesas.map((t) => grupo.get(t.categoria)!)), cats.length)
  const medianas = new Map(cats.map((c) => {
    const v = despesas.filter((t) => t.categoria === c).map((t) => t.valor)
    return [c, motor.resumo(Float64Array.from(v))[2]]
  }))
  return despesas
    .map((t, i) => ({ transacao: t, z: z[i], mediana: medianas.get(t.categoria)!, vezes: t.valor / Math.max(1, medianas.get(t.categoria)!) }))
    .filter((a) => a.transacao.data >= recente && a.z > 3.5 && a.transacao.valor >= 30 && a.vezes >= 2)
    .sort((a, b) => b.z - a.z)
    .slice(0, 6)
}

// ── Gastos recorrentes (assinaturas, contas fixas) ─────────────────────────
export interface Recorrencia { descricao: string; categoria: string; valorMedio: number; meses: number; ultimo: string; proximo: string }

export function recorrencias(ts: Transacao[], hoje = new Date()): Recorrencia[] {
  const janela = mesesAnteriores(6, hoje).concat(chaveMes(hoje))
  const grupos = new Map<string, Transacao[]>()
  for (const t of ts) {
    if (t.tipo !== 'despesa' || !janela.some((m) => t.data.startsWith(m))) continue
    const chave = normalizar(t.descricao).split(' ').filter((p) => p.length >= 3 && !PARADAS.has(p)).slice(0, 3).join(' ')
    if (!chave) continue
    grupos.set(chave, [...(grupos.get(chave) ?? []), t])
  }
  const out: Recorrencia[] = []
  for (const [, lista] of grupos) {
    const meses = new Set(lista.map((t) => t.data.slice(0, 7)))
    if (meses.size < 3) continue
    const valores = lista.map((t) => t.valor)
    const media = valores.reduce((a, b) => a + b, 0) / valores.length
    const dp = Math.sqrt(valores.reduce((a, b) => a + (b - media) ** 2, 0) / valores.length)
    if (media <= 0 || dp / media > 0.1 || lista.length > meses.size * 2) continue
    const ordenada = [...lista].sort((a, b) => b.data.localeCompare(a.data))
    const ultimo = ordenada[0].data
    const [a, m, d] = ultimo.split('-').map(Number)
    const prox = new Date(a, m, Math.min(d, new Date(a, m + 1, 0).getDate()))
    out.push({ descricao: ordenada[0].descricao, categoria: ordenada[0].categoria, valorMedio: media, meses: meses.size, ultimo, proximo: iso(prox) })
  }
  return out.sort((a, b) => b.valorMedio - a.valorMedio)
}
