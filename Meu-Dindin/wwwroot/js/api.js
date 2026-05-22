/**
 * api.js — Camada de integração entre o frontend Meu DinDin e a API ASP.NET Core
 * Inclua este script ANTES de fechar o </body> no meu_dindin.html:
 *   <script src="api.js"></script>
 *
 * Ele sobrescreve as funções de dados do app para usar a API real.
 */

const API = (() => {
  const BASE = '/api';
  let _token = localStorage.getItem('dindin_token') ?? '';

  // ── Utilitários ─────────────────────────────────────────────────────────────
  function headers(json = true) {
    const h = { Authorization: `Bearer ${_token}` };
    if (json) h['Content-Type'] = 'application/json';
    return h;
  }

  async function req(method, path, body) {
    const opts = { method, headers: headers() };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(BASE + path, opts);
    if (res.status === 401) { doLogout(); return null; }
    if (res.status === 204 || res.status === 201) {
      try { return await res.json(); } catch { return null; }
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.erro ?? `HTTP ${res.status}`);
    return data;
  }

  return {
    setToken(t) { _token = t; localStorage.setItem('dindin_token', t); },
    clearToken() { _token = ''; localStorage.removeItem('dindin_token'); },
    hasToken() { return !!_token; },

    // Auth
    register:   (nome, email, senha) => req('POST', '/auth/register', { nome, email, senha }),
    login:      (email, senha)        => req('POST', '/auth/login',    { email, senha }),
    onboarding: (respostas)           => req('POST', '/auth/onboarding', { respostas }),
    getPerfil:  ()                    => req('GET',  '/auth/perfil'),
    putPerfil:  (body)                => req('PUT',  '/auth/perfil', body),
    putSenha:   (atual, nova)         => req('PUT',  '/auth/senha', { senhaAtual: atual, novaSenha: nova }),

    // Transações
    getTransacoes: (mes, ano)  => req('GET', `/transacoes?mes=${mes}&ano=${ano}`),
    postTransacao: (body)      => req('POST', '/transacoes', body),
    deleteTransacao: (id)      => req('DELETE', `/transacoes/${id}`),
    getResumo: (mes, ano)      => req('GET', `/transacoes/resumo?mes=${mes}&ano=${ano}`),
    getEvolucao: (meses = 5)   => req('GET', `/transacoes/evolucao?meses=${meses}`),

    // Metas
    getMetas:       ()         => req('GET',    '/metas'),
    postMeta:       (body)     => req('POST',   '/metas', body),
    patchMetaValor: (id, val)  => req('PATCH',  `/metas/${id}/valor`, { novoValorAtual: val }),
    deleteMeta:     (id)       => req('DELETE', `/metas/${id}`),

    // Investimentos
    getInvestimentos: ()       => req('GET',    '/investimentos'),
    getInvestResumo:  ()       => req('GET',    '/investimentos/resumo'),
    postInvestimento: (body)   => req('POST',   '/investimentos', body),
    deleteInvestimento: (id)   => req('DELETE', `/investimentos/${id}`),

    // Gamificação
    getGamificacao: ()         => req('GET',  '/gamificacao'),
    getDesafios:    ()         => req('GET',  '/gamificacao/desafios'),
    avancarDesafio: (id)       => req('POST', `/gamificacao/desafios/${id}/avancar`),
    getMedalhas:    ()         => req('GET',  '/gamificacao/medalhas'),
    resgatarRecomp: (custo)    => req('POST', '/gamificacao/loja/resgatar', { custo }),

    // Recomendações
    getRecomendacoes: (mes, ano) => req('GET', `/recomendacoes?mes=${mes}&ano=${ano}`),
  };
})();

// ── Substituir funções de Auth ────────────────────────────────────────────────
async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  if (!email || !pass) { showToast('Preencha e-mail e senha', 'red'); return; }
  try {
    const resp = await API.login(email, pass);
    if (!resp) return;
    API.setToken(resp.token);
    carregarPerfil(resp);
    if (!resp.onboardingCompleto) {
      onboardStep = 0;
      state.onboardAnswers = {};
      initOnboarding();
      showScreen('screen-onboarding');
    } else {
      await carregarTodosDados();
      showScreen('screen-app');
    }
  } catch (e) { showToast(e.message, 'red'); }
}

