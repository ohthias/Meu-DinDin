// ══ API LAYER ══════════════════════════════════════════════
const API = (() => {
  const BASE = "/api";
  let _t = localStorage.getItem("dd_token") || "";
  const h = () => ({
    Authorization: `Bearer ${_t}`,
    "Content-Type": "application/json",
  });
  const req = async (method, path, body) => {
    const opts = { method, headers: h() };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(BASE + path, opts);
    if (res.status === 401) {
      doLogout();
      return null;
    }
    if (res.status === 204) return null;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.erro || `HTTP ${res.status}`);
    return data;
  };
  return {
    setToken(t) {
      _t = t;
      localStorage.setItem("dd_token", t);
    },
    clearToken() {
      _t = "";
      localStorage.removeItem("dd_token");
    },
    hasToken() {
      return !!_t;
    },
    login: (e, s) => req("POST", "/auth/login", { email: e, senha: s }),
    register: (b) => req("POST", "/auth/register", b),
    onboarding: (r) => req("POST", "/auth/onboarding", { respostas: r }),
    getPerfil: () => req("GET", "/auth/perfil"),
    putPerfil: (b) => req("PUT", "/auth/perfil", b),
    putSenha: (a, n) =>
      req("PUT", "/auth/senha", { senhaAtual: a, novaSenha: n }),
    getTrans: (m, a) => req("GET", `/transacoes?mes=${m}&ano=${a}`),
    postTrans: (b) => req("POST", "/transacoes", b),
    delTrans: (id) => req("DELETE", `/transacoes/${id}`),
    getResumo: (m, a) => req("GET", `/transacoes/resumo?mes=${m}&ano=${a}`),
    getResumoPer: (mi, ai, mf, af) =>
      req(
        "GET",
        `/transacoes/resumo/periodo?mesInicio=${mi}&anoInicio=${ai}&mesFim=${mf}&anoFim=${af}`,
      ),
    getEvolucao: () => req("GET", "/transacoes/evolucao?meses=6"),
    getTransPer: (mi, ai, mf, af) =>
      req(
        "GET",
        `/transacoes/periodo?mesInicio=${mi}&anoInicio=${ai}&mesFim=${mf}&anoFim=${af}`,
      ),
    getMetas: () => req("GET", "/metas"),
    postMeta: (b) => req("POST", "/metas", b),
    depositar: (id, v) => req("POST", `/metas/${id}/depositar`, { valor: v }),
    delMeta: (id) => req("DELETE", `/metas/${id}`),
    getInvs: () => req("GET", "/investimentos"),
    getInvRes: () => req("GET", "/investimentos/resumo"),
    postInv: (b) => req("POST", "/investimentos", b),
    resgatarInv: (id) => req("POST", `/investimentos/${id}/resgatar`),
    getGam: () => req("GET", "/gamificacao"),
    avancar: (id) => req("POST", `/gamificacao/desafios/${id}/avancar`),
    resgatarLoja: (b) => req("POST", "/gamificacao/loja/resgatar", b),
    getQProg: () => req("GET", "/quiz/progresso"),
    responder: (b) => req("POST", "/quiz/responder", b),
    finalizar: (b) => req("POST", "/quiz/finalizar", b),
    getRecs: (m, a) => req("GET", `/recomendacoes?mes=${m}&ano=${a}`),
    getAnalise: () => req("GET", "/recomendacoes/analise-perfil"),
    getNotif: () => req("GET", "/notificacoes"),
    countNotif: () => req("GET", "/notificacoes/count"),
    lerNotif: (id) => req("PATCH", `/notificacoes/${id}/ler`),
    lerTodas: () => req("PATCH", "/notificacoes/ler-todas"),
    getRelDados: (mi, ai, mf, af) =>
      req(
        "GET",
        `/relatorio/dados?mesInicio=${mi}&anoInicio=${ai}&mesFim=${mf}&anoFim=${af}`,
      ),
    getRelCSVUrl: (mi, ai, mf, af) =>
      `${BASE}/relatorio/csv?mesInicio=${mi}&anoInicio=${ai}&mesFim=${mf}&anoFim=${af}&token=${_t}`,
  };
})();

