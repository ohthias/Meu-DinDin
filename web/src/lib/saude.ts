// Pontuação de saúde financeira (0–100), explicável por componente.
// A mesma regra está em api/MeuDinDin.Api/Analise/SaudeFinanceira.cs.
import type { Conta, Investimento, Orcamento, Transacao } from './types'
import { mesesAnteriores } from './ml'
import { iso } from './format'

export interface Componente { id: string; nome: string; pontos: number; maximo: number; detalhe: string; dica: string }
export interface Saude { pontuacao: number; faixa: 'Atenção' | 'Em construção' | 'Saudável' | 'Excelente'; componentes: Componente[] }

const ESSENCIAIS = new Set(['Moradia', 'Alimentação', 'Saúde', 'Transporte', 'Educação'])
const lim = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const pct = (v: number) => `${Math.round(v * 100)}%`

export function saudeFinanceira(dados: {
  transacoes: Transacao[]; contas: Conta[]; investimentos: (Investimento & { resgatado_em?: string | null; liquidez_diaria?: boolean })[]; orcamentos: Orcamento[]
}, hoje = new Date()): Saude {
  const { transacoes: ts, contas, orcamentos } = dados
  const investimentos = dados.investimentos.filter((i) => !i.resgatado_em)
  const ultimos3 = mesesAnteriores(3, hoje)
  const ultimos6 = mesesAnteriores(6, hoje)
  const doMes = (m: string, tipo: 'receita' | 'despesa', filtro?: (t: Transacao) => boolean) =>
    ts.filter((t) => t.tipo === tipo && t.data.startsWith(m) && (!filtro || filtro(t))).reduce((s, t) => s + t.valor, 0)

  // 1. Taxa de poupança média dos 3 meses fechados (meta: 20%)
  const rec3 = ultimos3.reduce((s, m) => s + doMes(m, 'receita'), 0)
  const dep3 = ultimos3.reduce((s, m) => s + doMes(m, 'despesa'), 0)
  const taxa = rec3 > 0 ? (rec3 - dep3) / rec3 : 0
  const cPoupanca: Componente = {
    id: 'poupanca', nome: 'Quanto você guarda', maximo: 30, pontos: Math.round(30 * lim(taxa / 0.2)),
    detalhe: rec3 > 0 ? `Nos últimos 3 meses você guardou ${pct(Math.max(0, taxa))} do que entrou.` : 'Sem entradas registradas nos últimos 3 meses.',
    dica: taxa >= 0.2 ? 'Ótimo ritmo. Garanta que o que sobra vá para a reserva ou investimentos.' : 'A referência é guardar 20%. Separe o valor assim que o dinheiro entrar.',
  }

  // 2. Reserva de emergência: dinheiro com liquidez ÷ gasto essencial médio (meta: 6 meses)
  const essencialMedio = ultimos3.reduce((s, m) => s + doMes(m, 'despesa', (t) => ESSENCIAIS.has(t.categoria)), 0) / 3
  const liquido = contas.filter((c) => c.tipo !== 'cartao').reduce((s, c) => s + Math.max(0, c.saldo), 0)
    + investimentos.filter((i) => i.liquidez_diaria ?? i.tipo !== 'TesouroIPCA').reduce((s, i) => s + i.valor, 0)
  const mesesReserva = essencialMedio > 0 ? liquido / essencialMedio : 0
  const cReserva: Componente = {
    id: 'reserva', nome: 'Reserva de emergência', maximo: 20, pontos: Math.round(20 * lim(mesesReserva / 6)),
    detalhe: essencialMedio > 0 ? `Seu dinheiro com resgate rápido cobre ${mesesReserva.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} meses de gastos essenciais.` : 'Registre gastos essenciais para calcular a cobertura.',
    dica: mesesReserva >= 6 ? 'Reserva completa. O que passar disso pode ir para objetivos de longo prazo.' : 'A referência é cobrir de 3 a 6 meses de gastos essenciais.',
  }

  // 3. Orçamento respeitado no mês atual
  const mesAtual = iso(hoje).slice(0, 7)
  const orcMes = orcamentos.filter((o) => o.mes === hoje.getMonth() + 1 && o.ano === hoje.getFullYear())
  const dentro = orcMes.filter((o) => doMes(mesAtual, 'despesa', (t) => t.categoria === o.categoria) <= o.limite).length
  const cOrcamento: Componente = {
    id: 'orcamento', nome: 'Orçamento', maximo: 15, pontos: orcMes.length ? Math.round(15 * (dentro / orcMes.length)) : 0,
    detalhe: orcMes.length ? `${dentro} de ${orcMes.length} categorias dentro do limite neste mês.` : 'Nenhum limite definido neste mês.',
    dica: orcMes.length ? 'Ajuste limites que estouram todo mês para algo realista.' : 'Defina limites em Orçamento para ganhar estes pontos.',
  }

  // 4. Regularidade: meses com registros nos últimos 6
  const comRegistro = ultimos6.filter((m) => ts.some((t) => t.data.startsWith(m))).length
  const cRegularidade: Componente = {
    id: 'regularidade', nome: 'Acompanhamento', maximo: 15, pontos: Math.round(15 * (comRegistro / 6)),
    detalhe: `${comRegistro} dos últimos 6 meses têm movimentações registradas.`,
    dica: comRegistro >= 6 ? 'Histórico completo: as previsões ficam mais precisas.' : 'Conectar o banco pelo Open Finance preenche o histórico sozinho.',
  }

  // 5. Uso do cartão: fatura ÷ renda média mensal (≤ 30% vale tudo)
  const fatura = contas.filter((c) => c.tipo === 'cartao').reduce((s, c) => s + c.saldo, 0)
  const rendaMedia = rec3 / 3
  const usoCartao = rendaMedia > 0 ? fatura / rendaMedia : fatura > 0 ? 1 : 0
  const cCredito: Componente = {
    id: 'credito', nome: 'Uso do cartão', maximo: 10, pontos: Math.round(10 * lim(1 - (usoCartao - 0.3) / 0.7)),
    detalhe: fatura > 0 ? `A fatura atual equivale a ${pct(usoCartao)} da sua renda média.` : 'Sem fatura de cartão registrada.',
    dica: usoCartao <= 0.3 ? 'Fatura sob controle.' : 'Faturas acima de 30% da renda apertam o mês seguinte. Evite o rotativo.',
  }

  // 6. Investimentos e diversificação
  const classes = new Set(investimentos.map((i) => (i.tipo === 'TesouroIPCA' ? 'ipca' : i.tipo === 'TesouroPrefixado' ? 'pre' : 'pos')))
  const cInvest: Componente = {
    id: 'investimentos', nome: 'Investimentos', maximo: 10, pontos: (investimentos.length ? 5 : 0) + (classes.size >= 2 ? 5 : 0),
    detalhe: investimentos.length ? `${investimentos.length} aplicações em ${classes.size} ${classes.size === 1 ? 'tipo' : 'tipos'} de rendimento.` : 'Nenhum investimento registrado.',
    dica: classes.size >= 2 ? 'Diversificado entre tipos de rendimento.' : 'Depois da reserva, misturar pós-fixado e inflação reduz riscos.',
  }

  const componentes = [cPoupanca, cReserva, cOrcamento, cRegularidade, cCredito, cInvest]
  const pontuacao = componentes.reduce((s, c) => s + c.pontos, 0)
  const faixa = pontuacao >= 85 ? 'Excelente' : pontuacao >= 70 ? 'Saudável' : pontuacao >= 40 ? 'Em construção' : 'Atenção'
  return { pontuacao, faixa, componentes }
}
