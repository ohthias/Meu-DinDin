import { describe, expect, it } from 'vitest'
import { aliquotaIR, aporteNecessario, INDICADORES_REFERENCIA as ind, posicao, projecao, taxaAnual } from './investimentos'

// Mesmos casos de api/MeuDinDin.Api.Tests/CalculosTests.cs
describe('investimentos', () => {
  it('segue a tabela regressiva de IR', () => {
    expect([100, 181, 500, 800].map(aliquotaIR)).toEqual([0.225, 0.2, 0.175, 0.15])
  })
  it('CDB a 100% do CDI rende o CDI', () => {
    expect(taxaAnual('pos_cdi', 100, ind)).toBeCloseTo(0.1365, 4)
  })
  it('IPCA+ compõe inflação e juro real', () => {
    expect(taxaAnual('ipca', 7, ind)).toBeCloseTo(1.0458 * 1.07 - 1, 10)
  })
  it('poupança rende 0,5% ao mês com Selic acima de 8,5%', () => {
    expect(taxaAnual('poupanca', 0, ind)).toBeCloseTo(Math.pow(1.005, 12) - 1, 10)
  })
  it('aporte necessário atinge o alvo líquido', () => {
    const r = aporteNecessario('CDB', 105, 10000, 24, 1000, ind)
    const fim = projecao('CDB', 105, 1000, r.aporteMensal, 24, ind).at(-1)!
    expect(fim.liquido).toBeGreaterThan(9999)
    expect(fim.liquido).toBeLessThan(10001)
  })
  it('LCI não paga IR', () => {
    const p = posicao({ id: 'x', tipo: 'LCI', valor: 1000, data_aporte: '2025-11-03', indexador: 'pos_cdi', taxa: 92 }, ind, new Date('2026-11-03T12:00:00'))
    expect(p.ir).toBe(0)
    expect(p.liquido).toBeGreaterThan(1100)
  })
})