// ══ STATE ══════════════════════════════════════════════════
const S = {
  user: {
    id: 0,
    nome: "",
    email: "",
    fotoUrl: "",
    dataNascimento: null,
    nivel: 1,
    xp: 0,
    xpProx: 100,
    moedas: 0,
    titulo: "Iniciante",
    perfilInvestidor: "",
    nivelExperiencia: "",
    saldoConta: 0,
    scoreFinanceiro: 0,
    categoriaPerfil: "",
    itensResgatados: "[]",
  },
  trans: [],
  metas: [],
  invs: [],
  gam: null,
  quizMod: "orcamento",
  quizIdx: 0,
  quizAnswered: false,
  quizProgs: {},
  chartType: "bar",
  relPeriodo: null,
};
function periodoAtual() {
  const n = new Date();
  return { mes: n.getMonth() + 1, ano: n.getFullYear() };
}
function qs(s) {
  return document.querySelector(s);
}
function fmt(v) {
  return `R$${(+v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ══ QUIZ DATA ══════════════════════════════════════════════
const QUIZ = {
  orcamento: {
    titulo: "Orçamento pessoal",
    total: 5,
    qs: [
      {
        q: "O que é a regra 50/30/20?",
        opts: [
          "50% lazer, 30% necessidades, 20% poupança",
          "50% necessidades, 30% desejos, 20% poupança",
          "50% poupança, 30% lazer, 20% necessidades",
          "Não existe essa regra",
        ],
        c: 1,
        f: "50% necessidades básicas, 30% desejos pessoais e 20% poupança/investimentos.",
      },
      {
        q: "O que é orçamento pessoal?",
        opts: [
          "Planejamento de gastos e receitas",
          "Apenas controle de dívidas",
          "Extrato bancário",
          "Lista de compras",
        ],
        c: 0,
        f: "Orçamento é o planejamento de receitas e despesas para atingir objetivos financeiros.",
      },
      {
        q: "Qual o primeiro passo para organizar as finanças?",
        opts: [
          "Investir na bolsa",
          "Registrar todos os gastos",
          "Pedir empréstimo",
          "Cortar todo o lazer",
        ],
        c: 1,
        f: "Registrar tudo é o primeiro passo — você não pode melhorar o que não mede.",
      },
      {
        q: "O que é saldo negativo?",
        opts: [
          "Ter mais poupança que dívida",
          "Quando despesas superam receitas",
          "Ter conta bancária zerada",
          "Investir mais que 20%",
        ],
        c: 1,
        f: "Saldo negativo ocorre quando você gasta mais do que ganha no período.",
      },
      {
        q: "Como evitar gastos por impulso?",
        opts: [
          "Comprar tudo no crédito",
          "Criar lista e esperar 24h",
          "Não ir ao shopping",
          "Ignorar preços",
        ],
        c: 1,
        f: "Criar lista de compras e esperar 24h antes de compras não planejadas reduz gastos impulsivos.",
      },
    ],
  },
  reserva: {
    titulo: "Reserva de emergência",
    total: 5,
    qs: [
      {
        q: "Quantos meses de despesas deve ter a reserva de emergência?",
        opts: ["1 mês", "2 meses", "3 a 6 meses", "12 meses"],
        c: 2,
        f: "A reserva ideal cobre de 3 a 6 meses de despesas fixas mensais.",
      },
      {
        q: "Qual produto é ideal para a reserva de emergência?",
        opts: [
          "Ações da bolsa",
          "CDB sem liquidez",
          "Tesouro Selic ou poupança",
          "Fundos de renda variável",
        ],
        c: 2,
        f: "A reserva precisa de liquidez imediata: Tesouro Selic ou poupança são os mais indicados.",
      },
      {
        q: "Por que ter reserva de emergência?",
        opts: [
          "Para comprar itens de luxo",
          "Para imprevistos como perda de emprego",
          "Para viajar",
          "Para pagar contas atrasadas",
        ],
        c: 1,
        f: "A reserva cobre imprevistos e evita que você precise se endividar em momentos de crise.",
      },
      {
        q: "O que acontece sem reserva de emergência?",
        opts: [
          "Nada, não é necessária",
          "Você acumula mais patrimônio",
          "Tende a se endividar em crises",
          "Fica mais rico",
        ],
        c: 2,
        f: "Sem reserva, qualquer imprevisto pode levar ao endividamento.",
      },
      {
        q: "Qual % da renda guardar por mês para a reserva?",
        opts: ["1%", "5 a 10%", "50%", "Qualquer valor"],
        c: 1,
        f: "Guardar entre 5% e 10% da renda mensalmente é um bom começo para construir a reserva.",
      },
    ],
  },
  investimentos: {
    titulo: "Investimentos iniciais",
    total: 5,
    qs: [
      {
        q: "O que significa CDI?",
        opts: [
          "Crédito Direto Interbancos",
          "Certificado de Depósito Interbancário",
          "Custo de Depósito Imobiliário",
          "Crédito de Desenvolvimento Interno",
        ],
        c: 1,
        f: "CDI é a taxa usada em operações entre bancos e é a principal referência para renda fixa.",
      },
      {
        q: "O que é o FGC?",
        opts: [
          "Fundo de Gastos Comuns",
          "Fundo Garantidor de Créditos — seguro até R$250k",
          "Financiadora de Contas",
          "Fundo de Gestão Coletiva",
        ],
        c: 1,
        f: "O FGC garante depósitos em bancos até R$250 mil por CPF e por instituição financeira.",
      },
      {
        q: "Qual a diferença entre renda fixa e variável?",
        opts: [
          "Nenhuma diferença",
          "Renda fixa tem retorno previsível; variável oscila",
          "Renda variável é mais segura",
          "Renda fixa tem mais riscos",
        ],
        c: 1,
        f: "Renda fixa tem regras previsíveis de rendimento; renda variável (ações etc.) oscila com o mercado.",
      },
      {
        q: "Qual o valor mínimo para o Tesouro Direto?",
        opts: ["R$1.000", "R$500", "Cerca de R$30", "R$5.000"],
        c: 2,
        f: "O Tesouro Direto aceita investimentos a partir de aproximadamente R$30.",
      },
      {
        q: "O que é diversificação de investimentos?",
        opts: [
          "Investir tudo em um produto",
          "Distribuir em diferentes produtos para reduzir risco",
          "Investir só em renda variável",
          "Guardar tudo na poupança",
        ],
        c: 1,
        f: "Diversificar reduz o risco: se um investimento vai mal, os outros podem compensar.",
      },
    ],
  },
  credito: {
    titulo: "Crédito consciente",
    total: 5,
    qs: [
      {
        q: "O que é o score de crédito?",
        opts: [
          "Saldo da conta bancária",
          "Pontuação que indica probabilidade de pagar dívidas",
          "Limite do cartão de crédito",
          "Taxa de juros do banco",
        ],
        c: 1,
        f: "O score é uma pontuação que bancos usam para avaliar se você é um bom pagador.",
      },
      {
        q: "Qual o custo do rotativo do cartão no Brasil?",
        opts: ["~3% ao mês", "~10% ao mês", "~30% ao mês", "~1% ao mês"],
        c: 2,
        f: "O rotativo do cartão pode ultrapassar 300% ao ano — um dos juros mais altos do país.",
      },
      {
        q: "Parcelamento sem juros é sempre vantajoso?",
        opts: [
          "Sim, sempre",
          "O valor total já pode embutir os juros no preço",
          "É um tipo de investimento",
          "Não existe no Brasil",
        ],
        c: 1,
        f: "Muitas vezes o lojista já inclui o custo do parcelamento no preço. Compare com o pagamento à vista.",
      },
      {
        q: "Como aumentar o score de crédito?",
        opts: [
          "Fazer muitos empréstimos",
          "Pagar contas em dia e manter dados atualizados",
          "Gastar mais no cartão",
          "Pedir aumento de limite sempre",
        ],
        c: 1,
        f: "Pagar em dia, manter dados atualizados e usar crédito com moderação aumentam o score.",
      },
      {
        q: "Melhor estratégia para quitar dívidas?",
        opts: [
          "Ignorar a menor",
          "Quitar primeiro a de maior juros (avalanche)",
          "Pagar só o mínimo",
          "Novo empréstimo para pagar",
        ],
        c: 1,
        f: "O método avalanche paga primeiro a dívida com maior taxa de juros, economizando mais dinheiro.",
      },
    ],
  },
};
const OB_QS = [
  {
    q: "Qual é a sua principal fonte de renda?",
    d: "Isso nos ajuda a entender seu contexto financeiro.",
    opts: [
      "🎓 Bolsa/Estágio",
      "💼 Emprego CLT",
      "🛠️ Freelance/Autônomo",
      "👨‍👩‍👧 Ajuda familiar",
    ],
  },
  {
    q: "Qual é seu maior desafio financeiro?",
    d: "Vamos personalizar as dicas para você.",
    opts: [
      "💸 Gasto mais do que ganho",
      "🎯 Não consigo poupar",
      "📈 Não sei investir",
      "💳 Tenho dívidas",
    ],
  },
  {
    q: "Qual é seu objetivo principal?",
    d: "Seu objetivo guia nossas recomendações.",
    opts: [
      "🛡️ Criar reserva de emergência",
      "✈️ Poupar para viagem/compra",
      "📊 Começar a investir",
      "💰 Quitar dívidas",
    ],
  },
  {
    q: "Como você lida com investimentos hoje?",
    d: "Vamos sugerir o nível ideal para você.",
    opts: [
      "🔰 Nunca investi",
      "🏦 Só tenho poupança",
      "📉 Conheço renda fixa",
      "🚀 Invisto em renda variável",
    ],
  },
  {
    q: "Quanto da renda você consegue guardar por mês?",
    d: "Ajuda a criar metas realistas.",
    opts: [
      "😅 Menos de 5%",
      "😊 Entre 5% e 10%",
      "😎 Entre 10% e 20%",
      "🤑 Mais de 20%",
    ],
  },
  {
    q: "Você tem alguma necessidade de acessibilidade?",
    d: "Queremos garantir a melhor experiência.",
    opts: [
      "👁️ Alto contraste",
      "🔤 Textos maiores",
      "🤟 Preferência Libras",
      "✅ Nenhuma",
    ],
  },
];
let obStep = 0,
  obAnswers = {};

// ══ AUTH ═══════════════════════════════════════════════════
function setAuthMode(m) {
  ["login", "reg"].forEach((t) => {
    qs("#tab-" + t).classList.toggle("active", t === m);
    qs("#panel-" + t).style.display = t === m ? "block" : "none";
    qs("#tab-" + t).setAttribute("aria-selected", t === m);
  });
}
function togglePass(id, btn) {
  const inp = qs("#" + id),
    p = inp.type === "password";
  inp.type = p ? "text" : "password";
  btn.querySelector("i").className = p ? "ti ti-eye-off" : "ti ti-eye";
}
async function doLogin() {
  const e = qs("#l-email").value.trim(),
    p = qs("#l-pass").value;
  if (!e || !p) {
    showToast("Preencha e-mail e senha", "red");
    return;
  }
  try {
    const r = await API.login(e, p);
    if (!r) return;
    API.setToken(r.token);
    applyAuth(r);
    if (!r.onboardingCompleto) {
      obStep = 0;
      obAnswers = {};
      initOb();
      showScreen("screen-onboarding");
    } else {
      await loadAll();
      showScreen("screen-app");
    }
  } catch (err) {
    showToast(err.message, "red");
  }
}
async function doRegister() {
  const nome = qs("#r-nome").value.trim(),
    email = qs("#r-email").value.trim(),
    nasc = qs("#r-nasc").value,
    senha = qs("#r-pass").value;
  if (!nome || !email || !nasc || !senha) {
    showToast("Preencha todos os campos", "red");
    return;
  }
  if (senha.length < 8) {
    showToast("Senha mín. 8 caracteres", "red");
    return;
  }
  try {
    const r = await API.register({ nome, email, senha, dataNascimento: nasc });
    if (!r) return;
    API.setToken(r.token);
    applyAuth(r);
    obStep = 0;
    obAnswers = {};
    initOb();
    showScreen("screen-onboarding");
  } catch (err) {
    showToast(err.message, "red");
  }
}
function doLogout() {
  API.clearToken();
  showScreen("screen-auth");
}
function applyAuth(r) {
  Object.assign(S.user, {
    id: r.usuarioId || r.id,
    nome: r.nome,
    email: r.email,
    fotoUrl: r.fotoUrl,
    dataNascimento: r.dataNascimento,
    saldoConta: r.saldoConta || 0,
    nivel: r.nivel || 1,
    xp: r.xp || 0,
    xpProx: r.xpProximoNivel || 100,
    moedas: r.moedas || 0,
    titulo: r.nomeTitulo || "Iniciante",
    perfilInvestidor: r.perfilInvestidor || "",
    nivelExperiencia: r.nivelExperiencia || "",
    scoreFinanceiro: r.scoreFinanceiro || 0,
    categoriaPerfil: r.categoriaPerfil || "",
    itensResgatados: r.itensResgatados || "[]",
  });
  if (r.altoContraste) toggleHighContrast(true);
  if (r.textoGrande) toggleLargeText(true);
  if (r.reduzirAnimacoes) toggleReduceMotion(true);
  if (r.preferenciaLibras) {
    const t = qs("#togLibras");
    if (t) t.checked = true;
    ativarVlibras();
  }
}

// ══ ONBOARDING ═════════════════════════════════════════════
function initOb() {
  renderObDots();
  renderObQ();
}
function renderObDots() {
  qs("#obDots").innerHTML = OB_QS.map(
    (_, i) =>
      `<div class="ob-dot${i < obStep ? " done" : i === obStep ? " active" : ""}"></div>`,
  ).join("");
  qs("#obCounter").textContent = `${obStep + 1} de ${OB_QS.length}`;
  qs("#btnObBack").style.visibility = obStep > 0 ? "visible" : "hidden";
}
function renderObQ() {
  const q = OB_QS[obStep],
    sel = obAnswers[obStep];
  qs("#obContent").innerHTML =
    `<div class="ob-q">${q.q}</div><div class="ob-qdesc">${q.d}</div><div class="ob-opts">${q.opts.map((o, i) => `<button class="ob-opt${sel === i ? " selected" : ""}" onclick="selOb(${i})" aria-pressed="${sel === i}">${o}</button>`).join("")}</div>`;
  qs("#btnObNext").disabled = sel === undefined;
  qs("#btnObNext").innerHTML =
    obStep === OB_QS.length - 1
      ? 'Começar <i class="ti ti-rocket"></i>'
      : 'Próxima <i class="ti ti-arrow-right"></i>';
}
function selOb(i) {
  obAnswers[obStep] = i;
  renderObQ();
}
function obBack() {
  if (obStep > 0) {
    obStep--;
    renderObDots();
    renderObQ();
  }
}
async function obNext() {
  if (obAnswers[obStep] === undefined) return;
  if (obStep < OB_QS.length - 1) {
    obStep++;
    renderObDots();
    renderObQ();
    return;
  }
  const respostas = Object.entries(obAnswers).map(([p, r]) => ({
    perguntaIndex: +p,
    respostaIndex: r,
    respostaTexto: OB_QS[+p].opts[r],
  }));
  try {
    await API.onboarding(respostas);
    const a5 = obAnswers[5];
    if (a5 === 0) toggleHighContrast(true);
    if (a5 === 1) toggleLargeText(true);
    if (a5 === 2) ativarVlibras();
    await loadAll();
    showScreen("screen-app");
  } catch (e) {
    showToast("Erro ao salvar: " + e.message, "red");
  }
}

// ══ NAVIGATION ═════════════════════════════════════════════
function showScreen(id) {
  document
    .querySelectorAll(".screen")
    .forEach((s) => s.classList.remove("active"));
  qs("#" + id).classList.add("active");
}
function showPage(name) {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document.querySelectorAll(".nav-item,.bnav-item").forEach((n) => {
    n.classList.remove("active");
    n.removeAttribute("aria-current");
  });
  const pg = qs("#page-" + name);
  if (pg) pg.classList.add("active");
  const nv = qs("#nav-" + name);
  if (nv) {
    nv.classList.add("active");
    nv.setAttribute("aria-current", "page");
  }
  const bn = qs("#bnav-" + name);
  if (bn) bn.classList.add("active");
  if (name === "relatorio") loadRelatorio();
  if (name === "investir") loadInvestimentos();
  if (name === "dindin") loadGamificacao();
  if (name === "perfil") loadPerfil();
  if (name === "quiz") initQuizPage();
  if (name === "metas") loadMetas();
  window.scrollTo(0, 0);
}

// ══ LOAD ALL ═══════════════════════════════════════════════
async function loadAll() {
  const n = periodoAtual();
  updateSidebarUI();
  try {
    const [trans, metas, resumo, recs, gam, analise, notifCount] =
      await Promise.all([
        API.getTrans(n.mes, n.ano),
        API.getMetas(),
        API.getResumo(n.mes, n.ano),
        API.getRecs(n.mes, n.ano),
        API.getGam(),
        API.getAnalise(),
        API.countNotif(),
      ]);
    if (trans) S.trans = trans.map(toTransLocal);
    if (metas) S.metas = metas;
    if (gam) {
      S.gam = gam;
      applyGam(gam);
    }
    if (analise) {
      S.user.scoreFinanceiro = analise.scoreFinanceiro;
      S.user.categoriaPerfil = analise.categoriaPerfil;
    }
    if (resumo) applyResumo(resumo);
    if (recs) applyRecs(recs);
    if (notifCount) updateNotifBadge(notifCount.count);
    renderTrans();
    renderDashTrans();
    renderDashMetas();
    renderCharts();
    renderScore();
    await loadEvolucao();
    showPage("dashboard");
  } catch (e) {
    console.error(e);
    showPage("dashboard");
  }
}
function updateSidebarUI() {
  const u = S.user,
    ini =
      u.nome
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "?";
  qs("#sidebarName").textContent = u.nome || "—";
  qs("#sidebarLevel").textContent = `Nível ${u.nivel} · ${u.xp} XP`;
  qs("#dashName").textContent = u.nome.split(" ")[0] || "—";
  const dt = new Date(),
    months = [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro",
    ];
  qs("#dashDate").textContent =
    `${months[dt.getMonth()]} de ${dt.getFullYear()}`;
  setAvatar("sidebarAv", ini, u.fotoUrl);
}
function setAvatar(elId, ini, url) {
  const el = qs("#" + elId);
  if (!el) return;
  if (url)
    el.innerHTML = `<img src="${url}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`;
  else el.textContent = ini;
}
function applyResumo(r) {
  qs("#m-saldo").textContent = fmt(S.user.saldoConta);
  qs("#m-rec").textContent = fmt(r.totalReceitas);
  qs("#m-dep").textContent = fmt(r.totalDespesas);
  qs("#m-econ").textContent = fmt(r.economia);
  qs("#m-econ-sub").textContent = `${r.percentualEconomia || 0}% da renda`;
  qs("#totRec").textContent = `Receitas +${fmt(r.totalReceitas)}`;
  qs("#totDep").textContent = `Despesas -${fmt(r.totalDespesas)}`;
  renderOrcamento(r);
}
function applyRecs(recs) {
  const rc = qs("#dashRec");
  if (!rc || !recs.length) return;
  const r = recs[0],
    c =
      {
        alerta: "var(--red)",
        parabens: "var(--green)",
        dica: "var(--green-mid)",
      }[r.tipo] || "var(--text)";
  rc.className =
    "rec-card" +
    (r.tipo === "parabens" || r.tipo === "dica" ? " rec-card-green" : "");
  rc.innerHTML = `${r.icone} <strong style="color:${c}">${r.titulo}:</strong> ${r.mensagem}`;
}
function applyGam(g) {
  S.user.nivel = g.nivel;
  S.user.xp = g.xp;
  S.user.xpProx = g.xpProximoNivel;
  S.user.moedas = g.moedas;
  S.user.titulo = g.nomeTitulo;
  const pct =
    g.xpProximoNivel > 0
      ? Math.min(100, Math.round((g.xp / g.xpProximoNivel) * 100))
      : 0;
  qs("#dashXPLabel").textContent = `Nível ${g.nivel} · ${g.nomeTitulo}`;
  qs("#dashXPSub").textContent = `${g.xp} / ${g.xpProximoNivel} XP`;
  qs("#dashXPFill").style.width = pct + "%";
  qs("#sidebarLevel").textContent = `Nível ${g.nivel} · ${g.xp} XP`;
  const ativ = (g.desafios || []).find((d) => !d.concluido);
  const dd = qs("#dashDesafio");
  if (dd && ativ)
    dd.innerHTML = `<div style="display:flex;justify-content:space-between;margin-bottom:7px"><div><div class="li-title">${ativ.titulo}</div><div class="li-sub">Dia ${ativ.diaAtual}/${ativ.duracaoDias} · +${ativ.xpRecompensa} XP</div></div></div><div class="bar-bg"><div class="bar-fill bar-purple" style="width:${ativ.progresso}%"></div></div><div style="font-size:10px;color:var(--text2);margin-top:3px;text-align:right">${ativ.progresso}%</div>`;
  else if (dd)
    dd.innerHTML =
      '<div class="li-sub" style="text-align:center;padding:8px">Sem desafios ativos</div>';
}
function renderScore() {
  const sc = S.user.scoreFinanceiro || 0,
    ct = S.user.categoriaPerfil || "—";
  qs("#scoreNum").textContent = sc.toFixed(0);
  qs("#scoreCat").textContent = ct;
  const circ = qs("#scoreCircle");
  if (circ) {
    const da = 2 * Math.PI * 45,
      of = da - (sc / 100) * da;
    circ.style.strokeDashoffset = of;
    circ.style.stroke =
      sc >= 70 ? "var(--green-mid)" : sc >= 40 ? "var(--xp)" : "var(--red)";
  }
}