async function doRegister() {
  const nome  = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass  = document.getElementById('reg-pass').value;
  if (!nome || !email || !pass) { showToast('Preencha todos os campos', 'red'); return; }
  if (pass.length < 8) { showToast('Senha muito curta (mín. 8 caracteres)', 'red'); return; }
  try {
    const resp = await API.register(nome, email, pass);
    if (!resp) return;
    API.setToken(resp.token);
    carregarPerfil(resp);
    onboardStep = 0; state.onboardAnswers = {};
    initOnboarding();
    showScreen('screen-onboarding');
  } catch (e) { showToast(e.message, 'red'); }
}

function doLogout() {
  API.clearToken();
  showScreen('screen-auth');
}

// ── Onboarding: enviar para API ao finalizar ──────────────────────────────────
const _origOnboardNext = onboardNext;
window.onboardNext = async function() {
  if (onboardStep < onboardQs.length - 1) {
    _origOnboardNext(); return;
  }
  // Último passo: salvar na API
  const respostas = Object.entries(state.onboardAnswers).map(([p, r]) => ({
    perguntaIndex: parseInt(p),
    respostaIndex: r,
    respostaTexto: onboardQs[parseInt(p)].opts[r]?.label ?? ''
  }));
  try {
    await API.onboarding(respostas);
    applyOnboardProfile();
    await carregarTodosDados();
    showScreen('screen-app');
  } catch (e) { showToast('Erro ao salvar perfil: ' + e.message, 'red'); }
};

// ── Carregar todos os dados ao iniciar ────────────────────────────────────────
async function carregarTodosDados() {
  const agora = new Date();
  const mes = agora.getMonth() + 1, ano = agora.getFullYear();
  try {
    const [transacoes, metas, resumo, gamificacao, recomendacoes] = await Promise.all([
      API.getTransacoes(mes, ano),
      API.getMetas(),
      API.getResumo(mes, ano),
      API.getGamificacao(),
      API.getRecomendacoes(mes, ano),
    ]);

    // Transações
    if (transacoes) {
      state.transacoes = transacoes.map(t => ({
        id:    t.id,
        data:  new Date(t.data).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' }),
        desc:  t.descricao,
        cat:   t.categoria,
        pag:   t.formaPagamento,
        tipo:  t.tipo,
        valor: t.valor,
      }));
    }

    // Metas
    if (metas) {
      state.metas = metas.map(m => ({
        id:     m.id,
        nome:   m.nome,
        atual:  m.valorAtual,
        total:  m.valorTotal,
        prazo:  new Date(m.prazo).toLocaleDateString('pt-BR', { month:'short', year:'numeric' }),
        color:  m.cor,
      }));
    }

    // Resumo financeiro → atualizar métricas do dashboard
    if (resumo) {
      const fmt = v => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;
      document.getElementById('m-saldo').textContent     = fmt(resumo.saldo);
      document.getElementById('m-receitas').textContent  = fmt(resumo.totalReceitas);
      document.getElementById('m-despesas').textContent  = fmt(resumo.totalDespesas);
      document.getElementById('m-economia').textContent  = fmt(resumo.economia);
      document.getElementById('totalRec').textContent    = `Receitas +R$${resumo.totalReceitas.toFixed(0)}`;
      document.getElementById('totalDep').textContent    = `Despesas -R$${resumo.totalDespesas.toFixed(0)}`;
    }

    // Gamificação
    if (gamificacao) aplicarGamificacao(gamificacao);

    // Recomendações
    if (recomendacoes?.length) aplicarRecomendacoes(recomendacoes);

    renderTransacoes();
    renderMetas();
    renderCharts();
    initQuiz();
    showPage('dashboard');
  } catch (e) {
    console.error('Erro ao carregar dados:', e);
    // Fallback: usa dados locais do state
    initApp();
  }
}

