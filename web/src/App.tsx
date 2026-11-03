import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { SessaoProvider, useSessao } from './components/Sessao'
import { Shell } from './components/Shell'
import { Carregando, ToastProvider } from './components/ui'
import { BoasVindas, Cadastro, Entrar } from './pages/Auth'
import { AceitarTermos, Termos } from './pages/Termos'
import { REGRAS } from './lib/regras'

// Cada tela vira um pedaço separado do bundle
const pg = <K extends string>(f: () => Promise<Record<K, React.ComponentType>>, k: K) => lazy(() => f().then((m) => ({ default: m[k] })))
const Onboarding = pg(() => import('./pages/Onboarding'), 'Onboarding')
const Inicio = pg(() => import('./pages/Inicio'), 'Inicio')
const Contas = pg(() => import('./pages/Contas'), 'Contas')
const ContaDetalhe = pg(() => import('./pages/Contas'), 'ContaDetalhe')
const Extrato = pg(() => import('./pages/Extrato'), 'Extrato')
const Orcamento = pg(() => import('./pages/Orcamento'), 'Orcamento')
const Metas = pg(() => import('./pages/Metas'), 'Metas')
const Investir = pg(() => import('./pages/Investir'), 'Investir')
const Conquistas = pg(() => import('./pages/Conquistas'), 'Conquistas')
const Perfil = pg(() => import('./pages/Perfil'), 'Perfil')
const Analise = pg(() => import('./pages/Analise'), 'Analise')
const Aprender = pg(() => import('./pages/Aprender'), 'Aprender')
const ModuloEducacao = pg(() => import('./pages/Aprender'), 'ModuloEducacao')

function Protegida({ children }: { children: ReactNode }) {
  const { usuario, perfil, pronto } = useSessao()
  const loc = useLocation()
  if (!pronto) return <Carregando />
  if (!usuario) return <Navigate to="/boas-vindas" replace />
  // Regra de acesso: sem aceitar a versão atual dos termos, nada além desta tela
  if (perfil && (perfil.termos_versao ?? 0) < REGRAS.versaoTermos) return <AceitarTermos />
  if (perfil && !perfil.onboarding_completo && loc.pathname !== '/onboarding') return <Navigate to="/onboarding" replace />
  return children
}

function Publica({ children }: { children: ReactNode }) {
  const { usuario, pronto } = useSessao()
  if (!pronto) return <Carregando />
  return usuario ? <Navigate to="/" replace /> : children
}

export default function App() {
  return (
    <ToastProvider>
      <SessaoProvider>
        <Suspense fallback={<Carregando />}>
        <Routes>
          <Route path="/termos" element={<Termos />} />
          <Route path="/boas-vindas" element={<Publica><BoasVindas /></Publica>} />
          <Route path="/entrar" element={<Publica><Entrar /></Publica>} />
          <Route path="/cadastro" element={<Publica><Cadastro /></Publica>} />
          <Route path="/onboarding" element={<Protegida><Onboarding /></Protegida>} />
          <Route element={<Protegida><Shell /></Protegida>}>
            <Route index element={<Inicio />} />
            <Route path="contas" element={<Contas />} />
            <Route path="contas/:id" element={<ContaDetalhe />} />
            <Route path="transacoes" element={<Extrato />} />
            <Route path="orcamento" element={<Orcamento />} />
            <Route path="metas" element={<Metas />} />
            <Route path="investir" element={<Investir />} />
            <Route path="analise" element={<Analise />} />
            <Route path="aprender" element={<Aprender />} />
            <Route path="aprender/:id" element={<ModuloEducacao />} />
            <Route path="conquistas" element={<Conquistas />} />
            <Route path="perfil" element={<Perfil />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </SessaoProvider>
    </ToastProvider>
  )
}