// ══ TRANSAÇÕES ═════════════════════════════════════════════
function toTransLocal(t) {
  return {
    id: t.id,
    tipo: t.tipo,
    valor: t.valor,
    cat: t.categoria,
    desc: t.descricao,
    pag: t.formaPagamento,
    data: new Date(t.data).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    }),
  };
}
async function addTrans(tipo) {
  const p = tipo === "receita" ? "r" : "d";
  const v = parseFloat(qs("#" + p + "v")?.value),
    c = qs("#" + p + "c")?.value,
    d = qs("#" + p + "d")?.value,
    desc = qs("#" + p + "desc")?.value || "",
    pag = qs("#dpag")?.value || "Débito";
  if (!v || v <= 0) {
    showToast("Valor inválido", "red");
    return;
  }
  if (!d) {
    showToast("Informe a data", "red");
    return;
  }
  try {
    const saved = await API.postTrans({
      tipo,
      valor: v,
      categoria: c,
      descricao: desc || c,
      formaPagamento: tipo === "receita" ? "Transferência" : pag,
      data: new Date(d).toISOString(),
    });
    if (saved) {
      S.trans.unshift(toTransLocal(saved));
      if (tipo === "receita") S.user.saldoConta += v;
      else S.user.saldoConta -= v;
    }
    qs("#" + p + "v").value = "";
    if (qs("#" + p + "desc")) qs("#" + p + "desc").value = "";
    renderTrans();
    renderDashTrans();
    qs("#m-saldo").textContent = fmt(S.user.saldoConta);
    await refreshResumo();
    showToast(
      tipo === "receita" ? "Receita salva! +10 XP 🎉" : "Despesa registrada!",
      tipo === "receita" ? "green" : "",
    );
  } catch (e) {
    showToast(e.message, "red");
  }
}
async function addTransModal() {
  const isRec = qs("#mt-tab-rec").classList.contains("active");
  const v = parseFloat(qs("#mt-v")?.value),
    c = qs("#mt-c")?.value,
    d = qs("#mt-d")?.value,
    desc = qs("#mt-desc")?.value || "";
  if (!v || v <= 0 || !d) {
    showToast("Preencha todos os campos", "red");
    return;
  }
  try {
    const saved = await API.postTrans({
      tipo: isRec ? "receita" : "despesa",
      valor: v,
      categoria: c,
      descricao: desc || c,
      formaPagamento: isRec ? "Transferência" : "Débito",
      data: new Date(d).toISOString(),
    });
    if (saved) {
      S.trans.unshift(toTransLocal(saved));
      if (isRec) S.user.saldoConta += v;
      else S.user.saldoConta -= v;
    }
    closeModal("modalTrans");
    renderTrans();
    renderDashTrans();
    qs("#m-saldo").textContent = fmt(S.user.saldoConta);
    await refreshResumo();
    showToast("Transação salva! +10 XP", "green");
  } catch (e) {
    showToast(e.message, "red");
  }
}
function setModalTab(t) {
  ["rec", "dep"].forEach((x) =>
    qs("#mt-tab-" + x)?.classList.toggle("active", x === t),
  );
  const c = qs("#mt-c");
  if (!c) return;
  c.innerHTML =
    t === "rec"
      ? "<option>Salário</option><option>Estágio</option><option>Bolsa</option><option>Freelance</option><option>Presente</option><option>Outro</option>"
      : "<option>Alimentação</option><option>Transporte</option><option>Lazer</option><option>Saúde</option><option>Moradia</option><option>Educação</option><option>Streaming</option><option>Outro</option>";
}
async function delTrans(id) {
  try {
    const t = S.trans.find((x) => x.id === id);
    if (t) S.user.saldoConta += t.tipo === "receita" ? -t.valor : t.valor;
    await API.delTrans(id);
    S.trans = S.trans.filter((x) => x.id !== id);
    renderTrans();
    renderDashTrans();
    await refreshResumo();
  } catch (e) {
    showToast(e.message, "red");
  }
}
function renderTrans() {
  const search = (qs("#searchT")?.value || "").toLowerCase();
  const filtered = S.trans.filter(
    (t) =>
      t.desc.toLowerCase().includes(search) ||
      t.cat.toLowerCase().includes(search),
  );
  const tb = qs("#tbodyT");
  if (!tb) return;
  if (!filtered.length) {
    tb.innerHTML =
      '<tr><td colspan="7" style="text-align:center;color:var(--text2);padding:18px">Nenhuma transação</td></tr>';
    return;
  }
  tb.innerHTML = filtered
    .map(
      (t) =>
        `<tr><td>${t.data}</td><td>${t.desc}</td><td style="font-size:11px">${t.cat}</td><td style="font-size:11px;color:var(--text2)">${t.pag}</td><td><span class="tag ${t.tipo === "receita" ? "tag-green" : "tag-red"}">${t.tipo === "receita" ? "Receita" : "Despesa"}</span></td><td style="text-align:right" class="${t.tipo === "receita" ? "amt-pos" : "amt-neg"}">${t.tipo === "receita" ? "+" : "-"}R$${t.valor.toFixed(2)}</td><td><button class="btn-icon" onclick="delTrans(${t.id})" style="width:26px;height:26px" aria-label="Excluir transação ${t.desc}"><i class="ti ti-trash" style="font-size:13px;color:var(--red)"></i></button></td></tr>`,
    )
    .join("");
}
function renderDashTrans() {
  const el = qs("#dashTrans");
  if (!el) return;
  const items = S.trans.slice(0, 5);
  if (!items.length) {
    el.innerHTML =
      '<div class="li-sub" style="text-align:center;padding:12px">Nenhuma transação ainda</div>';
    return;
  }
  el.innerHTML = items
    .map(
      (t) =>
        `<div class="li"><div><div class="li-title">${t.cat} — ${t.desc}</div><div class="li-sub">${t.data} · ${t.pag}</div></div><div class="${t.tipo === "receita" ? "amt-pos" : "amt-neg"}">${t.tipo === "receita" ? "+" : "-"}R$${t.valor.toFixed(2)}</div></div>`,
    )
    .join("");
}
async function refreshResumo() {
  const n = periodoAtual();
  try {
    const r = await API.getResumo(n.mes, n.ano);
    if (r) applyResumo(r);
    qs("#m-saldo").textContent = fmt(S.user.saldoConta);
    renderCharts();
  } catch (e) {}
}
function renderOrcamento(r) {
  const tb = qs("#tbodyOrc");
  if (!tb) return;
  const lim = r.totalReceitas * 0.3;
  if (!r.gastosPorCategoria?.length) {
    tb.innerHTML =
      '<tr><td colspan="5" style="text-align:center;color:var(--text2)">Sem dados</td></tr>';
    return;
  }
  tb.innerHTML = r.gastosPorCategoria
    .map((c) => {
      const pct = lim > 0 ? Math.round((c.total / lim) * 100) : 0;
      const cls = pct > 90 ? "tag-red" : pct > 70 ? "tag-amber" : "tag-green";
      return `<tr><td>${c.categoria}</td><td>R$${c.total.toFixed(0)}</td><td>R$${lim.toFixed(0)}</td><td><div class="bar-bg"><div class="bar-fill ${pct > 90 ? "bar-red" : "bar-green"}" style="width:${Math.min(100, pct)}%"></div></div></td><td><span class="tag ${cls}">${pct}%</span></td></tr>`;
    })
    .join("");
}

