import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useSessao } from '../components/Sessao'
import { useToast } from '../components/ui'

// Mesmas perguntas do onboarding original (o mapeamento das respostas está na função salvar_onboarding).
const PERGUNTAS = [
  { q: 'Qual é a sua principal fonte de renda?', opts: ['Bolsa ou estágio', 'Emprego CLT', 'Freelance ou autônomo', 'Ajuda da família'] },
  { q: 'Qual é seu maior desafio com dinheiro?', opts: ['Gasto mais do que ganho', 'Não consigo poupar', 'Não sei investir', 'Tenho dívidas'] },
  { q: 'Qual é seu objetivo principal?', opts: ['Criar reserva de emergência', 'Juntar para uma viagem ou compra', 'Começar a investir', 'Quitar dívidas'] },
  { q: 'Como você lida com investimentos hoje?', opts: ['Nunca investi', 'Só tenho poupança', 'Conheço renda fixa', 'Invisto em renda variável'] },
  { q: 'Quanto da renda você consegue guardar por mês?', opts: ['Menos de 5%', 'Entre 5% e 10%', 'Entre 10% e 20%', 'Mais de 20%'] },
  { q: 'Quer ajustar algo para ler melhor?', opts: ['Alto contraste', 'Textos maiores', 'Prefiro Libras', 'Está bom assim'] },
]

export function Onboarding() {
  const nav = useNavigate()
  const avisar = useToast()
  const { recarregarPerfil } = useSessao()
  const [passo, setPasso] = useState(0)
  const [resp, setResp] = useState<number[]>([])
  const p = PERGUNTAS[passo]

  async function escolher(i: number) {
    const novas = [...resp.slice(0, passo), i]
    setResp(novas)
    if (passo < PERGUNTAS.length - 1) return setPasso(passo + 1)
    try {
      await api.salvarOnboarding(novas)
      await recarregarPerfil()
      avisar('Perfil configurado. +50 XP')
      nav('/')
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Não foi possível salvar.', 'erro')
    }
  }

  return (
    <div className="auth onboarding">
      <div className="ob-progresso" aria-label={`Pergunta ${passo + 1} de ${PERGUNTAS.length}`}>
        {PERGUNTAS.map((_, i) => <span key={i} className={i <= passo ? 'feito' : ''} />)}
      </div>
      <h1 key={passo}>{p.q}</h1>
      <div className="ob-opcoes">
        {p.opts.map((o, i) => (
          <button key={o} className={`ob-opcao ${resp[passo] === i ? 'ativo' : ''}`} onClick={() => escolher(i)}>{o}</button>
        ))}
      </div>
      {passo > 0 && <button className="link-simples" onClick={() => setPasso(passo - 1)}>Voltar</button>}
    </div>
  )
}
