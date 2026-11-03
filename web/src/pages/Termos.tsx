import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { REGRAS } from '../lib/regras'
import { useSessao } from '../components/Sessao'
import { useToast } from '../components/ui'

/** Texto dos termos em linguagem simples. Mudou algo relevante? Suba `versao_termos` no banco e REGRAS.versaoTermos. */
function TextoTermos() {
  return (
    <div className="termos-texto">
      <section>
        <h2>O que guardamos</h2>
        <ul>
          <li>Seu nome, e-mail e data de nascimento.</li>
          <li>O que você registra: transações, contas, orçamentos, metas e investimentos.</li>
          <li>Se você conectar um banco: saldos e extratos que você autorizou compartilhar.</li>
          <li>Um histórico das alterações que você faz, guardado por 365 dias, para você conferir o que mudou.</li>
        </ul>
      </section>
      <section>
        <h2>Para que usamos</h2>
        <p>Só para mostrar suas finanças, calcular orçamentos, previsões, recomendações e a sua pontuação. Previsões e categorias automáticas são calculadas no seu próprio aparelho.</p>
      </section>
      <section>
        <h2>O que nunca fazemos</h2>
        <ul>
          <li>Não vendemos nem compartilhamos seus dados com anunciantes.</li>
          <li>Não movimentamos dinheiro: o acesso aos bancos é só de leitura.</li>
          <li>Não pedimos nem guardamos a senha do seu banco. A autorização acontece no app do próprio banco.</li>
        </ul>
      </section>
      <section>
        <h2>Quem mais participa</h2>
        <p>Os dados ficam no Supabase, nosso provedor de banco de dados. A conexão com bancos passa por um agregador autorizado de Open Finance, só depois do seu consentimento e só para as contas que você escolher.</p>
      </section>
      <section>
        <h2>Seus direitos</h2>
        <ul>
          <li>Baixar todos os seus dados a qualquer momento, em Perfil → Seus dados.</li>
          <li>Ver o histórico do que foi criado, alterado ou apagado na sua conta.</li>
          <li>Desconectar um banco quando quiser, na tela Contas.</li>
          <li>Excluir a conta: apagamos tudo e encerramos as conexões com bancos.</li>
        </ul>
      </section>
      <section>
        <h2>Regras de uso</h2>
        <ul>
          <li>É preciso ter pelo menos {REGRAS.idadeMinima} anos.</li>
          <li>Cada pessoa só acessa os próprios dados; nem o app nem a API conseguem ler dados de outra conta.</li>
          <li>Há limites para evitar abuso, como até {REGRAS.maxContasManuais} contas manuais e {REGRAS.maxMetasAtivas} metas em andamento.</li>
          <li>O Meu DinDin é uma ferramenta de organização e educação financeira, não consultoria de investimentos.</li>
        </ul>
      </section>
    </div>
  )
}

export function Termos() {
  return (
    <div className="auth termos">
      <Link to="/" className="marca">dindin</Link>
      <h1>Termos de uso e privacidade</h1>
      <p className="sutil">Versão {REGRAS.versaoTermos}. Escrito para ser lido de verdade.</p>
      <TextoTermos />
    </div>
  )
}

/** Tela que aparece quando a pessoa ainda não aceitou a versão atual dos termos. */
export function AceitarTermos() {
  const { perfil, recarregarPerfil } = useSessao()
  const avisar = useToast()
  const nav = useNavigate()
  const [marcado, setMarcado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const atualizacao = (perfil?.termos_versao ?? 0) > 0

  async function aceitar() {
    setEnviando(true)
    try { await api.aceitarTermos(REGRAS.versaoTermos); await recarregarPerfil() }
    catch (e) { avisar(e instanceof Error ? e.message : 'Não foi possível salvar.', 'erro') }
    finally { setEnviando(false) }
  }

  return (
    <div className="auth termos">
      <span className="marca">dindin</span>
      <h1>{atualizacao ? 'Os termos mudaram' : 'Antes de continuar'}</h1>
      <p>{atualizacao ? 'Atualizamos como cuidamos dos seus dados. Leia o resumo abaixo para continuar usando o app.' : 'Para salvar seus dados, precisamos que você leia e aceite como eles são usados.'}</p>
      <TextoTermos />
      <label className="checkbox"><input type="checkbox" checked={marcado} onChange={(e) => setMarcado(e.target.checked)} /> Li e aceito os termos de uso e a política de privacidade</label>
      <button className="btn btn-primario btn-largo" disabled={!marcado || enviando} onClick={aceitar}>{enviando ? 'Salvando…' : 'Aceitar e continuar'}</button>
      <button className="link-simples" onClick={async () => { await api.sair(); nav('/boas-vindas') }}>Sair</button>
    </div>
  )
}