// ══ METAS ══════════════════════════════════════════════════
async function loadMetas() {
  try {
    const m = await API.getMetas();
    if (m) {
      S.metas = m;
      renderMetas();
    }
  } catch (e) {}
}
async function addMetaModal() {
  const n = qs("#mm-n")?.value.trim(),
    t = parseFloat(qs("#mm-t")?.value),
    a = parseFloat(qs("#mm-a")?.value) || 0,
    p = qs("#mm-p")?.value;
  if (!n || !t || !p) {
    showToast("Preencha todos os campos", "red");
    return;
  }
  const cols = ["#4A9B2E", "#378ADD", "#7F77DD", "#EF9F27", "#D94B3A"];
  try {
    const saved = await API.postMeta({
      nome: n,
      valorTotal: t,
      valorAtual: a,
      prazo: new Date(p + "-01").toISOString(),
      cor: cols[S.metas.length % cols.length],
    });
    if (saved) S.metas.push(saved);
    renderMetas();
    renderDashMetas();
    closeModal("modalMeta");
    showToast("Meta criada! +25 XP 🎯", "green");
  } catch (e) {
    showToast(e.message, "red");
  }
}
function openDepositar(id) {
  qs("#md-meta-id").value = id;
  qs("#md-saldo").textContent = fmt(S.user.saldoConta);
  qs("#md-v").value = "";
  openModal("modalDepositar");
}
async function confirmarDeposito() {
  const id = +qs("#md-meta-id").value,
    v = parseFloat(qs("#md-v").value);
  if (!v || v <= 0) {
    showToast("Informe um valor", "red");
    return;
  }
  try {
    const r = await API.depositar(id, v);
    if (r) {
      const idx = S.metas.findIndex((m) => m.id === id);
      if (idx >= 0) S.metas[idx] = r;
      S.user.saldoConta -= v;
    }
    closeModal("modalDepositar");
    renderMetas();
    renderDashMetas();
    qs("#m-saldo").textContent = fmt(S.user.saldoConta);
    showToast("Depósito realizado na meta! 🎯", "green");
  } catch (e) {
    showToast(e.message, "red");
  }
}
async function deleteMeta(id) {
  try {
    await API.delMeta(id);
    S.metas = S.metas.filter((m) => m.id !== id);
    renderMetas();
    renderDashMetas();
  } catch (e) {
    showToast(e.message, "red");
  }
}
function renderMetas() {
  const g = qs("#metasGrid");
  if (!g) return;
  g.innerHTML =
    S.metas
      .map((m) => {
        const pct = Math.min(
          100,
          Math.round(((m.valorAtual || 0) / (m.valorTotal || 1)) * 100),
        );
        const prazoStr = m.prazo
          ? new Date(m.prazo).toLocaleDateString("pt-BR", {
              month: "short",
              year: "numeric",
            })
          : "—";
        return `<div class="card"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:9px"><div><div style="font-size:13px;font-weight:600">${m.nome}</div><div class="li-sub">Prazo: ${prazoStr}</div></div><span class="tag tag-green">${pct}%</span></div><div style="font-size:18px;font-weight:700;color:var(--green);font-family:var(--mono)">R$${(m.valorAtual || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</div><div class="li-sub" style="margin-bottom:7px">de R$${(m.valorTotal || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</div><div class="bar-bg"><div class="bar-fill" style="width:${pct}%;background:${m.cor || "var(--green-mid)"}"></div></div><div style="display:flex;gap:6px;margin-top:9px"><button class="btn btn-green" style="flex:1;justify-content:center;font-size:11px" onclick="openDepositar(${m.id})"><i class="ti ti-plus"></i> Depositar</button><button class="btn btn-ghost" style="flex:1;justify-content:center;font-size:11px;color:var(--red)" onclick="deleteMeta(${m.id})"><i class="ti ti-trash"></i></button></div></div>`;
      })
      .join("") +
    `<div class="card" style="border:1px dashed var(--border2);display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;min-height:130px" onclick="openModal('modalMeta')" role="button" tabindex="0" aria-label="Nova meta"><i class="ti ti-plus" style="font-size:22px;color:var(--text3);margin-bottom:5px"></i><div style="font-size:12px;color:var(--text2)">Nova meta</div></div>`;
}
function renderDashMetas() {
  const el = qs("#dashMetaCard");
  if (!el) return;
  if (!S.metas.length) {
    el.innerHTML =
      '<div class="card-title">Metas</div><div class="li-sub" style="text-align:center;padding:8px">Sem metas</div>';
    return;
  }
  const m = S.metas[0],
    pct = Math.min(
      100,
      Math.round(((m.valorAtual || 0) / (m.valorTotal || 1)) * 100),
    );
  el.innerHTML = `<div class="card-hd"><span class="card-title">${m.nome}</span><span class="tag tag-green">${pct}%</span></div><div style="font-size:16px;font-weight:700;color:var(--green);font-family:var(--mono)">R$${(m.valorAtual || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</div><div class="li-sub" style="margin-bottom:6px">de R$${(m.valorTotal || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</div><div class="bar-bg"><div class="bar-fill bar-green" style="width:${pct}%"></div></div>`;
}

