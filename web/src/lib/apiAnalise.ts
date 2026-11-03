// Cliente tipado da API de análise em C#. Os tipos vêm do contrato OpenAPI (Swagger):
// `npm run gerar:api` (instantâneo em api/openapi.json) ou `npm run gerar:api:vivo` (API rodando).
import createClient, { type Middleware } from 'openapi-fetch'
import type { components, paths } from './api-analise.gen'
import { api } from './api'

export type Schemas = components['schemas']
const base = import.meta.env.VITE_ANALISE_API_URL as string | undefined

/** A API de análise só é usada quando VITE_ANALISE_API_URL está definida (e fora do modo demonstração). */
export const analiseDisponivel = !!base && !api.demo

const autenticar: Middleware = {
  async onRequest({ request }) {
    const token = await api.token()
    if (token) request.headers.set('Authorization', `Bearer ${token}`)
    return request
  },
}

const cliente = createClient<paths>({ baseUrl: base?.replace(/\/$/, '') ?? '' })
cliente.use(autenticar)

type Problema = { title?: string | null; detail?: string | null; errors?: Record<string, string[]> }
function erro(e: unknown, padrao: string): never {
  const p = e as Problema | undefined
  const campos = p?.errors ? Object.values(p.errors).flat().join(' ') : ''
  throw new Error(campos || p?.detail || p?.title || padrao)
}

export const analise = {
  async indicadores() {
    const { data, error } = await cliente.GET('/api/v1/indicadores')
    if (!data) erro(error, 'Não foi possível obter os indicadores.')
    return data
  },
  async carteira() {
    const { data, error } = await cliente.GET('/api/v1/investimentos/carteira')
    if (!data) erro(error, 'Não foi possível calcular a carteira.')
    return data
  },
  async simular(corpo: Schemas['SimulacaoRequest']) {
    const { data, error } = await cliente.POST('/api/v1/investimentos/simular', { body: corpo })
    if (!data) erro(error, 'Não foi possível simular.')
    return data
  },
  async saude() {
    const { data, error } = await cliente.GET('/api/v1/analise/saude')
    if (!data) erro(error, 'Não foi possível calcular a pontuação.')
    return data
  },
  async previsao() {
    const { data, error } = await cliente.GET('/api/v1/analise/previsao')
    if (!data) erro(error, 'Não foi possível prever os gastos.')
    return data
  },
  async exportar(q: { formato: Schemas['FormatoExtrato']; de: string; ate: string; contaId?: string }) {
    const { data, error, response } = await cliente.GET('/api/v1/extratos/exportar', { params: { query: q }, parseAs: 'blob' })
    if (!data) erro(error, 'Não foi possível exportar.')
    const nome = /filename\*?=(?:UTF-8'')?"?([^";]+)/i.exec(response.headers.get('Content-Disposition') ?? '')?.[1]
    return { arquivo: data as Blob, nome: nome ?? `extrato.${q.formato}` }
  },
}
