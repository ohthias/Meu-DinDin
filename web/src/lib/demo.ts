// Backend em memória usado quando o Supabase não está configurado.
// Permite navegar por todas as telas com dados de exemplo.
import type { Api } from './api'
import type { Conexao, Conta, Desafio, Investimento, ItemLoja, Medalha, Meta, Notificacao, Orcamento, Profile, ProgressoModulo, RegistroAuditoria, Transacao } from './types'
import { NIVEIS } from './types'
import { iso } from './format'
import { garantir, REGRAS, validarConta, validarDeposito, validarInvestimento, validarMeta, validarOrcamento, validarPerfil, validarResgate, validarTransacao } from './regras'

const id = () => Math.random().toString(36).slice(2, 10)
const hoje = new Date()
const dia = (offset: number) => {
  const d = new Date(hoje); d.setDate(d.getDate() - offset)
  return iso(d)
}

export function demoApi(): Api {
  let logado = false
  const listeners = new Set<(u: { id: string; email: string } | null) => void>()
  const dataListeners = new Set<() => void>()
  const emitir = () => dataListeners.forEach((f) => f())

  const profile: Profile = {
    id: 'demo', nome: 'Sam', data_nascimento: '2002-04-12', nivel: 3, xp: 340, moedas: 320, titulo: 'Economizador',
    onboarding_completo: true, fonte_renda: 'Estágio', desafio_financeiro: 'Não consegue poupar',
    objetivo_financeiro: 'Reserva de emergência', perfil_investidor: 'Moderado', nivel_experiencia: 'Intermediário',
    porcentagem_poupanca: 15, alto_contraste: false, texto_grande: false, reduzir_animacoes: false, preferencia_libras: false,
    tema: 'padrao', avatar: null, moldura: null, itens_resgatados: [], congelamentos: 0, boost_xp_ate: null,
    termos_versao: REGRAS.versaoTermos, termos_aceitos_em: new Date().toISOString(),
  }
  const conexoes: Conexao[] = []
  const contas: Conta[] = [
    { id: 'c1', conexao_id: null, origem: 'manual', nome: 'Carteira', tipo: 'outro', instituicao: 'Dinheiro', numero: null, saldo: 86.5, limite_credito: null, atualizado_em: new Date().toISOString() },
  ]
  // Datas relativas ao mês atual: m = meses atrás, d = dia do mês (limitado a hoje no mês corrente)
  const data = (m: number, d: number) => {
    const ref = new Date(hoje.getFullYear(), hoje.getMonth() - m, 1)
    const ultimo = m === 0 ? hoje.getDate() : new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate()
    ref.setDate(Math.min(d, ultimo))
    return iso(ref)
  }
  const t = (m: number, d: number, tipo: 'receita' | 'despesa', valor: number, categoria: string, descricao: string, forma = 'Pix', conta: string | null = null): Transacao =>
    ({ id: id(), conta_id: conta, origem: 'manual', tipo, valor, categoria, descricao, forma_pagamento: forma, data: data(m, d) })
  const transacoes: Transacao[] = []
  for (let m = 0; m < 6; m++) {
    const f = 1 + ((m * 7) % 5) / 10
    transacoes.push(
      t(m, 1, 'receita', 1450, 'Estágio', 'Bolsa estágio'),
      t(m, 1, 'despesa', 650, 'Moradia', 'Aluguel do quarto'),
      t(m, 2, 'despesa', Math.round(58.4 * f * 100) / 100, 'Alimentação', 'Mercado'),
      t(m, 2, 'despesa', 21.9, 'Streaming', 'Assinatura de música', 'Crédito'),
      t(m, 3, 'despesa', 32.9, 'Transporte', 'Recarga do bilhete único'),
    )
    if (m > 0) transacoes.push(
      t(m, 9, 'despesa', Math.round(120 * f), 'Alimentação', 'Mercado do mês'),
      t(m, 14, 'despesa', Math.round(90 * f), 'Lazer', 'Show com a turma', 'Crédito'),
      t(m, 20, 'despesa', 39.9, 'Saúde', 'Farmácia', 'Débito'),
      t(m, 24, 'despesa', 27 * f, 'Alimentação', 'Lanche pós-aula'),
    )
  }
  transacoes.push(
    t(0, 3, 'despesa', 4.5, 'Alimentação', 'Café da esquina', 'Dinheiro', 'c1'),
    t(0, 3, 'despesa', 118, 'Lazer', 'Ingresso do festival', 'Crédito'),
    t(0, 2, 'receita', 75, 'Freelance', 'Arte para perfil de loja'),
    t(1, 18, 'receita', 120, 'Freelance', 'Edição de vídeo'),
    t(3, 11, 'despesa', 260, 'Roupas', 'Tênis', 'Crédito'),
    t(4, 6, 'despesa', 89, 'Educação', 'Curso online', 'Crédito'),
  )
  const mes = hoje.getMonth() + 1, ano = hoje.getFullYear()
  const orcamentos: Orcamento[] = [
    { id: id(), categoria: 'Alimentação', limite: 200, mes, ano },
    { id: id(), categoria: 'Lazer', limite: 120, mes, ano },
    { id: id(), categoria: 'Moradia', limite: 680, mes, ano },
    { id: id(), categoria: 'Transporte', limite: 100, mes, ano },
  ]
  const metas: Meta[] = [
    { id: id(), nome: 'Reserva de emergência', valor_total: 3000, valor_atual: 1240, prazo: `${ano + 1}-06-30`, cor: '#F5B400' },
    { id: id(), nome: 'Notebook novo', valor_total: 4200, valor_atual: 900, prazo: `${ano + 1}-02-28`, cor: '#24408E' },
  ]
  const investimentos: Investimento[] = [
    { id: id(), tipo: 'TesouroSelic', valor: 900, data_aporte: dia(240), indexador: 'selic', taxa: 100, emissor: 'Tesouro Nacional', vencimento: '2031-03-01', liquidez_diaria: true, resgatado_em: null, valor_resgate: null },
    { id: id(), tipo: 'CDB', valor: 400, data_aporte: dia(150), indexador: 'pos_cdi', taxa: 110, emissor: 'Banco Exemplo', vencimento: '2028-11-03', liquidez_diaria: true, resgatado_em: null, valor_resgate: null },
    { id: id(), tipo: 'TesouroIPCA', valor: 300, data_aporte: dia(60), indexador: 'ipca', taxa: 7.2, emissor: 'Tesouro Nacional', vencimento: '2035-05-15', liquidez_diaria: false, resgatado_em: null, valor_resgate: null },
  ]
  const D = (id: number, titulo: string, descricao: string, xp_recompensa: number, duracao_dias: number, modo: Desafio['modo'], unidade = 'dias', dia_atual = 0, ultimo_check: string | null = null, concluido = false): Desafio =>
    ({ id, titulo, descricao, xp_recompensa, duracao_dias, tipo: '', modo, unidade, dia_atual, ultimo_check, concluido })
  const desafios: Desafio[] = [
    D(1, '7 dias sem delivery', 'Não peça delivery por 7 dias seguidos. Faça o check-in a cada dia cumprido.', 150, 7, 'checkin', 'dias', 4, dia(1)),
    D(2, 'Registrar 30 dias seguidos', 'Registre pelo menos uma transação por dia. A sequência é contada automaticamente.', 300, 30, 'auto'),
    D(3, 'Guardar 10% da renda', 'Termine um mês guardando pelo menos 10% do que entrou. Calculado pelo seu extrato.', 200, 10, 'auto', '%'),
    D(4, 'Semana sem compras supérfluas', 'Uma semana só com gastos essenciais. Faça o check-in a cada dia cumprido.', 100, 7, 'checkin', 'dias', 7, dia(9), true),
    D(5, 'Estudante dedicado', 'Conclua 3 módulos de educação financeira.', 150, 3, 'auto', 'módulos'),
    D(6, 'Orçamento montado', 'Defina limite para 3 categorias no mês atual.', 100, 3, 'auto', 'categorias'),
  ]
  const M = (id: number, titulo: string, descricao: string, emoji: string, conquistada_em: string | null = null): Medalha => ({ id, titulo, descricao, emoji, conquistada_em })
  const medalhas: Medalha[] = [
    M(1, 'Primeira meta', 'Criou sua primeira meta.', '🏅', dia(60)),
    M(2, '7 dias seguidos', 'Registrou transações 7 dias seguidos.', '🔥'),
    M(3, 'Economista', 'Fechou 3 meses seguidos com mais entradas do que saídas.', '🏆'),
    M(4, 'Banco conectado', 'Conectou uma conta via Open Finance.', '🔗'),
    M(5, 'Investidor', 'Fez o primeiro investimento.', '📈', dia(120)),
    M(6, 'Nível 10', 'Atingiu o nível 10.', '🚀'),
    M(7, 'Primeira lição', 'Concluiu o primeiro módulo de educação.', '📚', dia(20)),
    M(8, 'Formado', 'Concluiu todos os módulos de educação.', '🎓'),
    M(9, 'Meta alcançada', 'Completou o valor de uma meta.', '🎯'),
    M(10, 'Desafiante', 'Concluiu o primeiro desafio.', '💪', dia(9)),
    M(11, 'Colecionador', 'Fez a primeira troca na loja.', '🛍️'),
    M(12, 'Nota 10', 'Acertou todas as questões de um módulo.', '⭐'),
  ]
  const L = (id: string, nome: string, descricao: string, icone: string, custo: number, tipo: ItemLoja['tipo']): ItemLoja => ({ id, nome, descricao, icone, custo, tipo })
  const loja: ItemLoja[] = [
    L('tema-noturno', 'Tema noturno', 'Fundo escuro para usar à noite sem cansar a vista.', '🌙', 250, 'tema'),
    L('tema-menta', 'Tema menta', 'Troca o mostarda por um verde fresco em todo o app.', '🌿', 180, 'tema'),
    L('tema-lavanda', 'Tema lavanda', 'Destaques em lilás, com o mesmo fundo creme.', '💜', 180, 'tema'),
    L('avatar-raposa', 'Avatar raposa', 'Troca a inicial do seu perfil por uma raposa.', '🦊', 90, 'avatar'),
    L('avatar-coruja', 'Avatar coruja', 'Para quem estuda finanças de madrugada.', '🦉', 90, 'avatar'),
    L('avatar-panda', 'Avatar panda', 'Calmo e econômico.', '🐼', 90, 'avatar'),
    L('avatar-foguete', 'Avatar foguete', 'Para quem está subindo de nível rápido.', '🚀', 120, 'avatar'),
    L('moldura-ouro', 'Moldura dourada', 'Um anel dourado em volta do seu avatar.', '💎', 400, 'moldura'),
    L('congelar', 'Congelar sequência', 'Salva um desafio de check-in se você esquecer um dia. Acumulável.', '🧊', 60, 'congelamento'),
    L('xp-dobro', 'XP em dobro (24 h)', 'Todo XP ganho nas próximas 24 horas conta em dobro.', '⚡', 140, 'boost'),
  ]
  const MODULOS_DB: Record<string, { total: number; xp: number; moedas: number; titulo: string }> = {
    orcamento: { total: 6, xp: 60, moedas: 15, titulo: 'Orçamento pessoal' }, reserva: { total: 6, xp: 60, moedas: 15, titulo: 'Reserva de emergência' },
    'juros-compostos': { total: 6, xp: 70, moedas: 20, titulo: 'Juros compostos' }, 'primeiro-emprego': { total: 6, xp: 70, moedas: 20, titulo: 'Primeiro emprego e estágio' },
    investimentos: { total: 6, xp: 80, moedas: 20, titulo: 'Primeiros investimentos' }, inflacao: { total: 5, xp: 70, moedas: 20, titulo: 'Inflação e poder de compra' },
    credito: { total: 6, xp: 80, moedas: 20, titulo: 'Crédito consciente' }, dividas: { total: 5, xp: 80, moedas: 20, titulo: 'Saindo das dívidas' },
    golpes: { total: 6, xp: 80, moedas: 25, titulo: 'Pix e golpes digitais' }, 'open-finance': { total: 5, xp: 70, moedas: 20, titulo: 'Open Finance e seus dados' },
  }
  const progresso: ProgressoModulo[] = [
    { modulo_id: 'orcamento', melhor_acertos: 5, tentativas: 1, concluido_em: dia(20), perfeito_em: null },
  ]
  const notificacoes: Notificacao[] = [
    { id: id(), titulo: 'Perfil configurado! 🎯', mensagem: 'Seu perfil foi personalizado.', tipo: 'conquista', icone: '🎯', lida: false, criada_em: new Date().toISOString() },
  ]

  // Histórico de alterações (no Supabase, quem grava é o gatilho de auditoria)
  const auditoria: RegistroAuditoria[] = []
  const auditar = (tabela: string, operacao: RegistroAuditoria['operacao'], antes: object | null, depois: object | null) =>
    auditoria.unshift({ id: auditoria.length + 1, tabela, operacao, autor: 'usuario', quando: new Date().toISOString(), antes: antes as Record<string, unknown>, depois: depois as Record<string, unknown> })
  const termosEmDia = () => garantir((profile.termos_versao ?? 0) >= REGRAS.versaoTermos ? null : 'Aceite os termos de uso para salvar dados.')

  const notificar = (titulo: string, mensagem: string, icone: string) =>
    notificacoes.unshift({ id: id(), titulo, mensagem, tipo: 'conquista', icone, lida: false, criada_em: new Date().toISOString() })
  const xp = (n: number) => {
    const ganho = profile.boost_xp_ate && new Date(profile.boost_xp_ate) > new Date() ? n * 2 : n
    profile.xp += ganho
    const nivel = NIVEIS.filter((m) => profile.xp >= m).length
    if (nivel > profile.nivel) {
      profile.moedas += 30 * (nivel - profile.nivel)
      notificar(`🚀 Subiu para Nível ${nivel}!`, `Você ganhou ${30 * (nivel - profile.nivel)} moedas para gastar na loja.`, '🚀')
      if (nivel >= 10) medalha(6)
    }
    profile.nivel = nivel
    return ganho
  }
  const medalha = (mid: number) => {
    const m = medalhas.find((x) => x.id === mid)!
    if (m.conquistada_em) return
    m.conquistada_em = new Date().toISOString(); profile.moedas += 50
    notificar(`${m.emoji} Medalha desbloqueada: ${m.titulo}!`, m.descricao, m.emoji)
  }
  const premiar = (d: Desafio) => {
    d.concluido = true; d.dia_atual = d.duracao_dias
    const g = xp(d.xp_recompensa); profile.moedas += d.xp_recompensa / 2
    notificar(`🏆 Desafio concluído: ${d.titulo}!`, `+${g} XP e +${d.xp_recompensa / 2} moedas.`, '🏆')
    medalha(10)
  }
  const sequencia = () => {
    const dias = new Set(transacoes.filter((t) => t.origem === 'manual').map((t) => t.data))
    let n = 0, d = 0
    if (!dias.has(dia(0))) d = 1
    while (dias.has(dia(d))) { n++; d++ }
    return n
  }
  const taxa = (mesesAtras: number) => {
    const ref = new Date(hoje.getFullYear(), hoje.getMonth() - mesesAtras, 1)
    const chave = iso(ref).slice(0, 7)
    const ts = transacoes.filter((t) => t.data.startsWith(chave))
    const r = ts.filter((t) => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0)
    const d = ts.filter((t) => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0)
    return r > 0 ? ((r - d) / r) * 100 : null
  }
  const atualizarConquistas = () => {
    const seq = sequencia()
    const mesAtual = hoje.getMonth() + 1, anoAtual = hoje.getFullYear()
    for (const d of desafios.filter((x) => x.modo === 'auto' && !x.concluido)) {
      const valor = d.id === 2 ? seq : d.id === 3 ? Math.max(0, Math.floor(taxa(0) ?? 0))
        : d.id === 5 ? progresso.filter((p) => p.concluido_em).length
        : d.id === 6 ? orcamentos.filter((o) => o.mes === mesAtual && o.ano === anoAtual).length : 0
      const completo = d.id === 3 ? (taxa(1) ?? 0) >= 10 || (hoje.getDate() >= 25 && (taxa(0) ?? 0) >= 10) : valor >= d.duracao_dias
      if (completo) premiar(d); else d.dia_atual = Math.min(valor, d.duracao_dias)
    }
    if (seq >= 7) medalha(2)
    if ([1, 2, 3].every((i) => (taxa(i) ?? -1) > 0)) medalha(3)
    if (metas.some((m) => m.valor_atual >= m.valor_total)) medalha(9)
  }
  const espera = <T,>(v: T, ms = 120) => new Promise<T>((r) => setTimeout(() => r(structuredClone(v)), ms))
  const user = { id: 'demo', email: 'sam@exemplo.com' }

  return {
    demo: true,
    async sessao() { return logado ? user : null },
    onAuthChange(cb) { listeners.add(cb); return () => { listeners.delete(cb) } },
    async entrar(email, senha) {
      await espera(null, 300)
      if (!email.includes('@') || senha.length < 6) throw new Error('E-mail ou senha incorretos.')
      logado = true; listeners.forEach((f) => f(user))
    },
    async cadastrar(nome) {
      await espera(null, 300)
      profile.nome = nome.split(' ')[0]; profile.onboarding_completo = false
      profile.termos_versao = REGRAS.versaoTermos; profile.termos_aceitos_em = new Date().toISOString()
      logado = true; listeners.forEach((f) => f(user))
    },
    async recuperarSenha() { await espera(null, 300) },
    async sair() { logado = false; listeners.forEach((f) => f(null)) },

    perfil: () => espera(profile),
    async atualizarPerfil(p) {
      if (p.nome !== undefined || p.data_nascimento !== undefined) garantir(validarPerfil({ nome: p.nome ?? profile.nome, data_nascimento: p.data_nascimento ?? profile.data_nascimento }))
      const antes = { ...profile }
      Object.assign(profile, p)
      if (p.nome !== undefined || p.data_nascimento !== undefined) auditar('profiles', 'UPDATE', { nome: antes.nome, data_nascimento: antes.data_nascimento }, { nome: profile.nome, data_nascimento: profile.data_nascimento })
    },
    async salvarOnboarding() { profile.onboarding_completo = true; xp(50) },

    conexoes: () => espera(conexoes),
    contas: () => espera(contas),
    async criarConta(c) {
      termosEmDia(); garantir(validarConta(c, contas.filter((x) => x.origem === 'manual').length))
      const nova: Conta = { ...c, id: id(), conexao_id: null, origem: 'manual', numero: null, limite_credito: null, atualizado_em: new Date().toISOString() }
      contas.push(nova); auditar('contas', 'INSERT', null, nova)
    },
    async excluirConta(cid) { contas.splice(contas.findIndex((c) => c.id === cid), 1) },
    async ofConnectToken() { return 'demo' },
    async ofSincronizar(itemId) {
      await espera(null, 1800)
      if (!conexoes.length) {
        const cx: Conexao = { id: id(), external_item_id: itemId, instituicao: 'Banco Exemplo (sandbox)', instituicao_logo: null, instituicao_cor: '#24408E', status: 'UPDATED', status_detalhe: null, ultima_sync: new Date().toISOString() }
        conexoes.push(cx)
        const of = (nome: string, tipo: Conta['tipo'], saldo: number, numero: string, limite: number | null = null): Conta =>
          ({ id: id(), conexao_id: cx.id, origem: 'open_finance', nome, tipo, instituicao: cx.instituicao, numero, saldo, limite_credito: limite, atualizado_em: new Date().toISOString() })
        const cc = of('Conta corrente', 'corrente', 850.42, '0001/12345-6')
        const pp = of('Poupança', 'poupanca', 2082.89, '0001/12345-6')
        const cartao = of('Cartão Visa', 'cartao', 286.45, '•••• 4821', 2500)
        contas.push(cc, pp, cartao)
        transacoes.forEach((tx) => {
          if (tx.conta_id) return
          tx.conta_id = tx.forma_pagamento === 'Crédito' ? cartao.id : cc.id
        })
        xp(75); medalha(4)
      } else conexoes.forEach((c) => (c.ultima_sync = new Date().toISOString()))
      emitir()
      return { contas: 3, transacoes: transacoes.length, status: 'UPDATED' }
    },
    async ofDesconectar() {
      conexoes.length = 0
      for (let i = contas.length - 1; i >= 0; i--) if (contas[i].origem === 'open_finance') contas.splice(i, 1)
      transacoes.forEach((tx) => { if (!contas.some((c) => c.id === tx.conta_id)) tx.conta_id = null })
      emitir()
    },
    onDadosMudaram(cb) { dataListeners.add(cb); return () => { dataListeners.delete(cb) } },

    transacoes: ({ de, ate, contaId, limite }) =>
      espera(transacoes.filter((x) => (!de || x.data >= de) && (!ate || x.data <= ate) && (!contaId || x.conta_id === contaId))
        .sort((a, b) => b.data.localeCompare(a.data)).slice(0, limite ?? 2000)),
    async criarTransacao(tx) {
      termosEmDia(); garantir(validarTransacao(tx))
      if (tx.conta_id && contas.find((c) => c.id === tx.conta_id)?.origem === 'open_finance') garantir('Contas do Open Finance recebem só o que vem do banco. Escolha uma conta manual.')
      const nova: Transacao = { ...tx, id: id(), origem: 'manual' }
      transacoes.push(nova); auditar('transacoes', 'INSERT', null, nova)
      const hoje = auditoria.filter((a) => a.tabela === 'transacoes' && a.operacao === 'INSERT' && a.quando.startsWith(dia(0))).length
      if (hoje <= 10) xp(10) // só as 10 primeiras do dia dão XP
      atualizarConquistas()
    },
    async excluirTransacao(tid) { transacoes.splice(transacoes.findIndex((x) => x.id === tid), 1) },
    async alterarCategoria(tid, categoria) { const t = transacoes.find((x) => x.id === tid)!; if (t.origem === 'manual') t.categoria = categoria },
    async token() { return null },
    async aceitarTermos(versao) { profile.termos_versao = versao; profile.termos_aceitos_em = new Date().toISOString(); auditar('profiles', 'UPDATE', null, { termos_versao: versao }) },
    async exportarMeusDados() {
      return { gerado_em: new Date().toISOString(), aviso: 'Modo demonstração: dados de exemplo.', perfil: profile, conexoes_open_finance: conexoes, contas, transacoes, orcamentos, metas, investimentos, historico_de_alteracoes: auditoria }
    },
    historico: (limite = 50) => espera(auditoria.slice(0, limite)),
    async excluirMinhaConta(confirmacao) {
      if (confirmacao !== 'EXCLUIR') throw new Error('Digite EXCLUIR para confirmar.')
      logado = false; listeners.forEach((f) => f(null))
    },

    orcamentos: (m, a) => espera(orcamentos.filter((o) => o.mes === m && o.ano === a)),
    async salvarOrcamento(o) {
      termosEmDia(); garantir(validarOrcamento(o)); auditar('orcamentos', 'INSERT', null, o)
      const ex = orcamentos.find((x) => x.categoria === o.categoria && x.mes === o.mes && x.ano === o.ano)
      if (ex) ex.limite = o.limite; else orcamentos.push({ ...o, id: id() })
    },
    async excluirOrcamento(oid) { orcamentos.splice(orcamentos.findIndex((x) => x.id === oid), 1) },

    metas: () => espera(metas),
    async criarMeta(m) {
      termosEmDia(); garantir(validarMeta(m, metas.filter((x) => x.valor_atual < x.valor_total).length))
      const nova = { ...m, id: id(), valor_atual: 0 }
      metas.push(nova); auditar('metas', 'INSERT', null, nova); xp(25); medalha(1)
    },
    async depositarMeta(mid, v) { termosEmDia(); garantir(validarDeposito(v)); const m = metas.find((x) => x.id === mid)!; auditar('metas', 'UPDATE', { valor_atual: m.valor_atual }, { valor_atual: Math.min(m.valor_total, m.valor_atual + v) }); m.valor_atual = Math.min(m.valor_total, m.valor_atual + v); if (m.valor_atual >= m.valor_total) medalha(9) },
    async excluirMeta(mid) { metas.splice(metas.findIndex((x) => x.id === mid), 1) },

    investimentos: () => espera(investimentos),
    async criarInvestimento(i) {
      termosEmDia(); garantir(validarInvestimento(i))
      const novo = { ...i, id: id(), resgatado_em: null, valor_resgate: null }
      investimentos.unshift(novo); auditar('investimentos', 'INSERT', null, novo); xp(50); medalha(5)
    },
    async resgatarInvestimento(iid, valor, data) {
      const i = investimentos.find((x) => x.id === iid)!
      if (i.resgatado_em) throw new Error('Investimento já resgatado')
      termosEmDia(); garantir(validarResgate({ valor, data, dataAporte: i.data_aporte }))
      auditar('investimentos', 'UPDATE', { resgatado_em: null }, { resgatado_em: data, valor_resgate: valor })
      i.resgatado_em = data; i.valor_resgate = valor
      transacoes.push({ id: id(), conta_id: null, origem: 'manual', tipo: 'receita', valor, categoria: 'Investimentos', descricao: 'Resgate de investimento', forma_pagamento: 'Transferência', data })
    },
    async excluirInvestimento(iid) { investimentos.splice(investimentos.findIndex((x) => x.id === iid), 1) },

    desafios: () => { atualizarConquistas(); return espera(desafios) },
    async avancarDesafio(did) {
      const d = desafios.find((x) => x.id === did)!
      if (d.modo !== 'checkin') throw new Error('Este desafio é verificado automaticamente.')
      if (d.concluido) throw new Error('Desafio já concluído.')
      if (d.ultimo_check === dia(0)) throw new Error('Check-in já feito hoje.')
      if (d.dia_atual > 0 && d.ultimo_check && d.ultimo_check < dia(1)) {
        if (d.ultimo_check === dia(2) && profile.congelamentos > 0) {
          profile.congelamentos--; notificar('🧊 Sequência salva', `Um congelamento protegeu "${d.titulo}".`, '🧊')
        } else d.dia_atual = 0
      }
      d.dia_atual++; d.ultimo_check = dia(0)
      if (d.dia_atual >= d.duracao_dias) premiar(d)
    },
    async recomecarDesafio(did) {
      const d = desafios.find((x) => x.id === did)!
      if (d.modo !== 'checkin') throw new Error('Só desafios de check-in podem recomeçar.')
      Object.assign(d, { concluido: false, dia_atual: 0, ultimo_check: null })
    },
    medalhas: () => espera(medalhas),
    notificacoes: () => espera(notificacoes),
    async marcarLidas() { notificacoes.forEach((n) => (n.lida = true)) },

    progressoModulos: () => espera(progresso),
    async concluirModulo(mod, acertos) {
      await espera(null, 250)
      const m = MODULOS_DB[mod]
      if (!m) throw new Error('Módulo desconhecido')
      if (acertos < 0 || acertos > m.total) throw new Error('Pontuação inválida')
      const aprovado = acertos >= Math.ceil(m.total * 0.7)
      let p = progresso.find((x) => x.modulo_id === mod)
      if (!p) { p = { modulo_id: mod, melhor_acertos: 0, tentativas: 0, concluido_em: null, perfeito_em: null }; progresso.push(p) }
      let g = 0, moedas = 0
      const primeira = aprovado && !p.concluido_em
      const perfeito = acertos === m.total && !p.perfeito_em
      if (primeira) { g += xp(m.xp); moedas += m.moedas }
      if (perfeito) { g += xp(20); moedas += 10 }
      p.tentativas++; p.melhor_acertos = Math.max(p.melhor_acertos, acertos)
      if (aprovado && !p.concluido_em) p.concluido_em = new Date().toISOString()
      if (perfeito) p.perfeito_em = new Date().toISOString()
      profile.moedas += moedas
      if (primeira) {
        notificar(`🎓 Módulo concluído: ${m.titulo}`, `${acertos} de ${m.total} acertos. +${g} XP e +${moedas} moedas.`, '🎓')
        medalha(7)
        if (progresso.filter((x) => x.concluido_em).length === Object.keys(MODULOS_DB).length) medalha(8)
      }
      if (perfeito) medalha(12)
      atualizarConquistas()
      return { aprovado, primeira_vez: primeira, perfeito, xp: g, moedas }
    },

    loja: () => espera(loja),
    async comprarItem(iid) {
      await espera(null, 200)
      const i = loja.find((x) => x.id === iid)
      if (!i) throw new Error('Item não encontrado')
      const permanente = i.tipo === 'tema' || i.tipo === 'avatar' || i.tipo === 'moldura'
      if (permanente && profile.itens_resgatados.includes(iid)) throw new Error('Você já tem este item')
      if (profile.moedas < i.custo) throw new Error(`Faltam ${i.custo - profile.moedas} moedas para este item`)
      profile.moedas -= i.custo
      if (permanente) { profile.itens_resgatados.push(iid); profile[i.tipo as 'tema' | 'avatar' | 'moldura'] = iid }
      if (i.tipo === 'congelamento') profile.congelamentos++
      if (i.tipo === 'boost') {
        const base = profile.boost_xp_ate && new Date(profile.boost_xp_ate) > new Date() ? new Date(profile.boost_xp_ate) : new Date()
        profile.boost_xp_ate = new Date(base.getTime() + 864e5).toISOString()
      }
      notificar(`${i.icone} ${i.nome}`, `Troca feita por ${i.custo} moedas.`, i.icone)
      medalha(11)
    },
    async equiparItem(tipo, iid) {
      if (iid && !profile.itens_resgatados.includes(iid)) throw new Error('Você ainda não tem este item')
      if (tipo === 'tema') profile.tema = iid ?? 'padrao'; else profile[tipo] = iid
    },
  }
}