// ══ INVESTIMENTOS ══════════════════════════════════════════
async function loadInvestimentos() {
  try {
    const [invs, res] = await Promise.all([API.getInvs(), API.getInvRes()]);
    S.invs = invs || [];
    updateInvCards(res || []);
    const total = (res || []).reduce((a, x) => a + (x.totalAportado || 0), 0);
    const rend = (res || []).reduce(
      (a, x) => a + (x.rendimentoEstimado || 0),
      0,
    );
    qs("#invTotal").textContent = fmt(total);
    qs("#invRend").textContent = `+R$${rend.toFixed(2)}`;
    qs("#invSaldo").textContent = fmt(S.user.saldoConta);
    renderDicasInv();
  } catch (e) {}
}
function updateInvCards(res) {
  [
    ["Poupança", "p"],
    ["TesouroDireto", "t"],
    ["CDB", "c"],
  ].forEach(([tipo, prefix]) => {
    const item = res.find((r) => r.tipo === tipo);
    const v = item?.totalAportado || 0,
      r = item?.rendimentoEstimado || 0;
    const vEl = qs("#inv-" + prefix + "-val"),
      rEl = qs("#inv-" + prefix + "-rend");
    if (vEl) vEl.textContent = `R$${v.toFixed(2)}`;
    if (rEl) rEl.textContent = `+R$${r.toFixed(2)}`;
  });
}
function toggleInv(id) {
  const p = qs("#" + id);
  if (p) p.classList.toggle("open");
}
function openModalAporte(tipo) {
  if (qs("#ma-tipo")) qs("#ma-tipo").value = tipo;
  qs("#ma-saldo").textContent = fmt(S.user.saldoConta);
  qs("#ma-v").value = "";
  openModal("modalAporte");
}
async function confirmarAporte() {
  const tipo = qs("#ma-tipo")?.value,
    v = parseFloat(qs("#ma-v")?.value);
  if (!v || v < 30) {
    showToast("Valor mínimo R$30,00", "red");
    return;
  }
  if (v > S.user.saldoConta) {
    showToast("Saldo insuficiente", "red");
    return;
  }
  try {
    const r = await API.postInv({
      tipo,
      valor: v,
      dataAporte: new Date().toISOString(),
    });
    if (r) {
      S.user.saldoConta -= v;
      S.invs.push(r);
    }
    closeModal("modalAporte");
    await loadInvestimentos();
    qs("#m-saldo").textContent = fmt(S.user.saldoConta);
    showToast("Aporte realizado! +50 XP 🎉", "green");
  } catch (e) {
    showToast(e.message, "red");
  }
}
function resgatarInvModal(tipo) {
  const items = S.invs.filter((i) => i.tipo === tipo);
  if (!items.length) {
    showToast("Nenhum aporte em " + tipo, "red");
    return;
  }
  if (
    confirm(
      `Resgatar investimento em ${tipo}? O valor + rendimento voltará para o saldo.`,
    )
  )
    items.forEach((i) => doResgatar(i.id));
}
async function doResgatar(id) {
  try {
    const r = await API.resgatarInv(id);
    if (r) S.user.saldoConta += r.valorResgatado || 0;
    await loadInvestimentos();
    qs("#m-saldo").textContent = fmt(S.user.saldoConta);
    showToast("Resgate realizado!", "green");
  } catch (e) {
    showToast(e.message, "red");
  }
}
function renderDicasInv() {
  const el = qs("#dicasInv");
  if (!el) return;
  el.innerHTML = `<div class="rec-card rec-card-green">🎯 <strong>Reserva primeiro:</strong> Guarde 3 a 6 meses de despesas no Tesouro Selic antes de diversificar.</div><div class="rec-card rec-card-blue">📐 <strong>Regra 50/30/20:</strong> Reserve 20% da renda para poupar e investir.</div><div class="rec-card">⚡ <strong>Comece pequeno:</strong> O Tesouro Selic aceita a partir de R$30. Comece hoje!</div>`;
}

// ══ GAMIFICAÇÃO ════════════════════════════════════════════
const LOJA_ITEMS = [
  { id: "tema-escuro", nome: "Tema noturno", icone: "🌙", custo: 500 },
  { id: "avatar-raposa", nome: "Avatar raposa", icone: "🦊", custo: 300 },
  { id: "tema-verde", nome: "Tema verde", icone: "🎨", custo: 700 },
  { id: "moldura-ouro", nome: "Moldura ouro", icone: "💎", custo: 1000 },
];
async function loadGamificacao() {
  try {
    const g = await API.getGam();
    if (!g) return;
    S.gam = g;
    applyGam(g);
    renderDesafios(g.desafios || []);
    renderMedalhas(g.medalhas || []);
    renderLoja();
    const ini =
      S.user.nome
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2) || "?";
    setAvatar("gameAv", ini, S.user.fotoUrl);
    qs("#gameName").textContent =
      `${S.user.nome} · Nível ${g.nivel} — ${g.nomeTitulo}`;
    qs("#gameLevel").textContent =
      `${g.xp} XP · Próximo nível em ${Math.max(0, g.xpProximoNivel - g.xp)} XP`;
    qs("#gameCoins").textContent = g.moedas;
    const pct =
      g.xpProximoNivel > 0
        ? Math.min(100, Math.round((g.xp / g.xpProximoNivel) * 100))
        : 0;
    qs("#gameXPFill").style.width = pct + "%";
  } catch (e) {}
}
function renderDesafios(ds) {
  const el = qs("#desafiosLista");
  if (!el) return;
  if (!ds.length) {
    el.innerHTML =
      '<div class="li-sub" style="text-align:center;padding:8px">Sem desafios</div>';
    return;
  }
  el.innerHTML = ds
    .map(
      (d) =>
        `<div class="ch-card"><div style="display:flex;justify-content:space-between"><div><div class="ch-title">${d.titulo}</div><div class="ch-sub">Dia ${d.diaAtual}/${d.duracaoDias}${d.concluido ? " · ✅" : ""}</div></div><span class="tag ${d.concluido ? "tag-green" : "tag-purple"}">+${d.xpRecompensa} XP</span></div>${!d.concluido ? `<div class="ch-prog"><div class="bar-bg" style="flex:1"><div class="bar-fill bar-purple" style="width:${d.progresso}%"></div></div><span style="font-size:11px;color:var(--text2)">${d.progresso}%</span></div><button class="btn-sm" style="margin-top:7px;font-size:11px" onclick="avancarDesafio(${d.id})">✓ Marcar dia</button>` : ""}</div>`,
    )
    .join("");
}
async function avancarDesafio(id) {
  try {
    const r = await API.avancar(id);
    if (r)
      showToast(
        r.concluido
          ? `🏆 Desafio concluído! +${r.xpRecompensa} XP`
          : "Dia marcado! 🔥",
        "green",
      );
    await loadGamificacao();
  } catch (e) {
    showToast(e.message, "red");
  }
}
function renderMedalhas(ms) {
  const el = qs("#medalhasGrid");
  if (!el) return;
  el.innerHTML = ms
    .map(
      (m) =>
        `<div class="medal${m.conquistada ? "" : " medal-locked"}" role="img" aria-label="${m.titulo}${m.conquistada ? ", conquistada" : ", bloqueada"}"><span class="medal-icon" aria-hidden="true">${m.emoji}</span><div>${m.titulo}</div></div>`,
    )
    .join("");
}
function renderLoja() {
  const el = qs("#lojaGrid");
  if (!el) return;
  let itens = [];
  try {
    itens = JSON.parse(S.user.itensResgatados || "[]");
  } catch (e) {}
  el.innerHTML = LOJA_ITEMS.map((item) => {
    const owns = itens.includes(item.id),
      canBuy = S.user.moedas >= item.custo && !owns;
    return `<div style="border:1px solid var(--border);border-radius:8px;padding:11px;text-align:center;${!canBuy && !owns ? "opacity:.45" : ""}"><div style="font-size:26px;margin-bottom:5px" aria-hidden="true">${item.icone}</div><div style="font-size:12px;font-weight:600">${item.nome}</div><div style="font-size:11px;color:var(--text2);margin:3px 0">${owns ? "✅ Resgatado" : `${item.custo} moedas`}</div><button class="btn-sm" style="font-size:11px;margin-top:4px" ${owns || !canBuy ? "disabled" : ""} onclick="comprarItem('${item.id}',${item.custo},'${item.nome}')">${owns ? "Ativo" : canBuy ? "Resgatar" : "Bloqueado"}</button></div>`;
  }).join("");
}
async function comprarItem(id, custo, nome) {
  try {
    await API.resgatarLoja({ itemId: id, custo, nomeItem: nome });
    S.user.moedas -= custo;
    let itens = [];
    try {
      itens = JSON.parse(S.user.itensResgatados || "[]");
    } catch (e) {}
    itens.push(id);
    S.user.itensResgatados = JSON.stringify(itens);
    renderLoja();
    qs("#gameCoins").textContent = S.user.moedas;
    showToast(`🎁 ${nome} resgatado!`, "green");
  } catch (e) {
    showToast(e.message, "red");
  }
}

