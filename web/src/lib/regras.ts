// Regras de negócio do envio de dados, espelhadas do banco
// (supabase/migrations/20261103040000_regras_de_negocio.sql).
// O banco é quem garante; aqui elas servem para mostrar o erro antes de enviar.
// Cada validador devolve a mensagem do primeiro problema ou null.
import { CATEGORIAS_DESPESA, CATEGORIAS_RECEITA, FORMAS_PAGAMENTO, type TipoTransacao } from './types'
import type { Indexador, TipoProduto } from './investimentos'
import { hojeIso, iso } from './format'

export const REGRAS = {
  versaoTermos: 1,
  idadeMinima: 16,
  valorMaximoTransacao: 1_000_000,
  anosRetroativos: 5,
  maxContasManuais: 20,
  maxMetasAtivas: 20,
  valorMaximoMeta: 10_000_000,
  valorMaximoOrcamento: 1_000_000,
  mesesOrcamento: 12,
  valorMaximoInvestimento: 10_000_000,
  tamanhoDescricao: 120,
} as const

export class ErroDeRegra extends Error {
  campo?: string
  constructor(mensagem: string, campo?: string) { super(mensagem); this.campo = campo }
}

/** Lança ErroDeRegra se houver problema (usado pelo modo demonstração, que faz o papel do banco). */
export function garantir(mensagem: string | null) {
  if (mensagem) throw new ErroDeRegra(mensagem)
}

export const limparTexto = (s: string) => s.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()
const brl = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
const anosAtras = (n: number) => { const d = new Date(); d.setFullYear(d.getFullYear() - n); return iso(d) }

export function idade(nascimento: string, hoje = new Date()) {
  const [a, m, d] = nascimento.split('-').map(Number)
  let anos = hoje.getFullYear() - a
  if (hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d)) anos--
  return anos
}

export function validarPerfil(p: { nome: string; data_nascimento?: string | null }): string | null {
  const nome = limparTexto(p.nome)
  if (nome.length < 2 || nome.length > 60) return 'O nome precisa ter entre 2 e 60 caracteres.'
  if (p.data_nascimento) {
    if (p.data_nascimento < '1900-01-01' || p.data_nascimento > hojeIso()) return 'Data de nascimento inválida.'
    if (idade(p.data_nascimento) < REGRAS.idadeMinima) return `É preciso ter pelo menos ${REGRAS.idadeMinima} anos para usar o Meu DinDin.`
  }
  return null
}

export function validarTransacao(t: { tipo: TipoTransacao; valor: number; categoria: string; descricao: string; forma_pagamento: string; data: string }): string | null {
  if (!(t.valor > 0)) return 'O valor precisa ser maior que zero.'
  if (t.valor > REGRAS.valorMaximoTransacao) return `O valor máximo de uma transação é R$ ${brl(REGRAS.valorMaximoTransacao)}.`
  if (t.data > hojeIso()) return 'A data não pode estar no futuro.'
  if (t.data < anosAtras(REGRAS.anosRetroativos)) return `A data não pode ser de mais de ${REGRAS.anosRetroativos} anos atrás.`
  const cats: readonly string[] = t.tipo === 'despesa' ? CATEGORIAS_DESPESA : CATEGORIAS_RECEITA
  if (!cats.includes(t.categoria)) return 'Categoria inválida para este tipo de transação.'
  if (limparTexto(t.descricao).length > REGRAS.tamanhoDescricao) return `A descrição pode ter até ${REGRAS.tamanhoDescricao} caracteres.`
  if (t.forma_pagamento && !(FORMAS_PAGAMENTO as readonly string[]).includes(t.forma_pagamento)) return 'Forma de pagamento inválida.'
  return null
}

export function validarConta(c: { nome: string; instituicao: string; saldo: number }, quantidadeAtual: number): string | null {
  const nome = limparTexto(c.nome)
  if (!nome || nome.length > 40) return 'O nome da conta precisa ter entre 1 e 40 caracteres.'
  if (limparTexto(c.instituicao).length > 40) return 'A instituição pode ter até 40 caracteres.'
  if (!Number.isFinite(c.saldo) || Math.abs(c.saldo) > 10_000_000) return 'Saldo fora do limite aceito.'
  if (quantidadeAtual >= REGRAS.maxContasManuais) return `Você já tem ${REGRAS.maxContasManuais} contas manuais, o máximo permitido.`
  return null
}

