import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Check, ChevronLeft, Clock, Lightbulb, RotateCcw, Star, TriangleAlert } from 'lucide-react'
import { api } from '../lib/api'
import { APROVACAO, embaralhar, MODULOS, moduloPorId, type Bloco, type Questao } from '../lib/educacao'
import { useDados } from '../lib/hooks'
import type { ProgressoModulo, ResultadoModulo } from '../lib/types'
import { SIMULADORES } from '../components/Simuladores'
import { Barra, Carregando, useToast, Vazio } from '../components/ui'
import { useSessao } from '../components/Sessao'

// ── Lista de módulos ─────────────────────────────────────────────────────
export function Aprender() {
  const { dados } = useDados(() => api.progressoModulos())
  if (!dados) return <Carregando />
  const prog = new Map(dados.map((p) => [p.modulo_id, p]))
  const concluidos = MODULOS.filter((m) => prog.get(m.id)?.concluido_em).length
  const proximo = MODULOS.find((m) => !prog.get(m.id)?.concluido_em)

  return (
    <div className="pagina pagina-estreita">
      <header className="pagina-topo">
        <h1 className="titulo-pagina">Aprender</h1>
      </header>

      <section className="aprender-resumo">
        <div>
          <p><strong>{concluidos} de {MODULOS.length}</strong> módulos concluídos</p>
          <Barra valor={concluidos} total={MODULOS.length} />
        </div>
        {proximo && (
          <Link to={`/aprender/${proximo.id}`} className="btn btn-primario">
            {concluidos ? 'Continuar' : 'Começar'}: {proximo.titulo}
          </Link>
        )}
      </section>

      {(['Básico', 'Intermediário'] as const).map((nivel) => (
        <section key={nivel} className="trilha">
          <h2>{nivel}</h2>
          <ul>
            {MODULOS.filter((m) => m.nivel === nivel).map((m) => (
              <li key={m.id}><CartaoModulo m={m} p={prog.get(m.id)} /></li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function CartaoModulo({ m, p }: { m: (typeof MODULOS)[number]; p?: ProgressoModulo }) {
  const status = p?.perfeito_em ? 'perfeito' : p?.concluido_em ? 'concluido' : p?.tentativas ? 'tentado' : 'novo'
  return (
    <Link to={`/aprender/${m.id}`} className={`modulo-cartao modulo-${status}`}>
      <span className="modulo-emoji" aria-hidden="true">{m.emoji}</span>
      <span className="modulo-corpo">
        <strong>{m.titulo}</strong>
        <span>{m.resumo}</span>
        <small>
          <Clock size={13} aria-hidden="true" /> {m.minutos} min · {m.questoes.length} questões
          {status === 'novo' || status === 'tentado' ? ` · +${m.xp} XP e ${m.moedas} moedas` : ''}
        </small>
      </span>
      <span className="modulo-status">
        {status === 'perfeito' && <><Star size={16} aria-hidden="true" /> {m.questoes.length}/{m.questoes.length}</>}
        {status === 'concluido' && <><Check size={16} aria-hidden="true" /> {p!.melhor_acertos}/{m.questoes.length}</>}
        {status === 'tentado' && <>Melhor: {p!.melhor_acertos}/{m.questoes.length}</>}
        {status === 'novo' && 'Novo'}
      </span>
    </Link>
  )
}

// ── Módulo: lição → quiz → resultado ─────────────────────────────────────
type Fase = { tipo: 'licao'; pagina: number } | { tipo: 'quiz' } | { tipo: 'resultado'; r: ResultadoModulo | null; acertos: number }

export function ModuloEducacao() {
  const { id } = useParams()
  // key: ao ir para o próximo módulo, o estado recomeça do zero
  return <Modulo key={id} id={id ?? ''} />
}

function Modulo({ id }: { id: string }) {
  const m = moduloPorId(id)
  const { dados: progresso } = useDados(() => api.progressoModulos(), [id])
  const [fase, setFase] = useState<Fase>({ tipo: 'licao', pagina: 0 })
  const [tentativa, setTentativa] = useState(0)

  if (!m) return <Vazio titulo="Módulo não encontrado" texto="Volte para a lista de módulos." acao={<Link className="btn btn-secundario" to="/aprender">Ver módulos</Link>} />
  if (!progresso) return <Carregando />
  const p = progresso.find((x) => x.modulo_id === m.id)

  return (
    <div className="pagina pagina-estreita modulo">
      <header className="modulo-topo">
        <Link to="/aprender" className="icone-btn" aria-label="Voltar para os módulos"><ChevronLeft size={22} /></Link>
        <div>
          <small>{m.nivel} · {m.minutos} min</small>
          <h1>{m.titulo}</h1>
        </div>
        <span className="modulo-emoji grande" aria-hidden="true">{m.emoji}</span>
      </header>

      <ol className="etapas" aria-label="Etapas do módulo">
        <li className={fase.tipo === 'licao' ? 'atual' : 'feita'}>Lição</li>
        <li className={fase.tipo === 'quiz' ? 'atual' : fase.tipo === 'resultado' ? 'feita' : ''}>Quiz</li>
        <li className={fase.tipo === 'resultado' ? 'atual' : ''}>Resultado</li>
      </ol>

      {fase.tipo === 'licao' && (
        <Licao paginas={m.licao} pagina={fase.pagina} setPagina={(n) => setFase({ tipo: 'licao', pagina: n })}
          jaConcluido={!!p?.concluido_em} onQuiz={() => { setTentativa((t) => t + 1); setFase({ tipo: 'quiz' }) }} />
      )}
      {fase.tipo === 'quiz' && (
        <Quiz key={tentativa} moduloId={m.id} questoes={m.questoes} onFim={(acertos, r) => setFase({ tipo: 'resultado', acertos, r })} />
      )}
      {fase.tipo === 'resultado' && (
        <Resultado moduloId={m.id} total={m.questoes.length} acertos={fase.acertos} r={fase.r}
          onRefazer={() => { setTentativa((t) => t + 1); setFase({ tipo: 'quiz' }) }}
          onLicao={() => setFase({ tipo: 'licao', pagina: 0 })} />
      )}
    </div>
  )
}

function BlocoLicao({ b }: { b: Bloco }) {
  switch (b.tipo) {
    case 'texto': return <div className="bloco-texto">{b.titulo && <h3>{b.titulo}</h3>}<p>{b.texto}</p></div>
    case 'exemplo': return <div className="bloco-exemplo">{b.titulo && <strong>{b.titulo}</strong>}<p>{b.texto}</p></div>
    case 'dica': return <p className="bloco-dica"><Lightbulb size={18} aria-hidden="true" /><span>{b.texto}</span></p>
    case 'alerta': return <p className="bloco-alerta"><TriangleAlert size={18} aria-hidden="true" /><span>{b.texto}</span></p>
    case 'lista': return <div className="bloco-texto">{b.titulo && <h3>{b.titulo}</h3>}<ul>{b.itens.map((i) => <li key={i}>{i}</li>)}</ul></div>
    case 'simulador': { const S = SIMULADORES[b.simulador]; return <S /> }
  }
}

function Licao({ paginas, pagina, setPagina, onQuiz, jaConcluido }: {
  paginas: Bloco[][]; pagina: number; setPagina: (n: number) => void; onQuiz: () => void; jaConcluido: boolean
}) {
  const ultima = pagina === paginas.length - 1
  const ir = (n: number) => { setPagina(n); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  return (
    <section className="licao" aria-label={`Lição, página ${pagina + 1} de ${paginas.length}`}>
      <div className="licao-pagina" key={pagina}>
        {paginas[pagina].map((b, i) => <BlocoLicao key={i} b={b} />)}
      </div>
      <div className="licao-nav">
        <button className="btn btn-secundario" onClick={() => ir(pagina - 1)} disabled={pagina === 0}>Anterior</button>
        <span className="licao-pontos" aria-hidden="true">{paginas.map((_, i) => <i key={i} className={i === pagina ? 'atual' : ''} />)}</span>
        {ultima ? <button className="btn btn-primario" onClick={onQuiz}>Fazer o quiz</button>
          : <button className="btn btn-primario" onClick={() => ir(pagina + 1)}>Próxima</button>}
      </div>
      {jaConcluido && !ultima && <button className="link-simples" onClick={onQuiz}>Já fiz este módulo: ir direto ao quiz</button>}
    </section>
  )
}

function Quiz({ moduloId, questoes, onFim }: { moduloId: string; questoes: Questao[]; onFim: (acertos: number, r: ResultadoModulo | null) => void }) {
  const avisar = useToast()
  const { recarregarPerfil } = useSessao()
  const qs = useMemo(() => questoes.map(embaralhar), [questoes])
  const [atual, setAtual] = useState(0)
  const [escolha, setEscolha] = useState<number | null>(null)
  const [acertos, setAcertos] = useState(0)
  const [enviando, setEnviando] = useState(false)
  const q = qs[atual]
  const respondida = escolha !== null

  function responder(i: number) {
    if (respondida) return
    setEscolha(i)
    if (i === q.c) setAcertos((a) => a + 1)
  }

  async function proxima() {
    if (atual < qs.length - 1) { setAtual(atual + 1); setEscolha(null); return }
    setEnviando(true)
    try {
      const r = await api.concluirModulo(moduloId, acertos)
      await recarregarPerfil()
      onFim(acertos, r)
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Não foi possível salvar o resultado.', 'erro')
      onFim(acertos, null)
    }
  }

  return (
    <section className="quiz" aria-label={`Questão ${atual + 1} de ${qs.length}`}>
      <div className="quiz-progresso"><span>Questão {atual + 1} de {qs.length}</span><Barra valor={atual + (respondida ? 1 : 0)} total={qs.length} /></div>
      <h2 className="quiz-pergunta" key={atual}>{q.q}</h2>
      <div className={`quiz-opcoes ${respondida ? 'respondida' : ''}`} role="radiogroup" aria-label="Alternativas">
        {q.opts.map((o, i) => {
          const estado = !respondida ? '' : i === q.c ? 'certa' : i === escolha ? 'errada' : 'apagada'
          return (
            <button key={o} role="radio" aria-checked={escolha === i} className={`quiz-opcao ${estado}`} onClick={() => responder(i)} disabled={respondida && i !== escolha && i !== q.c}>
              <span className="quiz-letra" aria-hidden="true">{'ABCD'[i]}</span>{o}
            </button>
          )
        })}
      </div>
      <div aria-live="polite">
        {respondida && (
          <div className={`quiz-feedback ${escolha === q.c ? 'ok' : 'nao'}`}>
            <strong>{escolha === q.c ? 'Isso mesmo.' : 'Não foi dessa vez.'}</strong>
            <p>{q.f}</p>
          </div>
        )}
      </div>
      {respondida && (
        <button className="btn btn-primario btn-largo" onClick={proxima} disabled={enviando} autoFocus>
          {atual < qs.length - 1 ? 'Próxima questão' : enviando ? 'Salvando…' : 'Ver resultado'}
        </button>
      )}
    </section>
  )
}

function Resultado({ moduloId, total, acertos, r, onRefazer, onLicao }: {
  moduloId: string; total: number; acertos: number; r: ResultadoModulo | null; onRefazer: () => void; onLicao: () => void
}) {
  const nav = useNavigate()
  const minimo = Math.ceil(total * APROVACAO)
  const aprovado = r?.aprovado ?? acertos >= minimo
  const idx = MODULOS.findIndex((m) => m.id === moduloId)
  const prox = MODULOS[idx + 1]
  return (
    <section className="resultado">
      <div className={`resultado-nota ${aprovado ? 'ok' : ''}`}>
        <strong>{acertos}<span>/{total}</span></strong>
        <p>{acertos === total ? 'Nota máxima!' : aprovado ? 'Módulo concluído.' : acertos >= minimo - 1 ? `Faltou pouco: são ${minimo} acertos para concluir.` : `São ${minimo} acertos para concluir. Rever a lição ajuda.`}</p>
      </div>
      {r && (r.xp > 0 || r.moedas > 0) && (
        <p className="resultado-premio">+{r.xp} XP · +{r.moedas} moedas{r.perfeito ? ' · bônus de nota máxima' : ''}</p>
      )}
      {r && aprovado && !r.primeira_vez && !r.perfeito && <p className="sutil centro">A recompensa deste módulo já foi recebida. Refazer serve para revisar e buscar a nota máxima.</p>}
      <div className="resultado-acoes">
        {aprovado && prox && <button className="btn btn-primario" onClick={() => nav(`/aprender/${prox.id}`)}>Próximo: {prox.titulo}</button>}
        {!aprovado && <button className="btn btn-primario" onClick={onLicao}>Rever a lição</button>}
        <button className="btn btn-secundario" onClick={onRefazer}><RotateCcw size={16} aria-hidden="true" /> Refazer o quiz</button>
        <Link to="/aprender" className="link-simples">Voltar aos módulos</Link>
      </div>
    </section>
  )
}