// ── Transação: sobrescrever addTransacao para usar API ────────────────────────
const _origAddTransacao = addTransacao;
window.addTransacao = async function(tipo) {
  const prefix = tipo === 'receita' ? 'rec' : 'dep';
  const valor  = parseFloat(document.getElementById(prefix + '-valor').value);
  const cat    = document.getElementById(prefix + '-cat').value;
  const data   = document.getElementById(prefix + '-data').value;
  const desc   = document.getElementById(prefix + '-desc')?.value ?? '';
  const pag    = document.getElementById('dep-pag')?.value ?? 'Débito';

  if (!valor || valor <= 0) { showToast('Informe um valor válido', 'red'); return; }
  if (!data) { showToast('Informe a data', 'red'); return; }

  try {
    const saved = await API.postTransacao({
      tipo, valor, categoria: cat,
      descricao: desc || cat,
      formaPagamento: tipo === 'receita' ? 'Transferência' : pag,
      data: new Date(data).toISOString()
    });
    if (saved) {
      state.transacoes.unshift({
        id: saved.id, data: new Date(saved.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        desc: saved.descricao, cat: saved.categoria, pag: saved.formaPagamento, tipo: saved.tipo, valor: saved.valor
      });
      document.getElementById(prefix + '-valor').value = '';
      if (document.getElementById(prefix + '-desc')) document.getElementById(prefix + '-desc').value = '';
      renderTransacoes(); updateMetrics();
      showToast(tipo === 'receita' ? 'Receita adicionada! +10 XP 🎉' : 'Despesa registrada!', tipo === 'receita' ? 'green' : '');
    }
  } catch (e) { showToast('Erro ao salvar: ' + e.message, 'red'); }
};

// ── Excluir transação: via API ─────────────────────────────────────────────────
const _origDelete = deleteTransacao;
window.deleteTransacao = async function(id) {
  try {
    await API.deleteTransacao(id);
    state.transacoes = state.transacoes.filter(t => t.id !== id);
    renderTransacoes(); updateMetrics();
  } catch (e) { showToast('Erro ao excluir: ' + e.message, 'red'); }
};

// ── Meta: sobrescrever addMeta ─────────────────────────────────────────────────
const _origAddMeta = addMeta;
window.addMeta = async function() {
  const nome  = document.getElementById('mm-nome').value.trim();
  const total = parseFloat(document.getElementById('mm-valor').value);
  const atual = parseFloat(document.getElementById('mm-atual').value) || 0;
  const prazo = document.getElementById('mm-prazo').value;
  if (!nome || !total || !prazo) { showToast('Preencha todos os campos', 'red'); return; }
  const colors = ['#639922', '#378ADD', '#7F77DD', '#EF9F27', '#E24B4A'];
  try {
    const saved = await API.postMeta({
      nome, valorTotal: total, valorAtual: atual,
      prazo: new Date(prazo + '-01').toISOString(),
      cor: colors[state.metas.length % colors.length]
    });
    if (saved) {
      state.metas.push({ id: saved.id, nome: saved.nome, atual: saved.valorAtual,
        total: saved.valorTotal, prazo: saved.prazo, color: saved.cor });
      renderMetas(); closeModal('modalMeta');
      showToast('Meta criada! +25 XP 🎯', 'green');
    }
  } catch (e) { showToast('Erro ao criar meta: ' + e.message, 'red'); }
};

// ── Perfil: salvar via API ────────────────────────────────────────────────────
const _origSavePerfil = savePerfil;
window.savePerfil = async function() {
  const nome = document.getElementById('prf-nome').value.trim();
  if (!nome) { showToast('Nome não pode estar vazio', 'red'); return; }
  try {
    await API.putPerfil({
      nome,
      email:           document.getElementById('prf-email').value.trim(),
      fotoUrl:         state.user.avatarUrl || null,
      altoContraste:   document.getElementById('togHighContrast')?.checked ?? false,
      textoGrande:     document.getElementById('togLargeText')?.checked ?? false,
      reduzirAnimacoes:document.getElementById('togReduceMotion')?.checked ?? false,
      preferenciaLibras: false,
    });
    state.user.name = nome;
    const initials = nome.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
    document.getElementById('sidebarName').textContent = nome;
    document.getElementById('sidebarAvatar').textContent = initials;
    showToast('Perfil atualizado! ✓', 'green');
  } catch (e) { showToast('Erro ao salvar perfil: ' + e.message, 'red'); }
};

// ── Investimentos: aporte via API ─────────────────────────────────────────────
document.getElementById('modalAporte')?.addEventListener('click', () => {});
async function confirmarAporte() {
  const tipo  = document.getElementById('ma-tipo').value;
  const valor = parseFloat(document.getElementById('ma-valor').value);
  if (!valor || valor < 30) { showToast('Valor mínimo de R$30,00', 'red'); return; }
  const tipoApi = { 'Poupança': 'Poupança', 'Tesouro Selic': 'TesouroDireto', 'CDB 110% CDI': 'CDB' }[tipo] ?? tipo;
  try {
    await API.postInvestimento({ tipo: tipoApi, valor, dataAporte: new Date().toISOString() });
    closeModal('modalAporte');
    showToast('Aporte realizado! +50 XP 🎉', 'green');
  } catch (e) { showToast('Erro no aporte: ' + e.message, 'red'); }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function carregarPerfil(resp) {
  state.user.name   = resp.nome;
  state.user.initials = resp.nome.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  state.user.level  = resp.nivel;
  state.user.xp     = resp.xp;
  state.user.coins  = resp.moedas;
  if (resp.altoContraste) toggleHighContrast(true);
  if (resp.textoGrande)   toggleLargeText(true);
  if (resp.reduzirAnimacoes) toggleReduceMotion(true);
}

function aplicarGamificacao(gam) {
  state.user.xp     = gam.xp;
  state.user.level  = gam.nivel;
  state.user.coins  = gam.moedas;
  document.getElementById('sidebarLevel').textContent  = `Nível ${gam.nivel} · ${gam.xp} XP`;
  document.getElementById('gameName').textContent       = `${state.user.name} · Nível ${gam.nivel} — ${gam.nomeTitulo}`;
  document.getElementById('gameLevel').textContent      = `${gam.xp} XP · Próximo nível em ${gam.xpProximoNivel - gam.xp} XP`;
  document.getElementById('gameCoins').innerHTML        = `${gam.moedas} <i class="ti ti-coin" aria-hidden="true"></i>`;
  const pct = gam.xpProximoNivel > 0 ? Math.min(100, Math.round(gam.xp / gam.xpProximoNivel * 100)) : 0;
  document.getElementById('dashXPFill').style.width    = pct + '%';
  document.getElementById('gameXPFill').style.width    = pct + '%';
  document.getElementById('dashXPLabel').textContent   = `Nível ${gam.nivel} · ${gam.nomeTitulo}`;
  document.getElementById('dashXPSub').textContent     = `${gam.xp} / ${gam.xpProximoNivel} XP`;
}

function aplicarRecomendacoes(recs) {
  const rec = document.getElementById('dashRec');
  if (!rec || !recs.length) return;
  const r = recs[0];
  const cores = { alerta: 'var(--red)', dica: 'var(--green-mid)', parabens: 'var(--green)' };
  rec.innerHTML = `<span aria-hidden="true">${r.icone}</span> <strong style="color:${cores[r.tipo]??'var(--text)'}">${r.titulo}:</strong> ${r.mensagem}`;
}

// ── Auto-login: se já tiver token, tenta carregar direto ──────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  if (API.hasToken()) {
    try {
      const perfil = await API.getPerfil();
      if (perfil) {
        carregarPerfil(perfil);
        await carregarTodosDados();
        showScreen('screen-app');
        return;
      }
    } catch { API.clearToken(); }
  }
  // Sem token: mostra tela de login (padrão)
});