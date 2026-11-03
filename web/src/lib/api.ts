import { createClient, type Session } from '@supabase/supabase-js'
import type {
  Conexao, Conta, Desafio, Investimento, ItemLoja, Medalha, Meta, NovaTransacao, Notificacao,
  NovoInvestimento, Orcamento, Profile, ProgressoModulo, RegistroAuditoria, ResultadoModulo, TipoItem, Transacao,
} from './types'
import { demoApi } from './demo'
import { REGRAS } from './regras'

export interface SessaoUsuario { id: string; email: string }

/** Tudo o que as telas precisam do backend. Implementado por Supabase ou pelo modo demo. */
export interface Api {
  demo: boolean
  // auth
  sessao(): Promise<SessaoUsuario | null>
  onAuthChange(cb: (u: SessaoUsuario | null) => void): () => void
  entrar(email: string, senha: string): Promise<void>
  cadastrar(nome: string, email: string, senha: string, nascimento: string): Promise<void>
  recuperarSenha(email: string): Promise<void>
  sair(): Promise<void>
  // perfil
  perfil(): Promise<Profile>
  atualizarPerfil(p: Partial<Profile>): Promise<void>
  salvarOnboarding(respostas: number[]): Promise<void>
  // contas & open finance
  conexoes(): Promise<Conexao[]>
  contas(): Promise<Conta[]>
  criarConta(c: Pick<Conta, 'nome' | 'tipo' | 'instituicao' | 'saldo'>): Promise<void>
  excluirConta(id: string): Promise<void>
  ofConnectToken(itemId?: string): Promise<string>
  ofSincronizar(itemId: string): Promise<{ contas: number; transacoes: number; status: string }>
  ofDesconectar(itemId: string): Promise<void>
  onDadosMudaram(cb: () => void): () => void
  // transações
  transacoes(f: { de?: string; ate?: string; contaId?: string; limite?: number }): Promise<Transacao[]>
  criarTransacao(t: NovaTransacao): Promise<void>
  excluirTransacao(id: string): Promise<void>
  alterarCategoria(id: string, categoria: string): Promise<void>
  /** Token da sessão, para chamar a API de análise em C# */
  token(): Promise<string | null>
  // termos e direitos do titular (LGPD)
  aceitarTermos(versao: number): Promise<void>
  exportarMeusDados(): Promise<unknown>
  historico(limite?: number): Promise<RegistroAuditoria[]>
  excluirMinhaConta(confirmacao: string): Promise<void>
  // orçamento
  orcamentos(mes: number, ano: number): Promise<Orcamento[]>
  salvarOrcamento(o: Omit<Orcamento, 'id'>): Promise<void>
  excluirOrcamento(id: string): Promise<void>
  // metas
  metas(): Promise<Meta[]>
  criarMeta(m: Omit<Meta, 'id' | 'valor_atual'>): Promise<void>
  depositarMeta(id: string, valor: number): Promise<void>
  excluirMeta(id: string): Promise<void>
  // investimentos
  investimentos(): Promise<Investimento[]>
  criarInvestimento(i: NovoInvestimento): Promise<void>
  resgatarInvestimento(id: string, valor: number, data: string): Promise<void>
  excluirInvestimento(id: string): Promise<void>
  // gamificação
  desafios(): Promise<Desafio[]>
  avancarDesafio(id: number): Promise<void>
  recomecarDesafio(id: number): Promise<void>
  medalhas(): Promise<Medalha[]>
  notificacoes(): Promise<Notificacao[]>
  marcarLidas(): Promise<void>
  // educação
  progressoModulos(): Promise<ProgressoModulo[]>
  concluirModulo(modulo: string, acertos: number): Promise<ResultadoModulo>
  // loja
  loja(): Promise<ItemLoja[]>
  comprarItem(id: string): Promise<void>
  equiparItem(tipo: Extract<TipoItem, 'tema' | 'avatar' | 'moldura'>, id: string | null): Promise<void>
}

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

