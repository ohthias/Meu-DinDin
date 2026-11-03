import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, type SessaoUsuario } from '../lib/api'
import type { Profile } from '../lib/types'

type Ctx = {
  usuario: SessaoUsuario | null
  perfil: Profile | null
  pronto: boolean
  recarregarPerfil: () => Promise<void>
}
const SessaoCtx = createContext<Ctx>({ usuario: null, perfil: null, pronto: false, recarregarPerfil: async () => {} })

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<SessaoUsuario | null>(null)
  const [perfil, setPerfil] = useState<Profile | null>(null)
  const [pronto, setPronto] = useState(false)

  const recarregarPerfil = useCallback(async () => {
    try { setPerfil(await api.perfil()) } catch { setPerfil(null) }
  }, [])

  useEffect(() => {
    api.sessao().then(async (u) => {
      setUsuario(u)
      if (u) await recarregarPerfil()
      setPronto(true)
    })
    return api.onAuthChange(async (u) => {
      setUsuario(u)
      if (u) await recarregarPerfil(); else setPerfil(null)
    })
  }, [recarregarPerfil])

  // Preferências de acessibilidade aplicadas no <html>
  useEffect(() => {
    const h = document.documentElement
    h.classList.toggle('alto-contraste', !!perfil?.alto_contraste)
    h.classList.toggle('texto-grande', !!perfil?.texto_grande)
    h.classList.toggle('sem-animacao', !!perfil?.reduzir_animacoes)
    // tema comprado na loja (alto contraste tem prioridade)
    if (perfil?.tema && perfil.tema !== 'padrao' && !perfil.alto_contraste) h.dataset.tema = perfil.tema
    else delete h.dataset.tema
  }, [perfil])

  return <SessaoCtx.Provider value={{ usuario, perfil, pronto, recarregarPerfil }}>{children}</SessaoCtx.Provider>
}

export const useSessao = () => useContext(SessaoCtx)
