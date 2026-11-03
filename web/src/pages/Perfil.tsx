import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { Profile } from '../lib/types'
import { useSessao } from '../components/Sessao'
import { Campo, Carregando, useToast } from '../components/ui'
import { SeusDados } from '../components/SeusDados'
import { validarPerfil } from '../lib/regras'

const ACESSIBILIDADE: { campo: keyof Profile; rotulo: string; dica: string }[] = [
  { campo: 'alto_contraste', rotulo: 'Alto contraste', dica: 'Cores mais fortes e bordas mais grossas.' },
  { campo: 'texto_grande', rotulo: 'Textos maiores', dica: 'Aumenta o tamanho de todo o texto.' },
  { campo: 'reduzir_animacoes', rotulo: 'Reduzir animações', dica: 'Remove movimentos e transições.' },
  { campo: 'preferencia_libras', rotulo: 'Preferência por Libras', dica: 'Guardamos para oferecer conteúdo em Libras.' },
]

export function Perfil() {
  const { perfil, usuario, recarregarPerfil } = useSessao()
  const avisar = useToast()
  const nav = useNavigate()
  const [salvando, setSalvando] = useState(false)
  if (!perfil) return <Carregando />

  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const dados = { nome: String(f.get('nome')).trim(), data_nascimento: String(f.get('nascimento')) || null }
    const problema = validarPerfil(dados)
    if (problema) return avisar(problema, 'erro')
    setSalvando(true)
    try {
      await api.atualizarPerfil(dados)
      await recarregarPerfil(); avisar('Perfil salvo.')
    } catch (err) { avisar(err instanceof Error ? err.message : 'Erro ao salvar.', 'erro') }
    finally { setSalvando(false) }
  }

  async function alternar(campo: keyof Profile, valor: boolean) {
    await api.atualizarPerfil({ [campo]: valor })
    await recarregarPerfil()
  }

  return (
    <div className="pagina pagina-estreita">
      <header className="pagina-topo"><h1 className="titulo-pagina">Perfil</h1></header>

      <section className="painel">
        <form className="form" onSubmit={salvar}>
          <Campo rotulo="Nome"><input name="nome" defaultValue={perfil.nome} required maxLength={60} /></Campo>
          <div className="grade-2">
            <Campo rotulo="E-mail"><input value={usuario?.email ?? ''} disabled /></Campo>
            <Campo rotulo="Data de nascimento"><input name="nascimento" type="date" defaultValue={perfil.data_nascimento ?? ''} /></Campo>
          </div>
          <button className="btn btn-primario" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar perfil'}</button>
        </form>
      </section>

      <section className="painel">
        <header className="painel-topo"><h2>Seu perfil financeiro</h2></header>
        <dl className="dados-perfil">
          <div><dt>Fonte de renda</dt><dd>{perfil.fonte_renda || '—'}</dd></div>
          <div><dt>Maior desafio</dt><dd>{perfil.desafio_financeiro || '—'}</dd></div>
          <div><dt>Objetivo</dt><dd>{perfil.objetivo_financeiro || '—'}</dd></div>
          <div><dt>Perfil de investidor</dt><dd>{perfil.perfil_investidor}</dd></div>
        </dl>
        <button className="link-simples" onClick={() => nav('/onboarding')}>Refazer questionário</button>
      </section>

      <section className="painel">
        <header className="painel-topo"><h2>Acessibilidade</h2></header>
        <ul className="interruptores">
          {ACESSIBILIDADE.map(({ campo, rotulo, dica }) => (
            <li key={campo}>
              <label>
                <span><strong>{rotulo}</strong><small>{dica}</small></span>
                <input type="checkbox" role="switch" checked={!!perfil[campo]} onChange={(e) => alternar(campo, e.target.checked)} />
              </label>
            </li>
          ))}
        </ul>
      </section>

      <SeusDados />

      <button className="btn btn-secundario btn-largo" onClick={async () => { await api.sair(); nav('/boas-vindas') }}>Sair da conta</button>
    </div>
  )
}