function supabaseApi(): Api {
  const sb = createClient(url!, anon!)
  const toUser = (s: Session | null): SessaoUsuario | null => (s ? { id: s.user.id, email: s.user.email ?? '' } : null)
  const ok = <T,>(r: { data: T; error: { message: string } | null }): T => {
    if (r.error) throw new Error(r.error.message)
    return r.data
  }
  const num = <T extends Record<string, unknown>>(rows: T[] | null, ...campos: (keyof T)[]) =>
    (rows ?? []).map((r) => { const c = { ...r }; for (const k of campos) (c as Record<keyof T, unknown>)[k] = r[k] == null ? r[k] : Number(r[k]); return c })
  const uid = async () => (await sb.auth.getUser()).data.user!.id

  async function fn<T>(body: Record<string, unknown>, funcao = 'open-finance'): Promise<T> {
    const { data, error } = await sb.functions.invoke(funcao, { body })
    if (error) {
      const ctx = (error as { context?: Response }).context
      const msg = ctx ? (await ctx.json().catch(() => null))?.error : null
      throw new Error(msg ?? error.message)
    }
    return data as T
  }

  return {
    demo: false,
    async sessao() { return toUser((await sb.auth.getSession()).data.session) },
    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((_e, s) => cb(toUser(s)))
      return () => data.subscription.unsubscribe()
    },
    async entrar(email, senha) {
      const { error } = await sb.auth.signInWithPassword({ email, password: senha })
      if (error) throw new Error(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message)
    },
    async cadastrar(nome, email, senha, nascimento) {
      // o aceite dos termos feito no cadastro vai junto e é gravado pelo banco
      const { error } = await sb.auth.signUp({ email, password: senha, options: { data: { nome, data_nascimento: nascimento, termos_versao: REGRAS.versaoTermos } } })
      if (error) throw new Error(error.message)
    },
    async recuperarSenha(email) {
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/perfil` })
      if (error) throw new Error(error.message)
    },
    async sair() { await sb.auth.signOut() },

    async perfil() { return ok(await sb.from('profiles').select('*').single()) as Profile },
    async atualizarPerfil(p) {
      const { nome, data_nascimento, alto_contraste, texto_grande, reduzir_animacoes, preferencia_libras } = p
      const patch = Object.fromEntries(Object.entries({ nome, data_nascimento, alto_contraste, texto_grande, reduzir_animacoes, preferencia_libras }).filter(([, v]) => v !== undefined))
      ok(await sb.from('profiles').update(patch).eq('id', await uid()))
    },
    async salvarOnboarding(respostas) { ok(await sb.rpc('salvar_onboarding', { respostas })) },

    async conexoes() { return ok(await sb.from('of_conexoes').select('*').order('criado_em')) as Conexao[] },
    async contas() {
      return num(ok(await sb.from('contas').select('*').order('origem').order('nome')), 'saldo', 'limite_credito') as Conta[]
    },
    async criarConta(c) { ok(await sb.from('contas').insert({ ...c, origem: 'manual' })) },
    async excluirConta(id) { ok(await sb.from('contas').delete().eq('id', id)) },
    async ofConnectToken(itemId) { return (await fn<{ accessToken: string }>({ action: 'connect-token', itemId })).accessToken },
    async ofSincronizar(itemId) { return fn({ action: 'sync', itemId }) },
    async ofDesconectar(itemId) { await fn({ action: 'disconnect', itemId }) },
    onDadosMudaram(cb) {
      const ch = sb.channel('dados')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'of_conexoes' }, cb)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'contas' }, cb)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificacoes' }, cb)
        .subscribe()
      return () => { sb.removeChannel(ch) }
    },

    async transacoes({ de, ate, contaId, limite }) {
      let q = sb.from('transacoes').select('*').order('data', { ascending: false }).order('criado_em', { ascending: false })
      if (de) q = q.gte('data', de)
      if (ate) q = q.lte('data', ate)
      if (contaId) q = q.eq('conta_id', contaId)
      q = q.limit(limite ?? 2000)
      return num(ok(await q), 'valor') as Transacao[]
    },
    async criarTransacao(t) { ok(await sb.from('transacoes').insert({ ...t, origem: 'manual' })) },
    async excluirTransacao(id) { ok(await sb.from('transacoes').delete().eq('id', id)) },
    async alterarCategoria(id, categoria) { ok(await sb.from('transacoes').update({ categoria }).eq('id', id)) },
    async token() { return (await sb.auth.getSession()).data.session?.access_token ?? null },
    async aceitarTermos(versao) { ok(await sb.rpc('aceitar_termos', { p_versao: versao })) },
    async exportarMeusDados() { return ok(await sb.rpc('exportar_meus_dados')) },
    async historico(limite = 50) {
      return ok(await sb.from('auditoria').select('id, tabela, operacao, autor, quando, antes, depois').order('quando', { ascending: false }).limit(limite)) as RegistroAuditoria[]
    },
    async excluirMinhaConta(confirmacao) {
      await fn({ action: 'excluir', confirmacao }, 'minha-conta')
      await sb.auth.signOut()
    },

    async orcamentos(mes, ano) {
      return num(ok(await sb.from('orcamentos').select('*').eq('mes', mes).eq('ano', ano).order('categoria')), 'limite') as Orcamento[]
    },
    async salvarOrcamento(o) { ok(await sb.from('orcamentos').upsert(o, { onConflict: 'user_id,categoria,mes,ano' })) },
    async excluirOrcamento(id) { ok(await sb.from('orcamentos').delete().eq('id', id)) },

    async metas() { return num(ok(await sb.from('metas').select('*').order('criado_em')), 'valor_total', 'valor_atual') as Meta[] },
    async criarMeta(m) { ok(await sb.from('metas').insert(m)) },
    async depositarMeta(id, valor) { ok(await sb.rpc('depositar_meta', { p_meta: id, p_valor: valor })) },
    async excluirMeta(id) { ok(await sb.from('metas').delete().eq('id', id)) },

    async investimentos() { return num(ok(await sb.from('investimentos').select('*').order('data_aporte', { ascending: false })), 'valor', 'taxa', 'valor_resgate') as Investimento[] },
    async resgatarInvestimento(id, valor, data) { ok(await sb.rpc('resgatar_investimento', { p_id: id, p_valor: valor, p_data: data })) },
    async criarInvestimento(i) { ok(await sb.from('investimentos').insert(i)) },
    async excluirInvestimento(id) { ok(await sb.from('investimentos').delete().eq('id', id)) },

    async desafios() {
      ok(await sb.rpc('sincronizar_conquistas'))
      const rows = ok(await sb.from('desafios_usuario').select('dia_atual, ultimo_check, concluido, desafios(*)').order('desafio_id'))
      return (rows as unknown as Array<{ dia_atual: number; ultimo_check: string | null; concluido: boolean; desafios: Omit<Desafio, 'dia_atual' | 'ultimo_check' | 'concluido'> }>)
        .map((r) => ({ ...r.desafios, dia_atual: r.dia_atual, ultimo_check: r.ultimo_check, concluido: r.concluido }))
    },
    async avancarDesafio(id) { ok(await sb.rpc('avancar_desafio', { p_desafio: id })) },
    async recomecarDesafio(id) { ok(await sb.rpc('recomecar_desafio', { p_desafio: id })) },
    async medalhas() {
      const [todas, minhas] = await Promise.all([sb.from('medalhas').select('*').order('id'), sb.from('medalhas_usuario').select('*')])
      const m = new Map((ok(minhas) as { medalha_id: number; conquistada_em: string }[]).map((x) => [x.medalha_id, x.conquistada_em]))
      return (ok(todas) as Omit<Medalha, 'conquistada_em'>[]).map((x) => ({ ...x, conquistada_em: m.get(x.id) ?? null }))
    },
    async notificacoes() { return ok(await sb.from('notificacoes').select('*').order('criada_em', { ascending: false }).limit(30)) as Notificacao[] },
    async marcarLidas() { ok(await sb.from('notificacoes').update({ lida: true }).eq('lida', false)) },

    async progressoModulos() { return ok(await sb.from('modulos_usuario').select('*')) as ProgressoModulo[] },
    async concluirModulo(modulo, acertos) {
      return ok(await sb.rpc('concluir_modulo', { p_modulo: modulo, p_acertos: acertos })) as ResultadoModulo
    },
    async loja() { return ok(await sb.from('loja_itens').select('*').order('ordem')) as ItemLoja[] },
    async comprarItem(id) { ok(await sb.rpc('comprar_item', { p_item: id })) },
    async equiparItem(tipo, id) { ok(await sb.rpc('equipar_item', { p_tipo: tipo, p_item: id })) },
  }
}

export const api: Api = url && anon ? supabaseApi() : demoApi()
export const sandbox = (import.meta.env.VITE_OPEN_FINANCE_SANDBOX ?? 'true') !== 'false'
