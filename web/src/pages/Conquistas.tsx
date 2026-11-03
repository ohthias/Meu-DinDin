import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Check, Lock, RotateCcw, Zap } from 'lucide-react'
import { api } from '../lib/api'
import { hojeIso } from '../lib/format'
import { useDados } from '../lib/hooks'
import { NIVEIS, type Desafio, type ItemLoja } from '../lib/types'
import { Avatar } from '../components/Shell'
import { Barra, Carregando, useToast } from '../components/ui'
import { useSessao } from '../components/Sessao'

const LINK_DESAFIO: Record<number, { to: string; rotulo: string }> = {
  2: { to: '/transacoes', rotulo: 'Registrar transação' },
  3: { to: '/orcamento', rotulo: 'Ver orçamento' },
  5: { to: '/aprender', rotulo: 'Ir para Aprender' },
  6: { to: '/orcamento', rotulo: 'Definir limites' },
}

function tempoRestante(ate: string) {
  const min = Math.round((new Date(ate).getTime() - Date.now()) / 60000)
  return min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${Math.max(1, min)} min`
}

export function Conquistas() {
  const [params, setParams] = useSearchParams()
  const aba = params.get('aba') === 'loja' ? 'loja' : 'progresso'
  const { perfil } = useSessao()
  if (!perfil) return <Carregando />

  const base = NIVEIS[perfil.nivel - 1] ?? 0
  const prox = NIVEIS[perfil.nivel] ?? null
  const boostAtivo = perfil.boost_xp_ate && new Date(perfil.boost_xp_ate) > new Date()

  return (
    <div className="pagina pagina-estreita">
      <header className="pagina-topo"><h1 className="titulo-pagina">Conquistas</h1></header>

      <section className="nivel">
        <div className="nivel-selo" aria-hidden="true">{perfil.nivel}</div>
        <div className="nivel-info">
          <h2>{perfil.titulo}</h2>
          <p>{perfil.xp} XP{prox ? ` · faltam ${prox - perfil.xp} para o nível ${perfil.nivel + 1}` : ' · nível máximo'}</p>
          {prox && <Barra valor={perfil.xp - base} total={prox - base} />}
          {(boostAtivo || perfil.congelamentos > 0) && (
            <p className="nivel-extras">
              {boostAtivo && <span><Zap size={14} aria-hidden="true" /> XP em dobro por mais {tempoRestante(perfil.boost_xp_ate!)}</span>}
              {perfil.congelamentos > 0 && <span>🧊 {perfil.congelamentos} {perfil.congelamentos === 1 ? 'congelamento' : 'congelamentos'}</span>}
            </p>
          )}
        </div>
        <div className="moedas" aria-label={`${perfil.moedas} moedas`}><span className="moeda" aria-hidden="true" />{perfil.moedas}</div>
      </section>

      <div className="segmentado abas" role="tablist">
        <button role="tab" aria-selected={aba === 'progresso'} className={aba === 'progresso' ? 'ativo' : ''} onClick={() => setParams({})}>Desafios e medalhas</button>
        <button role="tab" aria-selected={aba === 'loja'} className={aba === 'loja' ? 'ativo' : ''} onClick={() => setParams({ aba: 'loja' })}>Loja</button>
      </div>

      {aba === 'progresso' ? <Progresso /> : <Loja />}
    </div>
  )
}

function Progresso() {
  const avisar = useToast()
  const { recarregarPerfil } = useSessao()
  const { dados, recarregar } = useDados(async () => {
    const desafios = await api.desafios() // também recalcula os desafios automáticos
    const medalhas = await api.medalhas()
    return { desafios, medalhas }
  })
  if (!dados) return <Carregando />
  const ativos = dados.desafios.filter((d) => !d.concluido)
  const feitos = dados.desafios.filter((d) => d.concluido)

  async function acao(fn: () => Promise<void>, msg: string) {
    try { await fn(); avisar(msg); recarregar(); recarregarPerfil() }
    catch (e) { avisar(e instanceof Error ? e.message : 'Não foi possível concluir.', 'erro') }
  }

  const linha = (d: Desafio) => {
    const feitoHoje = d.ultimo_check === hojeIso()
    const link = LINK_DESAFIO[d.id]
    return (
      <li key={d.id} className={d.concluido ? 'concluido' : ''}>
        <div>
          <strong>{d.titulo}</strong>
          <p>{d.descricao}</p>
          {!d.concluido && <Barra valor={d.dia_atual} total={d.duracao_dias} />}
          <small>
            {d.concluido ? `Concluído · +${d.xp_recompensa} XP` : `${d.dia_atual} de ${d.duracao_dias} ${d.unidade} · +${d.xp_recompensa} XP`}
            {d.modo === 'auto' && !d.concluido ? ' · verificado automaticamente' : ''}
          </small>
        </div>
        {d.concluido ? (
          d.modo === 'checkin'
            ? <button className="btn btn-secundario" onClick={() => acao(() => api.recomecarDesafio(d.id), `"${d.titulo}" recomeçou.`)}><RotateCcw size={16} aria-hidden="true" /> Recomeçar</button>
            : <span className="selo-ok"><Check size={16} aria-hidden="true" /> Feito</span>
        ) : d.modo === 'checkin' ? (
          <button className="btn btn-secundario" disabled={feitoHoje} onClick={() => acao(() => api.avancarDesafio(d.id), 'Check-in feito. Volte amanhã!')}>
            {feitoHoje ? 'Feito hoje' : 'Cumpri hoje'}
          </button>
        ) : link ? <Link to={link.to} className="link-simples">{link.rotulo}</Link> : null}
      </li>
    )
  }

  return (
    <>
      <section className="painel">
        <header className="painel-topo"><h2>Desafios</h2><small className="sutil">Check-in: pular um dia zera a sequência</small></header>
        <ul className="desafios">{ativos.map(linha)}{feitos.map(linha)}</ul>
      </section>

      <section className="painel">
        <header className="painel-topo"><h2>Medalhas</h2><small className="sutil">{dados.medalhas.filter((m) => m.conquistada_em).length} de {dados.medalhas.length} · +50 moedas cada</small></header>
        <ul className="medalhas">
          {dados.medalhas.map((m) => (
            <li key={m.id} className={m.conquistada_em ? 'ganha' : ''}>
              <span className="medalha-emoji" aria-hidden="true">{m.emoji}</span>
              <strong>{m.titulo}</strong>
              <small>{m.descricao}</small>
              <small className="medalha-data">{m.conquistada_em ? `Conquistada em ${new Date(m.conquistada_em).toLocaleDateString('pt-BR')}` : 'Bloqueada'}</small>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

const SECOES: { tipo: ItemLoja['tipo'][]; titulo: string; texto: string }[] = [
  { tipo: ['congelamento', 'boost'], titulo: 'Reforços', texto: 'Itens de uso único que ajudam nos desafios e no XP.' },
  { tipo: ['tema'], titulo: 'Temas', texto: 'Mudam as cores do app inteiro. Troque quando quiser depois de resgatar.' },
  { tipo: ['avatar', 'moldura'], titulo: 'Perfil', texto: 'Personalize como você aparece no topo do app.' },
]

function Loja() {
  const avisar = useToast()
  const { perfil, recarregarPerfil } = useSessao()
  const { dados } = useDados(() => api.loja())
  const [ocupado, setOcupado] = useState<string | null>(null)
  if (!dados || !perfil) return <Carregando />

  const equipado = (i: ItemLoja) =>
    (i.tipo === 'tema' && perfil.tema === i.id) || (i.tipo === 'avatar' && perfil.avatar === i.id) || (i.tipo === 'moldura' && perfil.moldura === i.id)
  const possui = (i: ItemLoja) => perfil.itens_resgatados.includes(i.id)

  async function executar(i: ItemLoja, fn: () => Promise<void>, msg: string) {
    setOcupado(i.id)
    try { await fn(); await recarregarPerfil(); avisar(msg) }
    catch (e) { avisar(e instanceof Error ? e.message : 'Não foi possível concluir.', 'erro') }
    finally { setOcupado(null) }
  }

  return (
    <>
      <p className="loja-dica">Ganhe moedas concluindo módulos em Aprender, desafios, medalhas e subindo de nível.</p>
      {SECOES.map((s) => (
        <section key={s.titulo} className="painel">
          <header className="painel-topo"><h2>{s.titulo}</h2></header>
          <p className="sutil">{s.texto}</p>
          <ul className="loja">
            {dados.filter((i) => s.tipo.includes(i.tipo)).map((i) => {
              const tem = possui(i), eq = equipado(i)
              const falta = i.custo - perfil.moedas
              const equipavel = i.tipo === 'tema' || i.tipo === 'avatar' || i.tipo === 'moldura'
              return (
                <li key={i.id} className={`loja-item ${eq ? 'equipado' : ''}`}>
                  <span className={`loja-icone ${i.tipo === 'tema' ? `amostra-${i.id}` : ''}`} aria-hidden="true">
                    {i.tipo === 'avatar' || i.tipo === 'moldura' ? <Avatar avatar={i.tipo === 'avatar' ? i.id : perfil.avatar} moldura={i.tipo === 'moldura' ? i.id : null} nome={perfil.nome} /> : i.icone}
                  </span>
                  <div className="loja-texto">
                    <strong>{i.nome}</strong>
                    <p>{i.descricao}</p>
                    {i.tipo === 'congelamento' && perfil.congelamentos > 0 && <small>Você tem {perfil.congelamentos}.</small>}
                  </div>
                  <div className="loja-acao">
                    {tem && equipavel ? (
                      eq ? (
                        <button className="btn btn-secundario" disabled={ocupado === i.id}
                          onClick={() => executar(i, () => api.equiparItem(i.tipo as 'tema' | 'avatar' | 'moldura', null), `${i.nome} removido.`)}>
                          <Check size={16} aria-hidden="true" /> Usando
                        </button>
                      ) : (
                        <button className="btn btn-secundario" disabled={ocupado === i.id}
                          onClick={() => executar(i, () => api.equiparItem(i.tipo as 'tema' | 'avatar' | 'moldura', i.id), `${i.nome} ativado.`)}>Usar</button>
                      )
                    ) : (
                      <button className="btn btn-primario" disabled={falta > 0 || ocupado === i.id}
                        onClick={() => executar(i, () => api.comprarItem(i.id), equipavel ? `${i.nome} resgatado e ativado.` : `${i.nome} resgatado.`)}
                        aria-label={`Resgatar ${i.nome} por ${i.custo} moedas`}>
                        {falta > 0 ? <Lock size={15} aria-hidden="true" /> : <span className="moeda" aria-hidden="true" />}{i.custo}
                      </button>
                    )}
                    {!tem && falta > 0 && <small>faltam {falta}</small>}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </>
  )
}
