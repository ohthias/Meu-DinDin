import { describe, expect, it } from 'vitest'
import { hojeIso, iso } from './format'
import { idade, limparTexto, validarConta, validarInvestimento, validarMeta, validarOrcamento, validarPerfil, validarTransacao } from './regras'

// Mesmos casos do teste do banco (supabase/migrations/…regras_de_negocio.sql)
const tx = (o: object) => ({ tipo: 'despesa' as const, valor: 10, categoria: 'Lazer', descricao: '', forma_pagamento: 'Pix', data: hojeIso(), ...o })
const amanha = () => { const d = new Date(); d.setDate(d.getDate() + 1); return iso(d) }

describe('regras de envio', () => {
  it('transação válida passa', () => expect(validarTransacao(tx({}))).toBeNull())
  it.each([
    ['data no futuro', { data: amanha() }, 'futuro'],
    ['data muito antiga', { data: '2015-01-01' }, 'anos atrás'],
    ['valor zero', { valor: 0 }, 'maior que zero'],
    ['valor acima do máximo', { valor: 2_000_000 }, 'valor máximo'],
    ['categoria de receita em despesa', { categoria: 'Salário' }, 'Categoria inválida'],
    ['descrição longa', { descricao: 'a'.repeat(121) }, '120'],
    ['forma inválida', { forma_pagamento: 'Cheque' }, 'Forma'],
  ])('bloqueia %s', (_, o, trecho) => expect(validarTransacao(tx(o))).toContain(trecho))

  it('limpa caracteres de controle e espaços', () => expect(limparTexto('  show\tcom   amigos ')).toBe('show com amigos'))
  it('calcula idade considerando o aniversário', () => expect(idade('2000-12-31', new Date('2026-11-03T12:00:00'))).toBe(25))
  it('exige 16 anos e nome com 2+ letras', () => {
    expect(validarPerfil({ nome: 'A' })).toContain('nome')
    const d = new Date(); d.setFullYear(d.getFullYear() - 10)
    expect(validarPerfil({ nome: 'Ana', data_nascimento: iso(d) })).toContain('16 anos')
  })
  it('limite de contas e nome vazio', () => {
    expect(validarConta({ nome: '   ', instituicao: '', saldo: 0 }, 0)).toContain('nome')
    expect(validarConta({ nome: 'C21', instituicao: '', saldo: 0 }, 20)).toContain('20 contas')
  })
  it('meta com prazo no passado', () => expect(validarMeta({ nome: 'Viagem', valor_total: 1000, prazo: '2020-01-01' }, 0)).toContain('prazo'))
  it('orçamento: categoria de receita e mês distante', () => {
    expect(validarOrcamento({ categoria: 'Salário', limite: 100, mes: 11, ano: 2026 })).toContain('Categoria')
    expect(validarOrcamento({ categoria: 'Lazer', limite: 100, mes: 1, ano: 2020 })).toContain('meses')
  })
  it('investimento: indexador e taxa coerentes', () => {
    const base = { tipo: 'CDB' as const, valor: 100, data_aporte: hojeIso(), indexador: 'pos_cdi' as const, taxa: 110, emissor: '', vencimento: null }
    expect(validarInvestimento(base)).toBeNull()
    expect(validarInvestimento({ ...base, tipo: 'TesouroSelic', indexador: 'pre' })).toContain('Indexador')
    expect(validarInvestimento({ ...base, taxa: 900 })).toContain('Taxa')
    expect(validarInvestimento({ ...base, vencimento: '2020-01-01' })).toContain('vencimento')
  })
})
