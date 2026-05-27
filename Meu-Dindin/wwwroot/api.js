/**
 * api.js — Integração Meu DinDin ↔ API ASP.NET Core
 * Sobrescreve as funções do meu_dindin.html para usar dados reais do servidor.
 * Carregado automaticamente via <script src="api.js"> no HTML.
 */

// ── Cliente HTTP ──────────────────────────────────────────────────────────────
const API = (() => {
  const BASE = '/api';
  let _token = localStorage.getItem('dindin_token') ?? '';

  function headers() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${_token}`
    };
  }

  async function req(method, path, body) {
    const opts = { method, headers: headers() };
    if (body !== undefined) opts.body = JSON.stringify(body);

    let res;
    try {
      res = await fetch(BASE + path, opts);
    } catch {
      throw new Error('Sem conexão com o servidor.');
    }

    if (res.status === 401) { _logout(); return null; }
    if (res.status === 204) return null;

    let data;
    try { data = await res.json(); } catch { data = {}; }

    if (!res.ok) throw new Error(data.erro ?? data.title ?? `Erro ${res.status}`);
    return data;
  }

  function _logout() {
    _token = '';
    localStorage.removeItem('dindin_token');
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-auth').classList.add('active');
  }

  return {
    setToken(t)  { _token = t; localStorage.setItem('dindin_token', t); },
    clearToken() { _token = ''; localStorage.removeItem('dindin_token'); },
    hasToken()   { return !!_token; },

    // Auth
    register:        (nome, email, senha) => req('POST', '/auth/register',  { nome, email, senha }),
    login:           (email, senha)       => req('POST', '/auth/login',     { email, senha }),
    onboarding:      (respostas)          => req('POST', '/auth/onboarding',{ respostas }),
    getPerfil:       ()                   => req('GET',  '/auth/perfil'),
    putPerfil:       (body)               => req('PUT',  '/auth/perfil', body),
    putSenha:        (atual, nova)        => req('PUT',  '/auth/senha',  { senhaAtual: atual, novaSenha: nova }),

    // Transações
    getTransacoes:   (mes, ano) => req('GET',    `/transacoes?mes=${mes}&ano=${ano}`),
    getTodas:        ()         => req('GET',    '/transacoes'),
    postTransacao:   (body)     => req('POST',   '/transacoes', body),
    deleteTransacao: (id)       => req('DELETE', `/transacoes/${id}`),
    getResumo:       (mes, ano) => req('GET',    `/transacoes/resumo?mes=${mes}&ano=${ano}`),
    getEvolucao:     (n = 5)    => req('GET',    `/transacoes/evolucao?meses=${n}`),

    // Metas
    getMetas:        ()          => req('GET',    '/metas'),
    postMeta:        (body)      => req('POST',   '/metas', body),
    patchMetaValor:  (id, val)   => req('PATCH',  `/metas/${id}/valor`, { novoValorAtual: val }),
    deleteMeta:      (id)        => req('DELETE', `/metas/${id}`),

    // Investimentos
    getInvestimentos: ()         => req('GET',    '/investimentos'),
    getInvestResumo:  ()         => req('GET',    '/investimentos/resumo'),
    postInvestimento: (body)     => req('POST',   '/investimentos', body),
    deleteInvest:     (id)       => req('DELETE', `/investimentos/${id}`),

    // Gamificação
    getGamificacao:  ()          => req('GET',  '/gamificacao'),
    avancarDesafio:  (id)        => req('POST', `/gamificacao/desafios/${id}/avancar`),
    getMedalhas:     ()          => req('GET',  '/gamificacao/medalhas'),
    resgatarRecomp:  (custo)     => req('POST', '/gamificacao/loja/resgatar', { custo }),

    // Quiz
    postResposta:    (body)      => req('POST', '/quiz/resposta', body),
    getProgresso:    ()          => req('GET',  '/quiz/progresso'),
    getRespondidas:  (mod)       => req('GET',  `/quiz/respondidas/${mod}`),
    getHistorico:    (mod)       => req('GET',  `/quiz/historico/${mod}`),

    // Recomendações
    getRecomendacoes: (mes, ano) => req('GET',  `/recomendacoes?mes=${mes}&ano=${ano}`),
  };
})();

// ─────────────────────────────────────────────────────────────────────────────
// AUTENTICAÇÃO
// ─────────────────────────────────────────────────────────────────────────────
window.doLogin = async function() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  if (!email || !pass) { showToast('Preencha e-mail e senha', 'red'); return; }

  try {
    const resp = await API.login(email, pass);
    if (!resp) return;
    API.setToken(resp.token);

    if (!resp.onboardingCompleto) {
      // Novo usuário: vai para o quiz de onboarding
      state.user.name = resp.nome;
      state.user.initials = _initials(resp.nome);
      onboardStep = 0;
      state.onboardAnswers = {};
      initOnboarding();
      showScreen('screen-onboarding');
    } else {
      await _carregarTudo(resp);
    }
  } catch (e) { showToast(e.message, 'red'); }
};

window.doRegister = async function() {
  const nome  = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass  = document.getElementById('reg-pass').value;
  if (!nome || !email || !pass) { showToast('Preencha todos os campos', 'red'); return; }
  if (pass.length < 8)  { showToast('Senha muito curta (mín. 8 caracteres)', 'red'); return; }
  if (!email.includes('@')) { showToast('E-mail inválido', 'red'); return; }

  try {
    const resp = await API.register(nome, email, pass);
    if (!resp) return;
    API.setToken(resp.token);
    state.user.name     = nome;
    state.user.initials = _initials(nome);
    onboardStep = 0;
    state.onboardAnswers = {};
    initOnboarding();
    showScreen('screen-onboarding');
  } catch (e) { showToast(e.message, 'red'); }
};

window.doLogout = function() {
  API.clearToken();
  // Limpar estado
  state.user      = { name:'', email:'', initials:'', level:1, xp:0, coins:0, avatarUrl:'' };
  state.transacoes = [];
  state.metas      = [];
  showScreen('screen-auth');
};

// ─────────────────────────────────────────────────────────────────────────────
// ONBOARDING — intercepta o último passo para salvar na API
// ─────────────────────────────────────────────────────────────────────────────
window.onboardNext = async function() {
  if (state.onboardAnswers[onboardStep] === undefined) return;

  if (onboardStep < onboardQs.length - 1) {
    // Avançar normalmente (lógica original do HTML)
    onboardStep++;
    renderOnboardProgress();
    renderOnboardQuestion();
    const isLast = onboardStep === onboardQs.length - 1;
    document.getElementById('btnOnboardNext').innerHTML = isLast
      ? 'Começar <i class="ti ti-rocket" aria-hidden="true"></i>'
      : 'Próxima <i class="ti ti-arrow-right" aria-hidden="true"></i>';
    document.getElementById('btnOnboardNext').disabled = state.onboardAnswers[onboardStep] === undefined;
    document.getElementById('btnOnboardBack').style.visibility = 'visible';
    return;
  }

  // Último passo: salvar na API
  const btn = document.getElementById('btnOnboardNext');
  btn.disabled = true;
  btn.innerHTML = '<i class="ti ti-loader-2" style="animation:spin 1s linear infinite"></i> Salvando...';

  try {
    const respostas = Object.entries(state.onboardAnswers).map(([p, r]) => ({
      perguntaIndex: parseInt(p),
      respostaIndex: r,
      respostaTexto: onboardQs[parseInt(p)]?.opts[r]?.label ?? ''
    }));
    await API.onboarding(respostas);
    applyOnboardProfile();
    const perfil = await API.getPerfil();
    await _carregarTudo(perfil);
  } catch (e) {
    showToast('Erro ao salvar perfil: ' + e.message, 'red');
    btn.disabled = false;
    btn.innerHTML = 'Começar <i class="ti ti-rocket" aria-hidden="true"></i>';
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CARREGAR TODOS OS DADOS DO USUÁRIO
// ─────────────────────────────────────────────────────────────────────────────
async function _carregarTudo(authResp) {
  // Aplicar dados básicos do usuário imediatamente (sem esperar as chamadas paralelas)
  _aplicarPerfil(authResp);
  showScreen('screen-app');
  initApp(); // popula UI com o que já temos enquanto os dados carregam

  const agora = new Date();
  const mes = agora.getMonth() + 1, ano = agora.getFullYear();

  try {
    const [transacoes, metas, resumo, gamificacao, recomendacoes, quizProgresso] =
      await Promise.allSettled([
        API.getTransacoes(mes, ano),
        API.getMetas(),
        API.getResumo(mes, ano),
        API.getGamificacao(),
        API.getRecomendacoes(mes, ano),
        API.getProgresso(),
      ]);

    // Transações
    const txData = transacoes.status === 'fulfilled' ? transacoes.value : null;
    if (txData?.length >= 0) {
      state.transacoes = txData.map(_mapTransacao);
      renderTransacoes();
    }

    // Metas
    const metasData = metas.status === 'fulfilled' ? metas.value : null;
    if (metasData?.length >= 0) {
      state.metas = metasData.map(_mapMeta);
      renderMetas();
    }

    // Métricas do resumo financeiro
    const resumoData = resumo.status === 'fulfilled' ? resumo.value : null;
    if (resumoData) _aplicarResumo(resumoData);

    // Gamificação
    const gamData = gamificacao.status === 'fulfilled' ? gamificacao.value : null;
    if (gamData) _aplicarGamificacao(gamData);

    // Recomendações
    const recsData = recomendacoes.status === 'fulfilled' ? recomendacoes.value : null;
    if (recsData?.length) _aplicarRecomendacoes(recsData);

    // Quiz
    const quizData = quizProgresso.status === 'fulfilled' ? quizProgresso.value : null;
    if (quizData) _aplicarQuizProgresso(quizData);

    renderCharts();

  } catch (e) {
    console.warn('Erro parcial ao carregar dados:', e);
    // App continua funcionando com o que já foi carregado
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSAÇÕES
// ─────────────────────────────────────────────────────────────────────────────
window.addTransacao = async function(tipo) {
  const prefix = tipo === 'receita' ? 'rec' : 'dep';
  const valor  = parseFloat(document.getElementById(`${prefix}-valor`).value);
  const cat    = document.getElementById(`${prefix}-cat`).value;
  const data   = document.getElementById(`${prefix}-data`).value;
  const desc   = document.getElementById(`${prefix}-desc`)?.value?.trim() ?? '';
  const pag    = document.getElementById('dep-pag')?.value ?? 'Débito';

  if (!valor || valor <= 0) { showToast('Informe um valor válido', 'red'); return; }
  if (!data)                { showToast('Informe a data', 'red'); return; }

  try {
    const saved = await API.postTransacao({
      tipo,
      valor,
      categoria:      cat,
      descricao:      desc || cat,
      formaPagamento: tipo === 'receita' ? 'Transferência' : pag,
      data:           new Date(data + 'T12:00:00').toISOString()
    });
    if (saved) {
      state.transacoes.unshift(_mapTransacao(saved));
      document.getElementById(`${prefix}-valor`).value = '';
      const descEl = document.getElementById(`${prefix}-desc`);
      if (descEl) descEl.value = '';
      renderTransacoes();
      updateMetrics();
      showToast(tipo === 'receita' ? 'Receita adicionada! +10 XP 🎉' : 'Despesa registrada! ✓', tipo === 'receita' ? 'green' : '');
    }
  } catch (e) { showToast('Erro ao salvar: ' + e.message, 'red'); }
};

window.addFromModal = async function() {
  const isRec = document.getElementById('mt-tab-rec').classList.contains('active');
  const tipo  = isRec ? 'receita' : 'despesa';
  const valor = parseFloat(document.getElementById('mt-valor').value);
  const cat   = document.getElementById('mt-cat').value;
  const data  = document.getElementById('mt-data').value;
  const desc  = document.getElementById('mt-desc').value.trim();
  if (!valor || valor <= 0 || !data) { showToast('Preencha todos os campos', 'red'); return; }

  try {
    const saved = await API.postTransacao({
      tipo, valor, categoria: cat,
      descricao: desc || cat,
      formaPagamento: isRec ? 'Transferência' : 'Débito',
      data: new Date(data + 'T12:00:00').toISOString()
    });
    if (saved) {
      state.transacoes.unshift(_mapTransacao(saved));
      renderTransacoes(); updateMetrics(); closeModal('modalTransacao');
      showToast('Transação salva! 🎉', 'green');
    }
  } catch (e) { showToast(e.message, 'red'); }
};

window.deleteTransacao = async function(id) {
  try {
    await API.deleteTransacao(id);
    state.transacoes = state.transacoes.filter(t => t.id !== id);
    renderTransacoes(); updateMetrics();
  } catch (e) { showToast('Erro ao excluir: ' + e.message, 'red'); }
};

// ─────────────────────────────────────────────────────────────────────────────
// METAS
// ─────────────────────────────────────────────────────────────────────────────
window.addMeta = async function() {
  const nome  = document.getElementById('mm-nome').value.trim();
  const total = parseFloat(document.getElementById('mm-valor').value);
  const atual = parseFloat(document.getElementById('mm-atual').value) || 0;
  const prazo = document.getElementById('mm-prazo').value;
  if (!nome || !total || !prazo) { showToast('Preencha todos os campos', 'red'); return; }

  const cores = ['#639922','#378ADD','#7F77DD','#EF9F27','#E24B4A'];
  try {
    const saved = await API.postMeta({
      nome, valorTotal: total, valorAtual: atual,
      prazo: new Date(prazo + '-01T12:00:00').toISOString(),
      cor: cores[state.metas.length % cores.length]
    });
    if (saved) {
      state.metas.push(_mapMeta(saved));
      renderMetas(); closeModal('modalMeta');
      showToast('Meta criada! +25 XP 🎯', 'green');
    }
  } catch (e) { showToast('Erro ao criar meta: ' + e.message, 'red'); }
};

// ─────────────────────────────────────────────────────────────────────────────
// INVESTIMENTOS
// ─────────────────────────────────────────────────────────────────────────────
window.confirmarAporte = async function() {
  const tipo  = document.getElementById('ma-tipo').value;
  const valor = parseFloat(document.getElementById('ma-valor').value);
  if (!valor || valor < 30) { showToast('Valor mínimo de R$30,00', 'red'); return; }

  const tipoMap = { 'Poupança':'Poupança', 'Tesouro Selic':'TesouroDireto', 'CDB 110% CDI':'CDB' };
  try {
    await API.postInvestimento({
      tipo: tipoMap[tipo] ?? tipo,
      valor,
      dataAporte: new Date().toISOString()
    });
    document.getElementById('ma-valor').value = '';
    closeModal('modalAporte');
    showToast('Aporte realizado! +50 XP 🎉', 'green');
  } catch (e) { showToast('Erro no aporte: ' + e.message, 'red'); }
};

// ─────────────────────────────────────────────────────────────────────────────
// PERFIL — salvar e popular campos com dados reais
// ─────────────────────────────────────────────────────────────────────────────
window.savePerfil = async function() {
  const nome = document.getElementById('prf-nome').value.trim();
  if (!nome) { showToast('Nome não pode estar vazio', 'red'); return; }
  try {
    await API.putPerfil({
      nome,
      email:            document.getElementById('prf-email').value.trim(),
      fotoUrl:          state.user.avatarUrl || null,
      altoContraste:    document.getElementById('togHighContrast')?.checked ?? false,
      textoGrande:      document.getElementById('togLargeText')?.checked ?? false,
      reduzirAnimacoes: document.getElementById('togReduceMotion')?.checked ?? false,
      preferenciaLibras: false,
    });
    // Atualizar estado local
    state.user.name     = nome;
    state.user.initials = _initials(nome);
    document.getElementById('sidebarName').textContent    = nome;
    document.getElementById('sidebarAvatar').textContent  = state.user.initials;
    document.getElementById('dashGreeting').textContent   = nome.split(' ')[0];
    showToast('Perfil atualizado! ✓', 'green');
  } catch (e) { showToast('Erro ao salvar perfil: ' + e.message, 'red'); }
};

// ─────────────────────────────────────────────────────────────────────────────
// QUIZ — integração completa com backend
// ─────────────────────────────────────────────────────────────────────────────

// Módulo atual do quiz
let _quizModulo = 'reserva';
let _quizRespondidas = new Set(); // questões já respondidas nesta sessão

// Sobrescreve answerQuiz para salvar na API
window.answerQuiz = async function(idx) {
  if (state.quizAnswered) return;
  state.quizAnswered = true;

  const q = quizQuestions[state.quizIndex];
  const isCorrect = idx === q.correct;

  // Renderizar visual imediatamente (UX rápido)
  const letters = ['A','B','C','D'];
  for (let i = 0; i < q.opts.length; i++) {
    const el = document.getElementById('qopt-' + i);
    if (!el) continue;
    el.classList.remove('correct', 'wrong');
    if (i === q.correct) el.classList.add('correct');
    else if (i === idx && !isCorrect) el.classList.add('wrong');
    el.setAttribute('aria-checked', i === idx ? 'true' : 'false');
  }

  const feedback = document.getElementById('qFeedback');
  feedback.style.display = 'block';
  feedback.innerHTML = `
    <div class="card" style="background:${isCorrect ? 'var(--green-bg)' : 'var(--red-bg)'};border-color:${isCorrect ? '#C0DD97' : '#F5AAAA'};margin-top:8px">
      <div style="font-size:12px;color:${isCorrect ? 'var(--green)' : 'var(--red)'};font-weight:600;margin-bottom:3px">
        ${isCorrect ? '✅ Correto! +10 XP' : '❌ Não dessa vez'}
      </div>
      <div style="font-size:11px;color:var(--text2)">${q.feedback}</div>
    </div>`;

  document.getElementById('btnNextQ').style.display = 'flex';

  // Salvar na API (não bloqueia a UI)
  try {
    const result = await API.postResposta({
      modulo:        _quizModulo,
      questaoIndex:  state.quizIndex,
      respostaIndex: idx,
      acertou:       isCorrect
    });

    if (result) {
      // Atualizar XP na UI
      if (result.xpGanho > 0) {
        state.user.xp += result.xpGanho;
        _atualizarXPUI();
      }

      // Módulo concluído
      if (result.moduloConcluido) {
        showToast(`🎓 Módulo concluído! +${result.xpGanho} XP 🎉`, 'green');
        _renderizarModulos([result.progresso]);
      }

      _quizRespondidas.add(state.quizIndex);
    }
  } catch (e) {
    // Só loga — o quiz visual já funcionou
    console.warn('Erro ao salvar resposta no servidor:', e.message);
  }
};

// Sobrescreve nextQuestion para pular questões já respondidas
window.nextQuestion = function() {
  if (state.quizIndex < quizQuestions.length - 1) {
    let next = state.quizIndex + 1;
    // Pular questões já respondidas nesta sessão
    while (next < quizQuestions.length - 1 && _quizRespondidas.has(next)) next++;
    state.quizIndex = next;
    renderQuizQuestion();
  } else {
    showToast('Quiz concluído! Ótimo trabalho 🎉', 'green');
    state.quizIndex = 0;
    _quizRespondidas.clear();
    setTimeout(renderQuizQuestion, 1200);
  }
};

// Aplica progresso de quiz vindo da API (módulos, status, etc.)
function _aplicarQuizProgresso(progressos) {
  if (!Array.isArray(progressos)) return;

  // Determinar módulo atual (primeiro não concluído)
  const naoConc = progressos.find(p => !p.concluido);
  if (naoConc) _quizModulo = naoConc.modulo;

  _renderizarModulos(progressos);

  // Carregar questões já respondidas do módulo atual (para não repetir)
  API.getRespondidas(_quizModulo).then(respondidas => {
    if (respondidas) {
      _quizRespondidas = new Set(respondidas);
      // Avançar para a primeira não respondida
      let primeiraLivre = 0;
      while (primeiraLivre < quizQuestions.length && _quizRespondidas.has(primeiraLivre))
        primeiraLivre++;
      if (primeiraLivre < quizQuestions.length && primeiraLivre !== state.quizIndex) {
        state.quizIndex = primeiraLivre;
        renderQuizQuestion();
      }
    }
  }).catch(() => {});
}

// Renderiza a lista de módulos com status real
function _renderizarModulos(progressos) {
  const listaEl = document.querySelector('#page-quiz .card .card-title');
  if (!listaEl) return;
  const container = listaEl.closest('.card');
  if (!container) return;

  const modDefs = [
    { id:'orcamento',     nome:'Orçamento pessoal',      qtd:5, nivel:'Básico'  },
    { id:'reserva',       nome:'Reserva de emergência',  qtd:5, nivel:'Básico'  },
    { id:'investimentos', nome:'Investimentos iniciais', qtd:5, nivel:'Médio'   },
    { id:'credito',       nome:'Crédito consciente',     qtd:5, nivel:'Médio'   },
  ];

  const progMap = {};
  progressos.forEach(p => { progMap[p.modulo] = p; });

  container.innerHTML = `<div class="card-title">Módulos disponíveis</div>` +
    modDefs.map((m, idx) => {
      const p = progMap[m.id];
      let tagHtml, desbloqueado = true;

      if (p?.concluido) {
        tagHtml = `<span class="tag tag-green">Concluído ✓</span>`;
      } else if (p?.totalRespostas > 0) {
        tagHtml = `<span class="tag tag-purple">Em curso (${p.totalRespostas}/${m.qtd})</span>`;
      } else if (idx <= 1 || progMap[modDefs[idx-1]?.id]?.concluido) {
        tagHtml = `<span class="tag tag-blue">Disponível</span>`;
      } else {
        desbloqueado = false;
        tagHtml = `<span style="font-size:11px;color:var(--text2)">🔒 Bloqueado</span>`;
      }

      const acertos = p ? ` · ${p.totalAcertos} acertos` : '';
      return `
        <div class="li${!desbloqueado ? ' ' : ''}" style="${m.id === _quizModulo ? 'background:var(--red-bg);margin:0 -16px;padding:9px 16px;border-radius:6px;' : ''}">
          <div>
            <div style="font-weight:600">${m.nome}</div>
            <div class="li-sub">${m.qtd} questões · ${m.nivel}${acertos}</div>
          </div>
          ${tagHtml}
        </div>`;
    }).join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// APLICAR DADOS DO SERVIDOR NA UI
// ─────────────────────────────────────────────────────────────────────────────

function _aplicarPerfil(resp) {
  // Atualiza state
  state.user.name     = resp.nome       ?? resp.name ?? state.user.name;
  state.user.email    = resp.email      ?? state.user.email;
  state.user.initials = _initials(state.user.name);
  state.user.level    = resp.nivel      ?? resp.level  ?? state.user.level;
  state.user.xp       = resp.xp         ?? state.user.xp;
  state.user.coins    = resp.moedas     ?? resp.coins  ?? state.user.coins;

  // Acessibilidade salva
  if (resp.altoContraste)    toggleHighContrast(true);
  if (resp.textoGrande)      toggleLargeText(true);
  if (resp.reduzirAnimacoes) toggleReduceMotion(true);

  // Campos do formulário de perfil
  const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
  set('prf-nome',  state.user.name);
  set('prf-email', state.user.email);

  // Perfil financeiro (vem do endpoint /auth/perfil completo)
  if (resp.perfilInvestidor) {
    const ptag = document.getElementById('perfTag');
    const pexp = document.getElementById('perfExp');
    const pobj = document.getElementById('perfObj');
    const prsc = document.getElementById('perfRisco');
    if (ptag) ptag.textContent = resp.perfilInvestidor;
    if (pexp) pexp.textContent = resp.nivelExperiencia ?? '-';
    if (pobj) pobj.textContent = resp.objetivoFinanceiro ?? '-';
    if (prsc) prsc.textContent = resp.perfilInvestidor === 'Conservador' ? 'Baixo'
                                : resp.perfilInvestidor === 'Moderado'   ? 'Médio' : 'Alto';
    // Select de objetivo
    const objSel = document.getElementById('prf-objetivo');
    if (objSel && resp.objetivoFinanceiro) {
      for (const opt of objSel.options) {
        if (opt.text.toLowerCase().includes(resp.objetivoFinanceiro.toLowerCase())) {
          opt.selected = true; break;
        }
      }
    }
  }

  // Checkboxes de acessibilidade
  const togHC  = document.getElementById('togHighContrast');
  const togLT  = document.getElementById('togLargeText');
  const togRM  = document.getElementById('togReduceMotion');
  if (togHC) togHC.checked = resp.altoContraste    ?? false;
  if (togLT) togLT.checked = resp.textoGrande      ?? false;
  if (togRM) togRM.checked = resp.reduzirAnimacoes  ?? false;

  // Foto de perfil
  if (resp.fotoUrl) {
    state.user.avatarUrl = resp.fotoUrl;
    _aplicarFoto(resp.fotoUrl);
  }

  // Elementos de nome/avatar em todo o app
  _atualizarIdentidade();
}

function _aplicarGamificacao(gam) {
  state.user.xp     = gam.xp;
  state.user.level  = gam.nivel;
  state.user.coins  = gam.moedas;
  _atualizarXPUI();

  // Desafios na página DinDin
  if (gam.desafios?.length) _renderizarDesafios(gam.desafios);

  // Medalhas
  if (gam.medalhas?.length) _renderizarMedalhas(gam.medalhas);
}

function _aplicarResumo(resumo) {
  const fmt = v => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  set('m-saldo',    fmt(resumo.saldo));
  set('m-receitas', fmt(resumo.totalReceitas));
  set('m-despesas', fmt(resumo.totalDespesas));
  set('m-economia', fmt(resumo.economia));
  set('totalRec',   `Receitas +R$${Number(resumo.totalReceitas).toFixed(0)}`);
  set('totalDep',   `Despesas -R$${Number(resumo.totalDespesas).toFixed(0)}`);
}

function _aplicarRecomendacoes(recs) {
  const rec = document.getElementById('dashRec');
  if (!rec || !recs.length) return;
  const r = recs[0];
  const cores = { alerta:'var(--red)', dica:'var(--green-mid)', parabens:'var(--green)' };
  rec.innerHTML = `<span aria-hidden="true">${r.icone}</span> <strong style="color:${cores[r.tipo] ?? 'var(--text)'};">${r.titulo}:</strong> ${r.mensagem}`;

  // Dica personalizada na aba de quiz
  const quizTip = document.getElementById('quizTip');
  if (quizTip && recs[1]) quizTip.textContent = recs[1].mensagem;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS DE UI
// ─────────────────────────────────────────────────────────────────────────────

function _initials(nome) {
  return (nome || '?').split(' ').filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

function _atualizarIdentidade() {
  const u = state.user;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('sidebarName',  u.name);
  set('sidebarLevel', `Nível ${u.level} · ${u.xp} XP`);
  set('dashGreeting', u.name.split(' ')[0]);

  // Avatares
  ['sidebarAvatar','gameAvatar','profileAvatarText'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = u.initials;
  });

  // Campo de perfil
  const prfNome  = document.getElementById('prf-nome');
  const prfEmail = document.getElementById('prf-email');
  if (prfNome  && !prfNome.value)  prfNome.value  = u.name;
  if (prfEmail && !prfEmail.value) prfEmail.value = u.email;
}

function _atualizarXPUI() {
  const u        = state.user;
  const xpTable  = [100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5200, 6600];
  const titulos  = ['Novato','Poupador','Economizador','Planejador','Financista','Gestor','Economista','Investidor','Especialista','Guru','Mestre DinDin'];
  const xpProx   = xpTable[u.level - 1] ?? 9999;
  const pct      = xpProx > 0 ? Math.min(100, Math.round(u.xp / xpProx * 100)) : 100;
  const titulo   = titulos[Math.min(u.level - 1, titulos.length - 1)];

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('sidebarLevel',  `Nível ${u.level} · ${u.xp} XP`);
  set('gameName',      `${u.name} · Nível ${u.level} — ${titulo}`);
  set('gameLevel',     `${u.xp} XP · Próximo nível em ${Math.max(0, xpProx - u.xp)} XP`);
  set('dashXPLabel',   `Nível ${u.level} · ${titulo}`);
  set('dashXPSub',     `${u.xp} / ${xpProx} XP`);

  const gci = document.getElementById('gameCoins');
  if (gci) gci.innerHTML = `${u.coins} <i class="ti ti-coin" style="font-size:14px" aria-hidden="true"></i>`;

  ['dashXPFill','gameXPFill'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.width = pct + '%';
  });
}

function _aplicarFoto(url) {
  ['sidebarAvatar','gameAvatar'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = `<img src="${url}" alt="" aria-hidden="true" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`;
  });
  const txt = document.getElementById('profileAvatarText');
  const img = document.getElementById('profileAvatarImg');
  if (txt) txt.style.display = 'none';
  if (img) { img.src = url; img.style.display = 'block'; img.alt = `Foto de perfil de ${state.user.name}`; }
}

function _renderizarDesafios(desafios) {
  const container = document.querySelector('#page-dindin .card:first-of-type .card-title');
  if (!container) return;
  const card = container.closest('.card');
  if (!card) return;

  const ativos = desafios.filter(d => !d.concluido);
  const concluidos = desafios.filter(d => d.concluido);

  card.innerHTML = `<div class="card-title">Desafios ativos</div>` +
    (ativos.length ? ativos.map(d => `
      <div class="challenge-card" style="margin-bottom:10px" role="region" aria-label="Desafio: ${d.titulo}">
        <div class="challenge-header">
          <div>
            <div class="challenge-title">${d.titulo}</div>
            <div class="challenge-sub">Dia ${d.diaAtual} de ${d.duracaoDias}</div>
          </div>
          <span class="tag tag-purple">+${d.xpRecompensa} XP</span>
        </div>
        <div class="challenge-progress-row">
          <div class="bar-bg" style="flex:1">
            <div class="bar-fill bar-purple" style="width:${d.progresso}%"></div>
          </div>
          <span style="font-size:11px;color:var(--text2)">${Math.round(d.progresso)}%</span>
        </div>
      </div>`).join('') : '<div class="li-sub" style="padding:8px 0">Nenhum desafio ativo.</div>') +
    concluidos.map(d => `
      <div class="challenge-card" role="region" aria-label="Desafio ${d.titulo} concluído">
        <div class="challenge-header">
          <div>
            <div class="challenge-title">${d.titulo}</div>
            <div class="challenge-sub">Concluído ✓</div>
          </div>
          <span class="tag tag-green">+${d.xpRecompensa} XP ✓</span>
        </div>
      </div>`).join('');
}

function _renderizarMedalhas(medalhas) {
  const grid = document.querySelector('#page-dindin .card:nth-of-type(2) .grid-3');
  if (!grid) return;
  grid.innerHTML = medalhas.map(m => `
    <div class="medal${m.conquistada ? '' : ' medal-locked'}"
         role="img"
         aria-label="Medalha: ${m.titulo}${m.conquistada ? ', conquistada' : ', bloqueada'}">
      <span class="medal-icon" aria-hidden="true">${m.emoji}</span>
      <div>${m.titulo}</div>
      ${m.conquistada && m.conquistadaEm
        ? `<div style="font-size:9px;color:var(--text3);margin-top:2px">${new Date(m.conquistadaEm).toLocaleDateString('pt-BR')}</div>`
        : ''}
    </div>`).join('');
}

function _mapTransacao(t) {
  const d = new Date(t.data ?? t.criadoEm);
  return {
    id:    t.id,
    data:  isNaN(d) ? '—' : d.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' }),
    desc:  t.descricao,
    cat:   t.categoria,
    pag:   t.formaPagamento,
    tipo:  t.tipo,
    valor: t.valor,
  };
}

function _mapMeta(m) {
  return {
    id:    m.id,
    nome:  m.nome,
    atual: m.valorAtual,
    total: m.valorTotal,
    prazo: new Date(m.prazo).toLocaleDateString('pt-BR', { month:'short', year:'numeric' }),
    color: m.cor,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD DE AVATAR
// ─────────────────────────────────────────────────────────────────────────────
window.handleAvatarUpload = function(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const url = e.target.result;
    state.user.avatarUrl = url;
    _aplicarFoto(url);
    showToast('Foto atualizada! Salve o perfil para confirmar.', 'green');
  };
  reader.readAsDataURL(file);
};

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-LOGIN ao carregar a página
// ─────────────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  if (!API.hasToken()) return; // mostra tela de login (padrão)

  try {
    const perfil = await API.getPerfil();
    if (!perfil) { API.clearToken(); return; }
    await _carregarTudo(perfil);
  } catch {
    API.clearToken();
    // permanece na tela de login
  }
});

// Animação de loading do botão de onboarding
const style = document.createElement('style');
style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(style);
