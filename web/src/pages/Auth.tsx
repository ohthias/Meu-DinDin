import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { api } from '../lib/api'
import { REGRAS, validarPerfil } from '../lib/regras'
import { Mao, PessoaMoeda } from '../components/Illustracoes'
import { Campo, useToast } from '../components/ui'

export function BoasVindas() {
  return (
    <div className="auth auth-splash">
      <h1 className="marca-grande">dindin</h1>
      <PessoaMoeda />
      <p className="auth-lema">Seu dinheiro, do jeito que você entende.</p>
      <div className="auth-acoes">
        <Link to="/entrar" className="btn btn-primario btn-largo">Entrar</Link>
        <Link to="/cadastro" className="link-simples">Criar conta</Link>
      </div>
    </div>
  )
}

function Senha({ nome, autoComplete, invalida }: { nome: string; autoComplete: string; invalida?: boolean }) {
  const [ver, setVer] = useState(false)
  return (
    <div className="senha">
      <input name={nome} type={ver ? 'text' : 'password'} autoComplete={autoComplete} required aria-invalid={invalida || undefined} />
      <button type="button" className="icone-btn" onClick={() => setVer(!ver)} aria-label={ver ? 'Ocultar senha' : 'Mostrar senha'}>
        {ver ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  )
}

export function Entrar() {
  const nav = useNavigate()
  const avisar = useToast()
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [email, setEmail] = useState('')

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    if (!String(f.get('email')).includes('@') || !String(f.get('senha'))) return setErro('Preencha e-mail e senha.')
    setEnviando(true)
    try {
      await api.entrar(String(f.get('email')), String(f.get('senha')))
      nav('/')
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível entrar.')
    } finally { setEnviando(false) }
  }

  async function esqueci() {
    if (!email.includes('@')) return setErro('Digite seu e-mail acima para receber o link de redefinição.')
    await api.recuperarSenha(email)
    avisar('Enviamos um link de redefinição para o seu e-mail.')
  }

  return (
    <div className="auth">
      <div className="auth-cabeca">
        <h1>Bem-vindo<br />de volta.</h1>
        <Mao erro={!!erro} />
      </div>
      <form className="form" onSubmit={enviar} noValidate>
        <Campo rotulo="E-mail">
          <input name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Campo>
        <Campo rotulo="Senha" erro={erro}>
          <Senha nome="senha" autoComplete="current-password" invalida={!!erro} />
        </Campo>
        <button className="btn btn-primario btn-largo" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
        <button type="button" className="link-simples" onClick={esqueci}>Esqueci minha senha</button>
      </form>
      <p className="auth-rodape">Ainda não tem conta? <Link to="/cadastro">Criar conta</Link></p>
      {api.demo && <p className="sutil centro">Modo demonstração: qualquer e-mail e senha com 6+ caracteres.</p>}
    </div>
  )
}

export function Cadastro() {
  const nav = useNavigate()
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const senha = String(f.get('senha'))
    if (!String(f.get('email')).includes('@')) return setErro('Informe um e-mail válido.')
    if (!f.get('nascimento')) return setErro('Informe sua data de nascimento.')
    const problema = validarPerfil({ nome: String(f.get('nome')), data_nascimento: String(f.get('nascimento')) })
    if (problema) return setErro(problema)
    if (senha.length < 8) return setErro('A senha precisa ter pelo menos 8 caracteres.')
    if (f.get('termos') !== 'on') return setErro('Para criar a conta, aceite os termos de uso.')
    setEnviando(true)
    try {
      await api.cadastrar(String(f.get('nome')).trim(), String(f.get('email')), senha, String(f.get('nascimento')))
      nav('/onboarding')
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível criar a conta.')
    } finally { setEnviando(false) }
  }

  return (
    <div className="auth">
      <div className="auth-cabeca"><h1>Vamos<br />começar.</h1><Mao /></div>
      <form className="form" onSubmit={enviar} noValidate>
        <Campo rotulo="Nome"><input name="nome" autoComplete="name" required maxLength={60} /></Campo>
        <Campo rotulo="E-mail"><input name="email" type="email" autoComplete="email" required /></Campo>
        <Campo rotulo="Data de nascimento"><input name="nascimento" type="date" autoComplete="bday" required /></Campo>
        <Campo rotulo="Senha" dica="Pelo menos 8 caracteres."><Senha nome="senha" autoComplete="new-password" /></Campo>
        <label className="checkbox">
          <input type="checkbox" name="termos" required />
          <span>Li e aceito os <Link to="/termos" target="_blank" rel="noopener">termos de uso e a política de privacidade</Link>. Tenho {REGRAS.idadeMinima} anos ou mais.</span>
        </label>
        {erro && <p className="campo-msg erro" role="alert">{erro}</p>}
        <button className="btn btn-primario btn-largo" disabled={enviando}>{enviando ? 'Criando…' : 'Criar conta'}</button>
      </form>
      <p className="auth-rodape">Já tem conta? <Link to="/entrar">Entrar</Link></p>
    </div>
  )
}
