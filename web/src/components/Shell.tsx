import { Suspense, useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Activity, Bell, Ellipsis, GraduationCap, Home, Landmark, ListOrdered, PiggyBank, Target, Trophy, UserRound, Sprout } from 'lucide-react'
import { AVATARES } from '../lib/types'
import { api } from '../lib/api'
import { useDados } from '../lib/hooks'
import { useSessao } from './Sessao'
import { Carregando } from './ui'

const NAV = [
  { to: '/', rotulo: 'Início', Icone: Home },
  { to: '/contas', rotulo: 'Contas', Icone: Landmark },
  { to: '/transacoes', rotulo: 'Extrato', Icone: ListOrdered },
  { to: '/orcamento', rotulo: 'Orçamento', Icone: PiggyBank },
  { to: '/analise', rotulo: 'Análise', Icone: Activity },
  { to: '/metas', rotulo: 'Metas', Icone: Target },
  { to: '/investir', rotulo: 'Investir', Icone: Sprout },
  { to: '/aprender', rotulo: 'Aprender', Icone: GraduationCap },
  { to: '/conquistas', rotulo: 'Conquistas', Icone: Trophy },
]
const NO_CELULAR = ['/', '/transacoes', '/aprender', '/orcamento']
const NAV_MOBILE = NO_CELULAR.map((to) => NAV.find((n) => n.to === to)!)
const NAV_MAIS = [...NAV.filter((n) => !NO_CELULAR.includes(n.to)), { to: '/perfil', rotulo: 'Perfil', Icone: UserRound }]

/** Avatar do topo: emoji comprado na loja ou a inicial do nome, com moldura opcional. */
export function Avatar({ avatar, moldura, nome }: { avatar: string | null; moldura: string | null; nome: string }) {
  const emoji = avatar ? AVATARES[avatar] : null
  return (
    <span className={`avatar ${emoji ? 'avatar-emoji' : ''} ${moldura ? 'avatar-moldura' : ''}`}>
      {emoji ?? nome?.[0]?.toUpperCase() ?? '·'}
    </span>
  )
}

export function Shell() {
  const { perfil } = useSessao()
  const [notifAberto, setNotifAberto] = useState(false)
  const [maisAberto, setMaisAberto] = useState(false)
  const loc = useLocation()
  useEffect(() => { setNotifAberto(false); setMaisAberto(false) }, [loc.pathname])

  return (
    <div className="app">
      <a className="pular" href="#conteudo">Pular para o conteúdo</a>
      {api.demo && (
        <p className="faixa-demo">Modo demonstração: os dados ficam só nesta aba. Configure o Supabase em <code>.env.local</code> para salvar de verdade.</p>
      )}
      <header className="topo">
        <NavLink to="/" className="marca" aria-label="Meu DinDin, início">dindin</NavLink>
        <nav className="nav-pilula" aria-label="Principal">
          {NAV.map(({ to, rotulo, Icone }) => (
            <NavLink key={to} to={to} end={to === '/'} className="nav-item">
              <Icone size={17} aria-hidden="true" /><span>{rotulo}</span>
            </NavLink>
          ))}
        </nav>
        <div className="topo-acoes">
          <Notificacoes aberto={notifAberto} setAberto={setNotifAberto} />
          <NavLink to="/conquistas?aba=loja" className="moedas-topo" aria-label={`${perfil?.moedas ?? 0} moedas. Abrir loja`}>
            <span className="moeda" aria-hidden="true" />{perfil?.moedas ?? 0}
          </NavLink>
          <NavLink to="/perfil" className="avatar-link" aria-label="Seu perfil">
            <Avatar avatar={perfil?.avatar ?? null} moldura={perfil?.moldura ?? null} nome={perfil?.nome ?? ''} />
          </NavLink>
        </div>
      </header>

      <main id="conteudo" className="conteudo">
        <Suspense fallback={<Carregando />}><Outlet /></Suspense>
      </main>

      <nav className="nav-inferior" aria-label="Principal">
        {NAV_MOBILE.map(({ to, rotulo, Icone }) => (
          <NavLink key={to} to={to} end={to === '/'} className="nav-inf-item">
            <Icone size={22} aria-hidden="true" /><span>{rotulo}</span>
          </NavLink>
        ))}
        <button className={`nav-inf-item ${NAV_MAIS.some((n) => loc.pathname.startsWith(n.to)) ? 'active' : ''}`}
          onClick={() => setMaisAberto((v) => !v)} aria-expanded={maisAberto} aria-controls="menu-mais">
          <Ellipsis size={22} aria-hidden="true" /><span>Mais</span>
        </button>
        {maisAberto && (
          <div id="menu-mais" className="menu-mais">
            {NAV_MAIS.map(({ to, rotulo, Icone }) => (
              <NavLink key={to} to={to} className="menu-mais-item"><Icone size={20} aria-hidden="true" />{rotulo}</NavLink>
            ))}
          </div>
        )}
      </nav>
    </div>
  )
}

function Notificacoes({ aberto, setAberto }: { aberto: boolean; setAberto: (v: boolean) => void }) {
  const { dados, recarregar } = useDados(() => api.notificacoes())
  const naoLidas = dados?.filter((n) => !n.lida).length ?? 0
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setAberto(false) }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [aberto, setAberto])

  const abrir = async () => {
    setAberto(!aberto)
    if (!aberto && naoLidas) { await api.marcarLidas(); setTimeout(recarregar, 1500) }
  }
  return (
    <div className="notif" ref={ref}>
      <button className="icone-btn sino" onClick={abrir} aria-expanded={aberto}
        aria-label={naoLidas ? `Notificações, ${naoLidas} novas` : 'Notificações'}>
        <Bell size={20} />
        {naoLidas > 0 && <span className="ponto" aria-hidden="true">{naoLidas}</span>}
      </button>
      {aberto && (
        <div className="notif-painel">
          <h2>Notificações</h2>
          {!dados?.length ? <p className="sutil">Nada por aqui ainda.</p> : (
            <ul>
              {dados.map((n) => (
                <li key={n.id} className={n.lida ? '' : 'nova'}>
                  <span className="notif-icone" aria-hidden="true">{n.icone}</span>
                  <div><strong>{n.titulo}</strong>{n.mensagem && <p>{n.mensagem}</p>}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

