export type TipoTransacao = 'receita' | 'despesa'
export type Origem = 'manual' | 'open_finance'
export type TipoConta = 'corrente' | 'poupanca' | 'cartao' | 'outro'
export type { TipoProduto as TipoInvestimento } from './investimentos'
import type { Indexador, TipoProduto } from './investimentos'

export interface Profile {
  id: string
  nome: string
  data_nascimento: string | null
  nivel: number
  xp: number
  moedas: number
  titulo: string
  onboarding_completo: boolean
  fonte_renda: string
  desafio_financeiro: string
  objetivo_financeiro: string
  perfil_investidor: string
  nivel_experiencia: string
  porcentagem_poupanca: number
  alto_contraste: boolean
  texto_grande: boolean
  reduzir_animacoes: boolean
  preferencia_libras: boolean
  tema: string
  avatar: string | null
  moldura: string | null
  itens_resgatados: string[]
  congelamentos: number
  boost_xp_ate: string | null
  termos_versao: number | null
  termos_aceitos_em: string | null
}

/** Uma linha do histórico de alterações (tabela auditoria). */
export interface RegistroAuditoria {
  id: number
  tabela: string
  operacao: 'INSERT' | 'UPDATE' | 'DELETE'
  autor: 'usuario' | 'sistema'
  quando: string
  antes: Record<string, unknown> | null
  depois: Record<string, unknown> | null
}

export interface Conexao {
  id: string
  external_item_id: string
  instituicao: string
  instituicao_logo: string | null
  instituicao_cor: string | null
  status: string
  status_detalhe: string | null
  ultima_sync: string | null
}

export interface Conta {
  id: string
  conexao_id: string | null
  origem: Origem
  nome: string
  tipo: TipoConta
  instituicao: string
  numero: string | null
  saldo: number
  limite_credito: number | null
  atualizado_em: string
}

export interface Transacao {
  id: string
  conta_id: string | null
  origem: Origem
  tipo: TipoTransacao
  valor: number
  categoria: string
  descricao: string
  forma_pagamento: string
  data: string // yyyy-mm-dd
}
export type NovaTransacao = Omit<Transacao, 'id' | 'origem'>

export interface Orcamento {
  id: string
  categoria: string
  limite: number
  mes: number
  ano: number
}

export interface Meta {
  id: string
  nome: string
  valor_total: number
  valor_atual: number
  prazo: string | null
  cor: string
}

export interface Investimento {
  id: string
  tipo: TipoProduto
  valor: number
  data_aporte: string
  indexador: Indexador
  taxa: number
  emissor: string
  vencimento: string | null
  liquidez_diaria: boolean
  resgatado_em: string | null
  valor_resgate: number | null
}
export type NovoInvestimento = Pick<Investimento, 'tipo' | 'valor' | 'data_aporte' | 'indexador' | 'taxa' | 'emissor' | 'vencimento' | 'liquidez_diaria'>

export interface Desafio {
  id: number
  titulo: string
  descricao: string
  xp_recompensa: number
  duracao_dias: number
  tipo: string
  modo: 'checkin' | 'auto'
  unidade: string
  dia_atual: number
  ultimo_check: string | null
  concluido: boolean
}

export interface Medalha {
  id: number
  titulo: string
  descricao: string
  emoji: string
  conquistada_em: string | null
}

export interface Notificacao {
  id: string
  titulo: string
  mensagem: string
  tipo: string
  icone: string
  lida: boolean
  criada_em: string
}

export const CATEGORIAS_DESPESA = ['Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Educação', 'Lazer', 'Roupas', 'Streaming', 'Outro'] as const
export const CATEGORIAS_RECEITA = ['Salário', 'Estágio', 'Bolsa', 'Freelance', 'Investimentos', 'Presente', 'Outro'] as const
export const FORMAS_PAGAMENTO = ['Pix', 'Débito', 'Crédito', 'Dinheiro', 'Boleto', 'Transferência'] as const

export const NIVEIS = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5200, 6600]

export type TipoItem = 'tema' | 'avatar' | 'moldura' | 'congelamento' | 'boost'
export interface ItemLoja {
  id: string
  nome: string
  descricao: string
  icone: string
  custo: number
  tipo: TipoItem
}

export interface ProgressoModulo {
  modulo_id: string
  melhor_acertos: number
  tentativas: number
  concluido_em: string | null
  perfeito_em: string | null
}

export interface ResultadoModulo {
  aprovado: boolean
  primeira_vez: boolean
  perfeito: boolean
  xp: number
  moedas: number
}

/** Emoji de cada avatar da loja */
export const AVATARES: Record<string, string> = {
  'avatar-raposa': '🦊', 'avatar-coruja': '🦉', 'avatar-panda': '🐼', 'avatar-foguete': '🚀',
}