// ══ QUIZ ═══════════════════════════════════════════════════
function initQuizPage() {
  renderQuizMods();
  if (!qs("#qOpts").innerHTML) renderQuizQ();
}
async function renderQuizMods() {
  const el = qs("#quizModulos");
  if (!el) return;
  try {
    const progs = await API.getQProg();
    S.quizProgs = {};
    (progs || []).forEach((p) => (S.quizProgs[p.modulo] = p));
  } catch (e) {}
  el.innerHTML = Object.entries(QUIZ)
    .map(([k, v]) => {
      const p = S.quizProgs[k],
        done = p?.concluido,
        started = p && p.totalRespostas > 0;
      return `<div class="li" style="cursor:pointer" onclick="selectMod('${k}')" role="button" tabindex="0" aria-label="Módulo ${v.titulo}"><div><div style="font-weight:600">${v.titulo}</div><div class="li-sub">${v.total} questões</div></div><span class="tag ${done ? "tag-green" : started ? "tag-purple" : "tag-blue"}">${done ? "Concluído" : started ? "Em curso" : "Disponível"}</span></div>`;
    })
    .join("");
  const tip = qs("#quizTip");
  if (tip)
    tip.textContent =
      S.user.desafioFinanceiro === "Não sabe investir"
        ? "Comece pelo módulo Investimentos para aprender com segurança."
        : "Registre transações diariamente para ativar análises precisas.";
}
function selectMod(m) {
  S.quizMod = m;
  S.quizIdx = 0;
  S.quizAnswered = false;
  renderQuizQ();
}
function renderQuizQ() {
  const mod = QUIZ[S.quizMod],
    q = mod.qs[S.quizIdx];
  qs("#qNum").textContent = S.quizIdx + 1;
  qs("#qTotal").textContent = mod.total;
  qs("#qText").textContent = q.q;
  qs("#qDots").innerHTML = mod.qs
    .map(
      (_, i) =>
        `<div style="width:20px;height:3px;border-radius:2px;background:${i <= S.quizIdx ? "var(--xp)" : "var(--bg3)"}"></div>`,
    )
    .join("");
  const L = ["A", "B", "C", "D"];
  qs("#qOpts").innerHTML = q.opts
    .map(
      (o, i) =>
        `<button class="qopt" id="qo${i}" onclick="answerQ(${i})" aria-label="Opção ${L[i]}: ${o}"><span class="qletter" aria-hidden="true">${L[i]}</span> ${o}</button>`,
    )
    .join("");
  qs("#qFeedback").style.display = "none";
  qs("#btnNextQ").style.display = "none";
  S.quizAnswered = false;
}
async function answerQ(idx) {
  if (S.quizAnswered) return;
  S.quizAnswered = true;
  const mod = QUIZ[S.quizMod],
    q = mod.qs[S.quizIdx],
    correct = idx === q.c;
  for (let i = 0; i < q.opts.length; i++) {
    const el = qs("#qo" + i);
    if (el) {
      el.classList.remove("correct", "wrong");
      if (i === q.c) el.classList.add("correct");
      else if (i === idx && !correct) el.classList.add("wrong");
    }
  }
  qs("#qFeedback").style.display = "block";
  qs("#qFeedback").innerHTML =
    `<div class="card" style="background:${correct ? "var(--green-bg)" : "var(--red-bg)"};border-color:${correct ? "#C0DD97" : "#F5AAAA"};margin-top:7px"><div style="font-size:12px;color:${correct ? "var(--green)" : "var(--red)"};font-weight:600;margin-bottom:2px">${correct ? "✅ Correto! +10 XP" : "❌ Não dessa vez"}</div><div style="font-size:11px;color:var(--text2)">${q.f}</div></div>`;
  try {
    await API.responder({
      modulo: S.quizMod,
      questaoIndex: S.quizIdx,
      respostaIndex: idx,
      acertou: correct,
    });
  } catch (e) {}
  if (correct) S.user.xp += 10;
  qs("#btnNextQ").style.display = "flex";
  qs("#btnNextQ").textContent =
    S.quizIdx < mod.qs.length - 1 ? "Próxima ›" : "Finalizar módulo";
}
async function nextQ() {
  const mod = QUIZ[S.quizMod];
  if (S.quizIdx < mod.qs.length - 1) {
    S.quizIdx++;
    renderQuizQ();
  } else {
    const acertos = mod.qs.filter((_, i) =>
      qs("#qo" + mod.qs[i]?.c)?.classList.contains("correct"),
    ).length;
    try {
      await API.finalizar({
        modulo: S.quizMod,
        pontuacao: acertos,
        total: mod.total,
      });
    } catch (e) {}
    showToast("Módulo concluído! +50 XP 🎓", "green");
    S.quizIdx = 0;
    S.quizAnswered = false;
    await renderQuizMods();
    renderQuizQ();
  }
}

