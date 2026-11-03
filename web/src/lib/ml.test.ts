import { readFile } from 'node:fs/promises'
import { beforeAll, describe, expect, it } from 'vitest'
import { anomalias, Categorizador, carregarMotor, preverGastos, recorrencias } from './ml'
import type { Transacao } from './types'

let motor: Awaited<ReturnType<typeof carregarMotor>>
beforeAll(async () => { motor = await carregarMotor(() => readFile(new URL('../wasm/motor.wasm', import.meta.url))) })

// Implementação de referência em JS, para conferir o WASM
function holtJs(serie: number[]) {
  let melhor = { sse: Infinity, a: 0, b: 0 }
  for (let ia = 1; ia <= 19; ia++) for (let ib = 1; ib <= 19; ib++) {
    const a = ia * 0.05, b = ib * 0.05
    let n = serie[0], tr = serie[1] - serie[0], sse = 0
    for (let t = 1; t < serie.length; t++) {
      const e = serie[t] - (n + tr); sse += e * e
      const nn = a * serie[t] + (1 - a) * (n + tr); tr = b * (nn - n) + (1 - b) * tr; n = nn
    }
    if (sse < melhor.sse) melhor = { sse, a, b }
  }
  let n = serie[0], tr = serie[1] - serie[0]
  for (let t = 1; t < serie.length; t++) { const nn = melhor.a * serie[t] + (1 - melhor.a) * (n + tr); tr = melhor.b * (nn - n) + (1 - melhor.b) * tr; n = nn }
  return Math.max(0, n + tr)
}

const tx = (data: string, valor: number, categoria: string, descricao = '', tipo: 'despesa' | 'receita' = 'despesa'): Transacao =>
  ({ id: Math.random().toString(36), conta_id: null, origem: 'manual', tipo, valor, categoria, descricao, forma_pagamento: 'Pix', data })

describe('motor WebAssembly', () => {
  it('Holt no WASM bate com a referência em JS', () => {
    for (const serie of [[100, 110, 120, 130, 140, 150], [300, 280, 350, 310, 330, 290], [50, 80, 40, 90, 60, 70]]) {
      expect(motor.holt(Float64Array.from(serie), 1)[3]).toBeCloseTo(holtJs(serie), 6)
    }
  })
  it('Holt segue tendência linear (mesmo caso do teste em C#)', () => {
    const p = motor.holt(Float64Array.from([100, 110, 120, 130, 140, 150]), 1)[3]
    expect(p).toBeGreaterThan(155); expect(p).toBeLessThan(165)
  })
  it('z robusto destaca o valor fora do padrão', () => {
    const z = motor.zRobusto(Float64Array.from([20, 22, 19, 21, 23, 200]), Int32Array.from([0, 0, 0, 0, 0, 0]), 1)
    expect(z[5]).toBeGreaterThan(10)
    expect(Math.abs(z[0])).toBeLessThan(1)
  })
  it('resumo devolve média e mediana', () => {
    const r = motor.resumo(Float64Array.from([1, 2, 3, 4, 100]))
    expect(r[0]).toBeCloseTo(22); expect(r[2]).toBe(3)
  })
})

describe('análises', () => {
  it('categoriza pelas sementes e aprende com o histórico', () => {
    const c = new Categorizador(motor)
    c.treinar([tx('2026-10-01', 30, 'Lazer', 'Bar do Zé'), tx('2026-10-08', 28, 'Lazer', 'Bar do Zé')])
    expect(c.sugerir('Uber *trip')?.categoria).toBe('Transporte')
    expect(c.sugerir('NETFLIX.COM')?.categoria).toBe('Streaming')
    expect(c.sugerir('bar do ze')?.categoria).toBe('Lazer')
    expect(c.sugerir('xyz')).toBeNull()
  })
  it('prevê gasto do próximo mês e acha anomalia e recorrência', () => {
    const hoje = new Date('2026-11-15T12:00:00')
    const ts: Transacao[] = []
    for (let m = 5; m <= 10; m++) {
      const mm = String(m).padStart(2, '0')
      ts.push(tx(`2026-${mm}-05`, 21.9, 'Streaming', 'Spotify'), tx(`2026-${mm}-10`, 300 + m * 10, 'Alimentação', 'Mercado'),
        tx(`2026-${mm}-12`, 25, 'Alimentação', 'Padaria'), tx(`2026-${mm}-20`, 24, 'Alimentação', 'Padaria'))
    }
    ts.push(tx('2026-11-08', 900, 'Alimentação', 'Restaurante de aniversário'))
    const p = preverGastos(motor, ts, hoje)
    expect(p.total.previsto).toBeGreaterThan(450)
    expect(p.categorias[0].categoria).toBe('Alimentação')
    expect(anomalias(motor, ts, hoje)[0]?.transacao.valor).toBe(900)
    expect(recorrencias(ts, hoje).some((r) => r.descricao === 'Spotify')).toBe(true)
  })
})