export function validarMeta(m: { nome: string; valor_total: number; prazo: string | null }, ativas: number): string | null {
  const nome = limparTexto(m.nome)
  if (!nome || nome.length > 60) return 'O nome da meta precisa ter entre 1 e 60 caracteres.'
  if (!(m.valor_total > 0)) return 'O valor da meta precisa ser maior que zero.'
  if (m.valor_total > REGRAS.valorMaximoMeta) return 'Valor da meta acima do limite aceito.'
  if (m.prazo) {
    const limite = new Date(); limite.setFullYear(limite.getFullYear() + 50)
    if (m.prazo < hojeIso() || m.prazo > iso(limite)) return 'O prazo precisa ser uma data entre hoje e daqui a 50 anos.'
  }
  if (ativas >= REGRAS.maxMetasAtivas) return `Você já tem ${REGRAS.maxMetasAtivas} metas em andamento. Conclua ou exclua uma para criar outra.`
  return null
}

export function validarDeposito(valor: number): string | null {
  if (!(valor > 0)) return 'O valor precisa ser maior que zero.'
  if (valor > REGRAS.valorMaximoMeta) return 'Valor acima do limite aceito.'
  return null
}

export function validarOrcamento(o: { categoria: string; limite: number; mes: number; ano: number }, hoje = new Date()): string | null {
  if (!(CATEGORIAS_DESPESA as readonly string[]).includes(o.categoria)) return 'Categoria inválida.'
  if (!(o.limite > 0)) return 'O limite precisa ser maior que zero.'
  if (o.limite > REGRAS.valorMaximoOrcamento) return 'Limite acima do valor aceito.'
  const distancia = Math.abs(o.ano * 12 + o.mes - (hoje.getFullYear() * 12 + hoje.getMonth() + 1))
  if (distancia > REGRAS.mesesOrcamento) return `Orçamentos podem ser definidos até ${REGRAS.mesesOrcamento} meses antes ou depois do mês atual.`
  return null
}

const INDEXADORES: Record<TipoProduto, Indexador[]> = {
  Poupanca: ['poupanca'], TesouroSelic: ['selic'], TesouroPrefixado: ['pre'], TesouroIPCA: ['ipca'],
  CDB: ['pos_cdi', 'pre', 'ipca'], LCI: ['pos_cdi', 'pre', 'ipca'], LCA: ['pos_cdi', 'pre', 'ipca'],
}
const FAIXA_TAXA: Record<Indexador, [number, number] | null> = {
  pos_cdi: [1, 200], selic: [50, 150], pre: [0.01, 50], ipca: [0, 30], poupanca: null,
}

export function validarInvestimento(i: { tipo: TipoProduto; valor: number; data_aporte: string; indexador: Indexador; taxa: number; emissor: string; vencimento: string | null }): string | null {
  if (!(i.valor > 0)) return 'Informe o valor aplicado.'
  if (i.valor > REGRAS.valorMaximoInvestimento) return 'Valor acima do limite aceito.'
  if (i.data_aporte > hojeIso()) return 'A data da aplicação não pode estar no futuro.'
  if (i.data_aporte < anosAtras(30)) return 'Data da aplicação muito antiga.'
  if (i.vencimento && i.vencimento <= i.data_aporte) return 'O vencimento precisa ser depois da data da aplicação.'
  if (!INDEXADORES[i.tipo].includes(i.indexador)) return 'Indexador incompatível com o produto.'
  const faixa = FAIXA_TAXA[i.indexador]
  if (faixa && (i.taxa < faixa[0] || i.taxa > faixa[1])) return 'Taxa fora da faixa possível para este tipo de rendimento.'
  if (limparTexto(i.emissor).length > 60) return 'O emissor pode ter até 60 caracteres.'
  return null
}

export function validarResgate(r: { valor: number; data: string; dataAporte: string }): string | null {
  if (!(r.valor >= 0)) return 'Informe o valor recebido.'
  if (r.data < r.dataAporte || r.data > hojeIso()) return 'A data do resgate precisa ficar entre a aplicação e hoje.'
  return null
}
