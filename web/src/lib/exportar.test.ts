import { describe, expect, it } from 'vitest'
import { gerarCsv, gerarOfx } from './exportar'
import type { Transacao } from './types'

const t = (o: Partial<Transacao>): Transacao => ({
  id: '11111111-2222-3333-4444-555555555555', conta_id: null, origem: 'manual', tipo: 'despesa', valor: 10,
  categoria: 'Outro', descricao: '', forma_pagamento: 'Pix', data: '2026-11-03', ...o,
})

// Mesmos casos de api/MeuDinDin.Api.Tests/CalculosTests.cs
describe('exportação', () => {
  it('CSV usa ponto e vírgula, vírgula decimal e BOM', () => {
    const csv = gerarCsv([t({ valor: 1234.5, categoria: 'Lazer', descricao: 'Show; com amigos' })], [])
    expect(csv.startsWith('﻿Data;Descrição;')).toBe(true)
    expect(csv).toContain('03/11/2026;"Show; com amigos";Lazer;Saída;-1234,50;Pix;;Manual')
  })
  it('OFX tem cabeçalho, transação e escapa caracteres', () => {
    const ofx = gerarOfx([t({ tipo: 'receita', valor: 75, categoria: 'Freelance', descricao: 'Arte & design', data: '2026-11-02' })], '2026-11-01', '2026-11-30')
    expect(ofx.startsWith('OFXHEADER:100')).toBe(true)
    expect(ofx).toContain('<TRNTYPE>CREDIT<DTPOSTED>20261102<TRNAMT>75.00')
    expect(ofx).toContain('<NAME>Arte &amp; design')
    expect(ofx).toContain('<FITID>11111111222233334444555555555555')
  })
})