// ══ RELATÓRIO ══════════════════════════════════════════════
let relPeriodo = (() => {
  const n = periodoAtual();
  return { mi: n.mes, ai: n.ano, mf: n.mes, af: n.ano };
})();
const charts = {};
function initC(id, cfg) {
  if (charts[id]) charts[id].destroy();
  const el = qs("#" + id);
  if (!el) return;
  charts[id] = new Chart(el, cfg);
}
async function loadRelatorio() {
  const { mi, ai, mf, af } = relPeriodo;
  try {
    const d = await API.getRelDados(mi, ai, mf, af);
    if (!d) return;
    const r = d.resumo || {};
    qs("#relRec").textContent = fmt(r.totalReceitas);
    qs("#relDep").textContent = fmt(r.totalDespesas);
    qs("#relSaldo").textContent = fmt(r.saldo);
    qs("#relSaldo").style.color =
      (r.saldo || 0) >= 0 ? "var(--green)" : "var(--red)";
    qs("#relMaior").textContent = r.maiorCategoriaGasto || "—";
    renderRelCharts(r, d.evolucao || []);
    renderAnaliseRel(r);
  } catch (e) {}
}
function renderRelCharts(r, ev) {
  const cats = r.gastosPorCategoria || [],
    cols = ["#D94B3A", "#378ADD", "#7F77DD", "#1D9E75", "#EF9F27"];
  initC("chartRelCat", {
    type: "doughnut",
    data: {
      labels: cats.map((c) => c.categoria),
      datasets: [
        {
          data: cats.map((c) => c.total),
          backgroundColor: cols,
          borderWidth: 0,
          hoverOffset: 4,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom",
          labels: { font: { size: 11 }, padding: 8 },
        },
      },
      animation: { duration: 500 },
    },
  });
  initC("chartRelMes", {
    type: "bar",
    data: {
      labels: ev.map((e) => e.mes || e.mesNum),
      datasets: [
        {
          label: "Receitas",
          data: ev.map((e) => e.receitas || 0),
          backgroundColor: "#2D6A1F",
          borderRadius: 3,
        },
        {
          label: "Despesas",
          data: ev.map((e) => e.despesas || 0),
          backgroundColor: "#C0392B",
          borderRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom", labels: { font: { size: 11 } } },
      },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: "rgba(0,0,0,.04)" } },
      },
      animation: { duration: 500 },
    },
  });
}
function renderAnaliseRel(r) {
  const el = qs("#analiseRel");
  if (!el) return;
  const pct =
    r.totalReceitas > 0
      ? Math.round(((r.totalDespesas || 0) / (r.totalReceitas || 1)) * 100)
      : 0;
  el.innerHTML = `<div style="background:var(--bg3);border-radius:8px;padding:11px"><div class="li-sub">Saldo do período</div><div style="font-size:17px;font-weight:700;color:${(r.saldo || 0) >= 0 ? "var(--green)" : "var(--red)"};font-family:var(--mono);margin-top:3px">${fmt(r.saldo)}</div></div><div style="background:var(--bg3);border-radius:8px;padding:11px"><div class="li-sub">% gasto/renda</div><div style="font-size:17px;font-weight:700;color:${pct > 80 ? "var(--red)" : "var(--green)"};margin-top:3px">${pct}%</div></div><div style="background:var(--bg3);border-radius:8px;padding:11px"><div class="li-sub">Maior gasto</div><div style="font-size:14px;font-weight:600;margin-top:3px">${r.maiorCategoriaGasto || "—"}</div><div style="font-size:11px;color:var(--text2)">R$${(r.maiorValorGasto || 0).toFixed(0)}</div></div>`;
}
function aplicarPeriodo() {
  const i = qs("#piMes")?.value,
    f = qs("#pfMes")?.value;
  if (!i || !f) {
    showToast("Selecione o período", "red");
    return;
  }
  const [ai, mi] = [+i.split("-")[0], +i.split("-")[1]],
    [af, mf] = [+f.split("-")[0], +f.split("-")[1]];
  relPeriodo = { mi, ai, mf, af };
  const pt = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  });
  qs("#periodoTexto").textContent =
    `Período: ${pt.format(new Date(ai, mi - 1))} a ${pt.format(new Date(af, mf - 1))}`;
  closeModal("modalPeriodo");
  loadRelatorio();
}
async function exportCSV() {
  const { mi, ai, mf, af } = relPeriodo;
  const url = API.getRelCSVUrl(mi, ai, mf, af);
  const a = document.createElement("a");
  a.href = url;
  a.download = "meudindin.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
async function exportPDF() {
  const { mi, ai, mf, af } = relPeriodo;
  try {
    const d = await API.getRelDados(mi, ai, mf, af);
    const r = d.resumo || {};
    const trans = d.trans || [];
    const pt = new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric",
    });
    const periodoLabel = `${pt.format(new Date(ai, mi - 1))} a ${pt.format(new Date(af, mf - 1))}`;
    const w = window.open("", "_blank", "width=900,height=700");
    w.document.write(
      `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório Meu DinDin</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#111;font-size:13px}h1{font-size:20px;margin-bottom:4px}p.sub{color:#888;font-size:12px;margin-bottom:24px}h2{font-size:15px;margin:20px 0 8px;border-bottom:1px solid #eee;padding-bottom:4px}.grid{display:flex;gap:14px;margin-bottom:16px}.m{border:1px solid #eee;border-radius:8px;padding:12px;flex:1}.ml{font-size:10px;color:#888;text-transform:uppercase}.mv{font-size:20px;font-weight:700;margin-top:2px}.pos{color:#1E5C14}.neg{color:#B52D20}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#f5f5f5;text-align:left;padding:6px 10px;border:1px solid #ddd}td{padding:5px 10px;border:1px solid #eee}@media print{body{padding:16px}}</style></head><body><h1>📊 Relatório Financeiro — Meu DinDin</h1><p class="sub">Período: ${periodoLabel} · Gerado em ${new Date().toLocaleDateString("pt-BR")} · ${d.nomeUsuario || ""}</p><h2>Resumo</h2><div class="grid"><div class="m"><div class="ml">Receitas</div><div class="mv pos">R$${(r.totalReceitas || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div></div><div class="m"><div class="ml">Despesas</div><div class="mv neg">R$${(r.totalDespesas || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div></div><div class="m"><div class="ml">Saldo</div><div class="mv ${(r.saldo || 0) >= 0 ? "pos" : "neg"}">R$${(r.saldo || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div></div><div class="m"><div class="ml">Economia</div><div class="mv pos">${r.percentualEconomia || 0}% da renda</div></div></div><h2>Gastos por categoria</h2><table><tr><th>Categoria</th><th>Total</th><th>%</th></tr>${(r.gastosPorCategoria || []).map((c) => `<tr><td>${c.categoria}</td><td>R$${(c.total || 0).toFixed(2)}</td><td>${c.percentual || 0}%</td></tr>`).join("")}</table><h2>Transações (${trans.length})</h2><table><tr><th>Data</th><th>Tipo</th><th>Categoria</th><th>Descrição</th><th>Valor</th></tr>${trans.map((t) => `<tr><td>${new Date(t.data).toLocaleDateString("pt-BR")}</td><td>${t.tipo}</td><td>${t.categoria}</td><td>${t.descricao}</td><td class="${t.tipo === "receita" ? "pos" : "neg"}">${t.tipo === "receita" ? "+" : "-"}R$${(t.valor || 0).toFixed(2)}</td></tr>`).join("")}</table></body></html>`,
    );
    w.document.close();
    setTimeout(() => {
      w.print();
    }, 600);
  } catch (e) {
    showToast("Erro ao gerar PDF: " + e.message, "red");
  }
}

// ══ CHARTS ═════════════════════════════════════════════════
function renderCharts() {
  const cats = S.trans
    .filter((t) => t.tipo === "despesa")
    .reduce((a, t) => {
      a[t.cat] = (a[t.cat] || 0) + t.valor;
      return a;
    }, {});
  const labels = Object.keys(cats),
    vals = Object.values(cats),
    colors = [
      "#D94B3A",
      "#378ADD",
      "#7F77DD",
      "#1D9E75",
      "#EF9F27",
      "#9B5DE5",
      "#F9844A",
    ];
  if (!labels.length) {
    if (charts["chartCat"]) charts["chartCat"].destroy();
    return;
  }
  if (S.chartType === "bar")
    initC("chartCat", {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            data: vals,
            backgroundColor: colors,
            borderRadius: 4,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
          y: { display: false },
        },
        animation: { duration: 400 },
      },
    });
  else
    initC("chartCat", {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            data: vals,
            backgroundColor: colors,
            borderWidth: 0,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        cutout: "65%",
        plugins: {
          legend: {
            position: "bottom",
            labels: { font: { size: 10 }, padding: 7 },
          },
        },
        animation: { duration: 400 },
      },
    });
}
async function loadEvolucao() {
  try {
    const ev = await API.getEvolucao();
    if (!ev) return;
    initC("chartMensal", {
      type: "line",
      data: {
        labels: ev.map((e) => e.mes),
        datasets: [
          {
            label: "Receitas",
            data: ev.map((e) => e.receitas),
            borderColor: "#2D6A1F",
            backgroundColor: "rgba(45,106,31,.08)",
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointBackgroundColor: "#2D6A1F",
          },
          {
            label: "Despesas",
            data: ev.map((e) => e.despesas),
            borderColor: "#B52D20",
            backgroundColor: "rgba(181,45,32,.06)",
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointBackgroundColor: "#B52D20",
          },
        ],
      },
      options: {
        responsive: true,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            position: "bottom",
            labels: { font: { size: 11 }, padding: 10 },
          },
          tooltip: {
            callbacks: {
              label: (c) =>
                `${c.dataset.label}: R$${(c.parsed.y || 0).toLocaleString("pt-BR")}`,
            },
          },
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            grid: { color: "rgba(0,0,0,.04)" },
            ticks: {
              font: { size: 10 },
              callback: (v) => "R$" + (+v).toLocaleString("pt-BR"),
            },
          },
        },
        animation: { duration: 500 },
      },
    });
  } catch (e) {}
}
function switchChart(t) {
  S.chartType = t;
  ["bar", "doughnut"].forEach((x) => {
    const b = qs("#btnChart" + (x === "bar" ? "Bar" : "Dn"));
    if (b) {
      b.style.background = x === t ? "var(--text)" : "";
      b.style.color = x === t ? "#fff" : "";
      b.style.borderColor = x === t ? "transparent" : "";
    }
  });
  renderCharts();
}

// ══ NOTIFICAÇÕES ═══════════════════════════════════════════
function updateNotifBadge(n) {
  const btn = qs("#btnNotif");
  if (btn) btn.setAttribute("data-count", n > 9 ? "9+" : String(n || 0));
}
async function toggleNotif() {
  const p = qs("#notifPanel"),
    o = qs("#notifOverlay"),
    btn = qs("#btnNotif");
  const isOpen = p.classList.toggle("open");
  o.classList.toggle("open", isOpen);
  p.setAttribute("aria-hidden", !isOpen);
  btn.setAttribute("aria-expanded", isOpen);
  if (isOpen) await loadNotif();
}
async function loadNotif() {
  try {
    const ns = await API.getNotif();
    if (!ns) return;
    const el = qs("#notifLista");
    if (!el) return;
    if (!ns.length) {
      el.innerHTML =
        '<div style="text-align:center;color:var(--text2);padding:20px;font-size:12px">Sem notificações</div>';
      return;
    }
    el.innerHTML = ns
      .map(
        (n) =>
          `<div class="notif-item${n.lida ? "" : " unread"}" onclick="lerNotif(${n.id},this)"><div class="notif-item-title">${n.icone} ${n.titulo}</div><div style="font-size:11px;color:var(--text2)">${n.mensagem}</div><div class="notif-time">${new Date(n.criadaEm).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div></div>`,
      )
      .join("");
    updateNotifBadge(ns.filter((n) => !n.lida).length);
  } catch (e) {}
}
async function lerNotif(id, el) {
  try {
    await API.lerNotif(id);
    el.classList.remove("unread");
    updateNotifBadge(document.querySelectorAll(".notif-item.unread").length);
  } catch (e) {}
}
async function lerTodasNotif() {
  try {
    await API.lerTodas();
    document
      .querySelectorAll(".notif-item.unread")
      .forEach((el) => el.classList.remove("unread"));
    updateNotifBadge(0);
  } catch (e) {}
}

