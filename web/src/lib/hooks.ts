import { useCallback, useEffect, useState } from 'react'
import { api } from './api'

/** Carrega dados assíncronos e recarrega quando deps mudam ou quando o backend avisa que algo mudou. */
export function useDados<T>(carregar: () => Promise<T>, deps: unknown[] = []) {
  const [dados, setDados] = useState<T | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fn = useCallback(carregar, deps)

  const recarregar = useCallback(async () => {
    setCarregando(true)
    try {
      setDados(await fn())
      setErro(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar.')
    } finally {
      setCarregando(false)
    }
  }, [fn])

  useEffect(() => { recarregar() }, [recarregar])
  useEffect(() => api.onDadosMudaram(recarregar), [recarregar])
  return { dados, erro, carregando, recarregar, setDados }
}

export function useMes() {
  const h = new Date()
  const [m, setM] = useState({ mes: h.getMonth() + 1, ano: h.getFullYear() })
  const mover = (delta: number) =>
    setM(({ mes, ano }) => {
      const d = new Date(ano, mes - 1 + delta, 1)
      return { mes: d.getMonth() + 1, ano: d.getFullYear() }
    })
  return { ...m, mover }
}