// ══ PERFIL ═════════════════════════════════════════════════
async function loadPerfil() {
  try {
    const p = await API.getPerfil();
    if (!p) return;
    Object.assign(S.user, {
      nome: p.nome,
      email: p.email,
      fotoUrl: p.fotoUrl,
      dataNascimento: p.dataNascimento,
      saldoConta: p.saldoConta || 0,
      nivel: p.nivel,
      xp: p.xp,
      xpProx: p.xpProximoNivel,
      moedas: p.moedas,
      titulo: p.nomeTitulo,
      perfilInvestidor: p.perfilInvestidor,
      nivelExperiencia: p.nivelExperiencia,
      scoreFinanceiro: p.scoreFinanceiro,
      categoriaPerfil: p.categoriaPerfil,
      itensResgatados: p.itensResgatados,
    });
    const ini =
      p.nome
        .split(" ")
        .map((x) => x[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "?";
    setAvatar("profAvDisp", ini, p.fotoUrl);
    const pAvText = qs("#profAvText");
    if (pAvText) pAvText.textContent = ini;
    qs("#profNomeDisplay").textContent = p.nome || "—";
    qs("#profLevelDisplay").textContent = `Nível ${p.nivel} · ${p.nomeTitulo}`;
    if (qs("#pNome")) qs("#pNome").value = p.nome || "";
    if (qs("#pEmail")) qs("#pEmail").value = p.email || "";
    if (qs("#pNasc") && p.dataNascimento)
      qs("#pNasc").value = p.dataNascimento.split("T")[0];
    qs("#pfTag").textContent = p.perfilInvestidor || "—";
    qs("#pfScore").textContent = (p.scoreFinanceiro || 0).toFixed(0);
    qs("#pfCat").textContent = p.categoriaPerfil || "—";
    qs("#pfExp").textContent = p.nivelExperiencia || "—";
    if (qs("#togContrast")) qs("#togContrast").checked = p.altoContraste;
    if (qs("#togText")) qs("#togText").checked = p.textoGrande;
    if (qs("#togMotion")) qs("#togMotion").checked = p.reduzirAnimacoes;
    if (qs("#togLibras")) qs("#togLibras").checked = p.preferenciaLibras;
  } catch (e) {}
}
async function savePerfil() {
  const nome = qs("#pNome")?.value.trim();
  if (!nome) {
    showToast("Nome vazio", "red");
    return;
  }
  try {
    await API.putPerfil({
      nome,
      email: qs("#pEmail")?.value.trim() || S.user.email,
      fotoUrl: S.user.fotoUrl || null,
      dataNascimento: qs("#pNasc")?.value || null,
      altoContraste: qs("#togContrast")?.checked || false,
      textoGrande: qs("#togText")?.checked || false,
      reduzirAnimacoes: qs("#togMotion")?.checked || false,
      preferenciaLibras: qs("#togLibras")?.checked || false,
    });
    S.user.nome = nome;
    updateSidebarUI();
    showToast("Perfil atualizado! ✓", "green");
  } catch (e) {
    showToast(e.message, "red");
  }
}
async function alterarSenha() {
  const a = qs("#pPassA")?.value,
    n = qs("#pPassN")?.value,
    c = qs("#pPassC")?.value;
  if (!a || !n) {
    showToast("Preencha as senhas", "red");
    return;
  }
  if (n !== c) {
    showToast("Senhas não conferem", "red");
    return;
  }
  if (n.length < 8) {
    showToast("Senha mín. 8 caracteres", "red");
    return;
  }
  try {
    await API.putSenha(a, n);
    qs("#pPassA").value = "";
    qs("#pPassN").value = "";
    qs("#pPassC").value = "";
    showToast("Senha atualizada!", "green");
  } catch (e) {
    showToast(e.message, "red");
  }
}
function handleAvatar(ev) {
  const f = ev.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = (e) => {
    const url = e.target.result;
    S.user.fotoUrl = url;
    const ini =
      S.user.nome
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2) || "?";
    ["profAvDisp", "sidebarAv", "gameAv"].forEach((id) =>
      setAvatar(id, ini, url),
    );
    const img = qs("#profAvImg"),
      txt = qs("#profAvText");
    if (img) {
      img.src = url;
      img.style.display = "block";
    }
    if (txt) txt.style.display = "none";
    showToast("Foto atualizada!", "green");
  };
  r.readAsDataURL(f);
}

// ══ MODALS ═════════════════════════════════════════════════
function openModal(id) {
  const m = qs("#" + id);
  if (m) {
    m.classList.add("open");
    document.body.style.overflow = "hidden";
  }
}
function closeModal(id) {
  const m = qs("#" + id);
  if (m) {
    m.classList.remove("open");
    document.body.style.overflow = "";
  }
}
document.querySelectorAll(".modal-overlay").forEach((m) =>
  m.addEventListener("click", (e) => {
    if (e.target === m) closeModal(m.id);
  }),
);

// ══ ACCESSIBILITY ══════════════════════════════════════════
let _hc = false,
  _lt = false,
  _rm = false;
function toggleHighContrast(v) {
  _hc = v !== undefined ? v : !_hc;
  document.body.classList.toggle("high-contrast", _hc);
  const t = qs("#togContrast");
  if (t) t.checked = _hc;
}
function toggleLargeText(v) {
  _lt = v !== undefined ? v : !_lt;
  document.body.classList.toggle("large-text", _lt);
  const t = qs("#togText");
  if (t) t.checked = _lt;
}
function toggleReduceMotion(v) {
  _rm = v !== undefined ? v : !_rm;
  document.body.classList.toggle("reduce-motion", _rm);
  const t = qs("#togMotion");
  if (t) t.checked = _rm;
}
function toggleLibras() {
  const p = qs("#librasPanel"),
    b = qs("#librasBtn");
  const o = p.classList.toggle("open");
  p.setAttribute("aria-hidden", !o);
  b.setAttribute("aria-expanded", o);
}
function ativarVlibras() {
  if (qs("#librasPanel").classList.contains("open")) toggleLibras();
  const w = qs("#vlibras-widget");
  if (!w) return;
  if (w.style.display === "block") {
    w.style.display = "none";
    const t = qs("#togLibras");
    if (t) t.checked = false;
    return;
  }
  if (!w.innerHTML) {
    w.innerHTML =
      '<div vw class="enabled"><div vw-access-button class="active"></div><div vw-plugin-wrapper><div class="vw-plugin-top-wrapper"></div></div></div>';
    const sc = document.createElement("script");
    sc.src = "https://vlibras.gov.br/app/vlibras-plugin.js";
    sc.onload = () => {
      if (window.VLibras) {
        new window.VLibras.Widget("https://vlibras.gov.br/app");
        showToast("vLibras ativado! 🤟", "green");
      }
    };
    document.body.appendChild(sc);
  }
  w.style.display = "block";
  const t = qs("#togLibras");
  if (t) t.checked = true;
}
function toggleVlibras(v) {
  if (v) ativarVlibras();
  else {
    const w = qs("#vlibras-widget");
    if (w) w.style.display = "none";
  }
}
function lerPagina() {
  if (!window.speechSynthesis) {
    showToast("Síntese de voz não disponível", "red");
    return;
  }
  const pg = document.querySelector(".page.active");
  if (!pg) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(
    pg.innerText.replace(/\n+/g, " ").substring(0, 600),
  );
  u.lang = "pt-BR";
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
  showToast("🔊 Lendo a página...", "");
  if (qs("#librasPanel").classList.contains("open")) toggleLibras();
}
document.addEventListener("keydown", (e) => {
  if (e.altKey && e.key === "a") {
    e.preventDefault();
    toggleLibras();
  }
  if (e.key === "Escape") {
    document
      .querySelectorAll(".modal-overlay.open")
      .forEach((m) => closeModal(m.id));
    const np = qs("#notifPanel");
    if (np?.classList.contains("open")) toggleNotif();
  }
});

// ══ TOAST ══════════════════════════════════════════════════
function showToast(msg, type = "") {
  const c = qs("#toastContainer");
  const t = document.createElement("div");
  t.className = `toast${type ? ` toast-${type}` : ""}`;
  t.setAttribute("role", "alert");
  t.innerHTML = `<i class="ti ti-${type === "green" ? "check" : "info-circle"}" aria-hidden="true"></i> ${msg}`;
  c.appendChild(t);
  requestAnimationFrame(() =>
    requestAnimationFrame(() => t.classList.add("show")),
  );
  setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.remove(), 400);
  }, 3000);
}

// ══ INIT ═══════════════════════════════════════════════════
window.addEventListener("DOMContentLoaded", async () => {
  const today = new Date().toISOString().split("T")[0];
  ["rd", "dd", "mt-d"].forEach((id) => {
    const el = qs("#" + id);
    if (el && !el.value) el.value = today;
  });
  const n = periodoAtual();
  const mm = String(n.mes).padStart(2, "0");
  ["piMes", "pfMes"].forEach((id) => {
    const el = qs("#" + id);
    if (el) el.value = `${n.ano}-${mm}`;
  });
  if (API.hasToken()) {
    try {
      const p = await API.getPerfil();
      if (p) {
        applyAuth(p);
        await loadAll();
        showScreen("screen-app");
        return;
      }
    } catch (e) {
      API.clearToken();
    }
  }
  // sem token — mostra login
});
