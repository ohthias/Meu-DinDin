// ══════════════════════════════════════════
// STATE
// ══════════════════════════════════════════
const state = {
  user: null,
  transactions: [],
  investments: [],
  xp: 0,
  level: 1,
  categories: [
    "Alimentação",
    "Transporte",
    "Lazer",
    "Saúde",
    "Educação",
    "Moradia",
    "Salário",
    "Freela",
    "Outros",
  ],
  selectedCat: null,
  txType: "income",
  charts: { bar: null, donut: null },
  challengesCompleted: new Set(),
  achievementsUnlocked: new Set(),
};

// ══════════════════════════════════════════
// STATIC DATA
// ══════════════════════════════════════════
const INVEST_TIPS = [
  {
    icon: "🏦",
    title: "Regra dos 50/30/20",
    body: "50% necessidades, 30% desejos e 20% para poupança ou investimentos. Uma base simples pra começar!",
  },
  {
    icon: "💰",
    title: "Fundo de emergência primeiro",
    body: "Antes de investir, monte uma reserva de 3 a 6 meses de gastos em renda fixa com liquidez diária.",
  },
  {
    icon: "📊",
    title: "Começar pelo Tesouro Direto",
    body: "O Tesouro Selic é considerado o investimento mais seguro do Brasil, ideal para iniciantes e reserva de emergência.",
  },
  {
    icon: "🔄",
    title: "Investir todo mês (DCA)",
    body: "Dollar-Cost Averaging: invista um valor fixo todo mês, independente do mercado. Funciona muito bem no longo prazo.",
  },
  {
    icon: "📱",
    title: "Apps de corretoras gratuitas",
    body: "Nubank, Rico, XP, BTG têm taxas zero para Tesouro Direto e ações. Sem desculpas pra não começar!",
  },
  {
    icon: "⏰",
    title: "Juros compostos são mágicos",
    body: "Quem investe R$200/mês por 30 anos com 10% a.a. acumula ~R$450 mil. Comece cedo, o tempo é seu maior aliado.",
  },
];

const INVEST_PRODUCTS = [
  {
    name: "Tesouro Selic",
    risk: "Baixo",
    desc: "Títulos do governo federal. Liquidez diária, seguro e ideal para reserva de emergência.",
    rate: "~14% a.a.",
    badge: "badge-low",
  },
  {
    name: "CDB 100% CDI",
    risk: "Baixo",
    desc: "Empréstimo para bancos com rendimento atrelado ao CDI. Garantido pelo FGC até R$250k.",
    rate: "~13.7% a.a.",
    badge: "badge-low",
  },
  {
    name: "LCI / LCA",
    risk: "Baixo",
    desc: "Letras de crédito imobiliário e do agronegócio. Isentos de IR para pessoa física!",
    rate: "~11% a.a.",
    badge: "badge-low",
  },
  {
    name: "Fundos DI",
    risk: "Médio",
    desc: "Fundos que acompanham o DI. Gestão profissional, boa para diversificação.",
    rate: "~13% a.a.",
    badge: "badge-mid",
  },
  {
    name: "ETF (BOVA11)",
    risk: "Médio",
    desc: "Fundo que replica o Ibovespa. Diversificação automática em toda a bolsa brasileira.",
    rate: "Variável",
    badge: "badge-mid",
  },
  {
    name: "BDR / Stocks EUA",
    risk: "Alto",
    desc: "Ações de empresas americanas (Apple, Tesla). Alta volatilidade, ideal para longo prazo.",
    rate: "Variável",
    badge: "badge-high",
  },
];

const CHALLENGES = [
  {
    id: "c1",
    title: "🚫 Semana sem bobagem",
    desc: "Fique 7 dias sem gastos em Lazer acima de R$30. Economize ao invés de gastar!",
    xp: 50,
    type: "leisure_limit",
    target: 7,
  },
  {
    id: "c2",
    title: "💰 Poupador Iniciante",
    desc: "Poupe pelo menos 20% da sua renda neste mês.",
    xp: 80,
    type: "save_20pct",
    target: 1,
  },
  {
    id: "c3",
    title: "📝 Contador de gastos",
    desc: "Registre 10 transações no app para entender seus hábitos.",
    xp: 30,
    type: "log_10tx",
    target: 10,
  },
  {
    id: "c4",
    title: "📈 Primeiro Investimento",
    desc: "Registre seu primeiro investimento no app e dê o primeiro passo!",
    xp: 100,
    type: "first_invest",
    target: 1,
  },
  {
    id: "c5",
    title: "🍔 Controle o rolê",
    desc: "Mantenha gastos com Alimentação abaixo de R$400 no mês.",
    xp: 60,
    type: "food_limit",
    target: 400,
  },
  {
    id: "c6",
    title: "🎯 Meta atingida!",
    desc: "Termine o mês com saldo positivo.",
    xp: 70,
    type: "positive_balance",
    target: 1,
  },
];

const ACHIEVEMENTS = [
  { id: "a1", icon: "🌱", name: "Primeiro Passo", unlock: "first_tx" },
  { id: "a2", icon: "💸", name: "10 Transações", unlock: "tx_10" },
  { id: "a3", icon: "📈", name: "Investidor", unlock: "first_invest" },
  { id: "a4", icon: "🏅", name: "Nível 5", unlock: "level_5" },
  { id: "a5", icon: "🔥", name: "3 Desafios", unlock: "ch_3" },
  { id: "a6", icon: "💰", name: "Poupou 20%", unlock: "save_20pct" },
  { id: "a7", icon: "🧠", name: "Organizado", unlock: "tx_30" },
  { id: "a8", icon: "🚀", name: "Nível 10", unlock: "level_10" },
];

const LEVELS = [
  { level: 1, name: "Iniciante", xpNeeded: 200 },
  { level: 2, name: "Consciente", xpNeeded: 400 },
  { level: 3, name: "Planejador", xpNeeded: 600 },
  { level: 4, name: "Poupador", xpNeeded: 900 },
  { level: 5, name: "Investidor Jr", xpNeeded: 1300 },
  { level: 6, name: "Estrategista", xpNeeded: 1800 },
  { level: 7, name: "Especialista", xpNeeded: 2400 },
  { level: 8, name: "Gestor", xpNeeded: 3100 },
  { level: 9, name: "Expert", xpNeeded: 4000 },
  { level: 10, name: "Mestre Dindin", xpNeeded: Infinity },
];

// ══════════════════════════════════════════
// LOGIN / LOGOUT
// ══════════════════════════════════════════
function doLogin() {
  const name = document.getElementById("login-name").value.trim();
  const email = document.getElementById("login-email").value.trim();
  const pass = document.getElementById("login-senha").value;
  if (!name || !email || !pass) {
    showToast("⚠️ Preencha todos os campos!", "xp");
    return;
  }
  state.user = { name, email };
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("app").style.display = "block";
  document.getElementById("greeting-name").textContent = name.split(" ")[0];
  document.getElementById("user-avatar").textContent = name[0].toUpperCase();
  initApp();
}

function doLogout() {
  document.getElementById("login-screen").style.display = "flex";
  document.getElementById("app").style.display = "none";
  document.getElementById("login-name").value = "";
  document.getElementById("login-email").value = "";
  document.getElementById("login-senha").value = "";
  state.transactions = [];
  state.investments = [];
  state.xp = 0;
  state.level = 1;
  state.challengesCompleted.clear();
  state.achievementsUnlocked.clear();
  if (state.charts.bar) {
    state.charts.bar.destroy();
    state.charts.bar = null;
  }
  if (state.charts.donut) {
    state.charts.donut.destroy();
    state.charts.donut = null;
  }
}

function initApp() {
  setTodayDate();
  renderTags();
  renderInvestTips();
  renderInvestProducts();
  renderChallenges();
  renderAchievements();
  updateSummary();
  updateXP(0);
  renderCharts();
  renderTransactions();
  renderInvList();
  showToast(`🎉 Bem-vindo(a), ${state.user.name.split(" ")[0]}!`, "success");
}

function setTodayDate() {
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("tx-date").value = today;
  document.getElementById("inv-date").value = today;
}

// ══════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════
function switchPage(id, el) {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document.querySelectorAll(".nav-tab").forEach((t) => {
    t.classList.remove("active");
    t.setAttribute("aria-selected", "false");
  });
  document.getElementById("page-" + id).classList.add("active");
  el.classList.add("active");
  el.setAttribute("aria-selected", "true");
}

// ══════════════════════════════════════════
// TAGS / CATEGORIES
// ══════════════════════════════════════════
function renderTags() {
  const row = document.getElementById("tag-row");
  row.innerHTML = "";
  state.categories.forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = "tag" + (state.selectedCat === cat ? " selected" : "");
    btn.textContent = cat;
    btn.setAttribute(
      "aria-pressed",
      state.selectedCat === cat ? "true" : "false",
    );
    btn.onclick = () => {
      state.selectedCat = state.selectedCat === cat ? null : cat;
      renderTags();
    };
    row.appendChild(btn);
  });
  const addBtn = document.createElement("button");
  addBtn.className = "tag-add-btn";
  addBtn.textContent = "+ Nova";
  addBtn.setAttribute("aria-label", "Criar nova categoria");
  addBtn.onclick = () => document.getElementById("modal").classList.add("open");
  row.appendChild(addBtn);

  // Update filter
  const filter = document.getElementById("filter-cat");
  const val = filter.value;
  filter.innerHTML = '<option value="all">Todas</option>';
  state.categories.forEach((c) => {
    const o = document.createElement("option");
    o.value = c;
    o.textContent = c;
    filter.appendChild(o);
  });
  filter.value = val;
}

function closeModal(e) {
  if (!e || e.target === document.getElementById("modal"))
    document.getElementById("modal").classList.remove("open");
}
function confirmNewCat() {
  const val = document.getElementById("modal-cat-input").value.trim();
  if (!val) return;
  if (!state.categories.includes(val)) {
    state.categories.push(val);
    renderTags();
    showToast('✅ Categoria "' + val + '" criada!', "success");
  }
  document.getElementById("modal-cat-input").value = "";
  document.getElementById("modal").classList.remove("open");
}

// ══════════════════════════════════════════
// TRANSACTION TYPE
// ══════════════════════════════════════════
function setType(type) {
  state.txType = type;
  const ib = document.getElementById("btn-income");
  const eb = document.getElementById("btn-expense");
  if (type === "income") {
    ib.classList.add("active-income");
    ib.classList.remove("active-expense");
    eb.className = "type-btn";
    ib.setAttribute("aria-pressed", "true");
    eb.setAttribute("aria-pressed", "false");
  } else {
    eb.classList.add("active-expense");
    eb.classList.remove("active-income");
    ib.className = "type-btn";
    eb.setAttribute("aria-pressed", "true");
    ib.setAttribute("aria-pressed", "false");
  }
}

// ══════════════════════════════════════════
// ADD TRANSACTION
// ══════════════════════════════════════════
function addTransaction() {
  const desc = document.getElementById("tx-desc").value.trim();
  const value = parseFloat(document.getElementById("tx-value").value);
  const date = document.getElementById("tx-date").value;
  const recur = document.getElementById("tx-recur").value;
  if (!desc || isNaN(value) || value <= 0 || !date) {
    showToast("⚠️ Preencha descrição, valor e data!", "xp");
    return;
  }
  const cat = state.selectedCat || "Outros";
  state.transactions.unshift({
    id: Date.now(),
    desc,
    value,
    date,
    type: state.txType,
    cat,
    recur,
  });
  state.selectedCat = null;
  document.getElementById("tx-desc").value = "";
  document.getElementById("tx-value").value = "";
  renderTags();
  updateSummary();
  renderCharts();
  renderTransactions();
  updateXP(15);
  checkAchievements();
  checkChallenges();
  showToast(
    state.txType === "income"
      ? "💚 Receita adicionada!"
      : "🔴 Gasto registrado!",
    "success",
  );
}

function deleteTransaction(id) {
  state.transactions = state.transactions.filter((t) => t.id !== id);
  updateSummary();
  renderCharts();
  renderTransactions();
  checkChallenges();
}

// ══════════════════════════════════════════
// SUMMARY
// ══════════════════════════════════════════
function fmt(n) {
  return (
    "R$ " +
    n.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}
function updateSummary() {
  const income = state.transactions
    .filter((t) => t.type === "income")
    .reduce((a, t) => a + t.value, 0);
  const expense = state.transactions
    .filter((t) => t.type === "expense")
    .reduce((a, t) => a + t.value, 0);
  const balance = income - expense;
  const savePct = income > 0 ? Math.round((balance / income) * 100) : 0;

  document.getElementById("val-balance").textContent = fmt(balance);
  document.getElementById("val-income").textContent = fmt(income);
  document.getElementById("val-expense").textContent = fmt(expense);
  document.getElementById("val-saving").textContent = savePct + "%";

  const db = document.getElementById("delta-balance");
  if (balance >= 0) {
    db.className = "card-delta up";
    db.innerHTML = "▲ Saldo positivo 👍";
  } else {
    db.className = "card-delta down";
    db.innerHTML = "▼ Saldo negativo ⚠️";
  }

  const ds = document.getElementById("delta-saving");
  if (savePct >= 20) {
    ds.className = "card-delta up";
    ds.innerHTML = "▲ Meta atingida! 🎉";
  } else if (savePct > 0) {
    ds.className = "card-delta";
    ds.innerHTML = "Meta: 20% da renda";
  } else {
    ds.className = "card-delta";
    ds.innerHTML = "Registre receitas";
  }

  updateRecommendation(income, expense, balance, savePct);
}

function updateRecommendation(income, expense, balance, savePct) {
  const el = document.getElementById("rec-text");
  if (income === 0) {
    el.textContent =
      "Adicione suas receitas para receber análises personalizadas!";
    return;
  }
  const topCat = getTopExpenseCategory();
  if (savePct < 0)
    el.textContent = `Seus gastos estão ${fmt(Math.abs(balance))} acima da receita. Reveja os gastos em ${topCat} — tente cortar 10% agora.`;
  else if (savePct < 10)
    el.textContent = `Você está poupando apenas ${savePct}% da renda. A meta saudável é 20%. Corte gastos supérfluos ou busque uma renda extra!`;
  else if (savePct < 20)
    el.textContent = `Poupança em ${savePct}% — quase lá! Falta poucos reais para atingir os 20%. Talvez reduzir ${topCat} resolva 😉`;
  else if (savePct < 40)
    el.textContent = `Ótimo! Você está poupando ${savePct}% da renda. Que tal começar a investir parte desse saldo no Tesouro Selic?`;
  else
    el.textContent = `Incrível! ${savePct}% poupado. Com essa disciplina, em 5 anos você pode ter uma reserva sólida. Considere diversificar em ETFs!`;
}

function getTopExpenseCategory() {
  const map = {};
  state.transactions
    .filter((t) => t.type === "expense")
    .forEach((t) => (map[t.cat] = (map[t.cat] || 0) + t.value));
  return Object.keys(map).sort((a, b) => map[b] - map[a])[0] || "Lazer";
}

// ══════════════════════════════════════════
// RENDER TRANSACTIONS
// ══════════════════════════════════════════
function renderTransactions() {
  const list = document.getElementById("tx-list");
  const filter = document.getElementById("filter-cat").value;
  let txs = state.transactions;
  if (filter !== "all") txs = txs.filter((t) => t.cat === filter);

  if (!txs.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><p>Nenhuma transação ainda. Adicione a primeira!</p></div>`;
    return;
  }
  list.innerHTML = txs
    .slice(0, 15)
    .map(
      (t) => `
    <div class="tx-item" role="listitem">
      <div class="tx-icon ${t.type}" aria-hidden="true">${t.type === "income" ? "💚" : "🔴"}</div>
      <div class="tx-info">
        <div class="tx-name">${escHtml(t.desc)}</div>
        <div class="tx-meta">
          <span>${t.date}</span>
          <span class="tx-cat">${escHtml(t.cat)}</span>
          ${t.recur !== "once" ? `<span class="tx-cat" style="color:var(--accent5);">${t.recur === "monthly" ? "Mensal" : "Semanal"}</span>` : ""}
        </div>
      </div>
      <div class="tx-amount ${t.type}" aria-label="${t.type === "income" ? "Receita" : "Gasto"} de ${fmt(t.value)}">${t.type === "income" ? "+" : "-"} ${fmt(t.value)}</div>
      <button class="tx-delete" onclick="deleteTransaction(${t.id})" aria-label="Excluir transação ${escHtml(t.desc)}">✕</button>
    </div>
  `,
    )
    .join("");
}

function escHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ══════════════════════════════════════════
// CHARTS
// ══════════════════════════════════════════
Chart.defaults.color = "#8B96B0";
Chart.defaults.font.family = "'DM Sans', sans-serif";

function renderCharts() {
  renderBarChart();
  renderDonutChart();
}

function renderBarChart() {
  const ctx = document.getElementById("chart-bar").getContext("2d");
  const months = getLast6Months();
  const incomes = months.map((m) => sumByMonth(m, "income"));
  const expenses = months.map((m) => sumByMonth(m, "expense"));
  if (state.charts.bar) state.charts.bar.destroy();
  state.charts.bar = new Chart(ctx, {
    type: "bar",
    data: {
      labels: months.map((m) => m.label),
      datasets: [
        {
          label: "Receitas",
          data: incomes,
          backgroundColor: "rgba(110,231,183,.7)",
          borderRadius: 6,
          borderSkipped: false,
        },
        {
          label: "Gastos",
          data: expenses,
          backgroundColor: "rgba(248,113,113,.7)",
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { boxWidth: 12, padding: 16 } } },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,.04)" },
          ticks: { color: "#8B96B0" },
        },
        y: {
          grid: { color: "rgba(255,255,255,.06)" },
          ticks: { color: "#8B96B0", callback: (v) => "R$" + v },
        },
      },
    },
  });
}

function renderDonutChart() {
  const ctx = document.getElementById("chart-donut").getContext("2d");
  const cats = {};
  state.transactions
    .filter((t) => t.type === "expense")
    .forEach((t) => (cats[t.cat] = (cats[t.cat] || 0) + t.value));
  const labels = Object.keys(cats);
  const data = Object.values(cats);
  const colors = [
    "#6EE7B7",
    "#60A5FA",
    "#F59E0B",
    "#F87171",
    "#A78BFA",
    "#34D399",
    "#FBBF24",
    "#FB7185",
    "#38BDF8",
  ];
  if (state.charts.donut) state.charts.donut.destroy();
  if (!data.length) {
    const chart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Sem gastos"],
        datasets: [{ data: [1], backgroundColor: ["#2A3045"] }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
      },
    });
    state.charts.donut = chart;
    return;
  }
  state.charts.donut = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors.slice(0, data.length),
          borderWidth: 2,
          borderColor: "#161A23",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "65%",
      plugins: {
        legend: { position: "right", labels: { boxWidth: 10, padding: 12 } },
      },
    },
  });
}

function getLast6Months() {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: d.toLocaleString("pt-BR", { month: "short" }),
    });
  }
  return months;
}

function sumByMonth(m, type) {
  return state.transactions
    .filter(
      (t) =>
        t.type === type &&
        t.date.startsWith(`${m.year}-${String(m.month).padStart(2, "0")}`),
    )
    .reduce((a, t) => a + t.value, 0);
}

// ══════════════════════════════════════════
// INVESTMENTS
// ══════════════════════════════════════════
function renderInvestTips() {
  document.getElementById("invest-tips").innerHTML = INVEST_TIPS.map(
    (t) => `
    <article class="invest-tip" tabindex="0">
      <div class="invest-tip-icon" aria-hidden="true">${t.icon}</div>
      <div class="invest-tip-title">${t.title}</div>
      <div class="invest-tip-body">${t.body}</div>
    </article>
  `,
  ).join("");
}

function renderInvestProducts() {
  document.getElementById("invest-products").innerHTML = INVEST_PRODUCTS.map(
    (p) => `
    <article class="invest-product" tabindex="0" role="button" aria-label="${p.name}: risco ${p.risk}, rentabilidade ${p.rate}">
      <div class="invest-product-header">
        <div class="invest-product-name">${p.name}</div>
        <span class="invest-product-badge ${p.badge}">Risco ${p.risk}</span>
      </div>
      <div class="invest-product-desc">${p.desc}</div>
      <div class="invest-product-rate">${p.rate} <span>/ a.a. estimado</span></div>
    </article>
  `,
  ).join("");
}

function addInvestment() {
  const name = document.getElementById("inv-name").value.trim();
  const value = parseFloat(document.getElementById("inv-value").value);
  const type = document.getElementById("inv-type").value;
  const date = document.getElementById("inv-date").value;
  if (!name || isNaN(value) || value <= 0 || !date) {
    showToast("⚠️ Preencha todos os campos!", "xp");
    return;
  }
  state.investments.unshift({ id: Date.now(), name, value, type, date });
  document.getElementById("inv-name").value = "";
  document.getElementById("inv-value").value = "";
  renderInvList();
  updateXP(30);
  checkAchievements();
  checkChallenges();
  showToast("📈 Investimento registrado!", "success");
}

function renderInvList() {
  const list = document.getElementById("inv-list");
  if (!state.investments.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">💼</div><p>Nenhum investimento ainda. Registre o primeiro!</p></div>`;
    return;
  }
  list.innerHTML = state.investments
    .map(
      (i) => `
    <div class="invest-item" role="listitem" aria-label="${i.name}: ${fmt(i.value)} em ${i.type}">
      <div class="invest-item-icon" aria-hidden="true">📈</div>
      <div class="invest-item-info">
        <div class="invest-item-name">${escHtml(i.name)}</div>
        <div class="invest-item-type">${escHtml(i.type)} · ${i.date}</div>
      </div>
      <div class="invest-item-value">${fmt(i.value)}</div>
      <button class="tx-delete" onclick="deleteInvestment(${i.id})" aria-label="Excluir investimento ${escHtml(i.name)}">✕</button>
    </div>
  `,
    )
    .join("");
}

function deleteInvestment(id) {
  state.investments = state.investments.filter((i) => i.id !== id);
  renderInvList();
}

// ══════════════════════════════════════════
// XP & LEVELS
// ══════════════════════════════════════════
function updateXP(gain) {
  state.xp += gain;
  const ldata = getLevelData(state.xp);
  state.level = ldata.level;

  document.getElementById("user-level").textContent = ldata.level;
  document.getElementById("user-xp-count").textContent = state.xp;

  const xpLabel = document.getElementById("xp-level-label");
  const xpCount = document.getElementById("xp-count-label");
  const xpFill = document.getElementById("xp-bar-fill");
  const xpBar = document.getElementById("xp-progressbar");
  const xpTip = document.getElementById("xp-bar-tip");

  xpLabel.textContent = `⭐ Nível ${ldata.level} — ${ldata.name}`;
  xpCount.textContent = `${state.xp} / ${ldata.nextXP} XP`;
  const pct = Math.min(
    100,
    Math.round(
      ((state.xp - ldata.prevXP) / (ldata.nextXP - ldata.prevXP)) * 100,
    ),
  );
  xpFill.style.width = pct + "%";
  xpBar.setAttribute("aria-valuenow", state.xp);
  xpBar.setAttribute("aria-valuemax", ldata.nextXP);

  if (ldata.nextXP !== Infinity)
    xpTip.textContent = `Faltam ${ldata.nextXP - state.xp} XP para o nível ${ldata.level + 1} — ${LEVELS[ldata.level]?.name || ""}!`;
  else xpTip.textContent = "Você chegou ao nível máximo! Incrível! 🏆";

  if (gain > 0) showToast(`+${gain} XP ganhos! 🌟`, "xp");
  checkAchievements();
}

function getLevelData(xp) {
  let cumXP = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    const prev = cumXP;
    cumXP += LEVELS[i].xpNeeded;
    if (xp < cumXP || i === LEVELS.length - 1)
      return {
        level: i + 1,
        name: LEVELS[i].name,
        prevXP: prev,
        nextXP: prev + LEVELS[i].xpNeeded,
      };
  }
}

// ══════════════════════════════════════════
// CHALLENGES
// ══════════════════════════════════════════
function checkChallenges() {
  const income = state.transactions
    .filter((t) => t.type === "income")
    .reduce((a, t) => a + t.value, 0);
  const expense = state.transactions
    .filter((t) => t.type === "expense")
    .reduce((a, t) => a + t.value, 0);
  const balance = income - expense;
  const savePct = income > 0 ? (balance / income) * 100 : 0;
  const foodExp = state.transactions
    .filter((t) => t.type === "expense" && t.cat === "Alimentação")
    .reduce((a, t) => a + t.value, 0);

  const progress = {
    c1: { val: Math.min(7, 7), done: false }, // simplified
    c2: { val: Math.min(1, savePct >= 20 ? 1 : 0), done: savePct >= 20 },
    c3: {
      val: Math.min(10, state.transactions.length),
      done: state.transactions.length >= 10,
    },
    c4: {
      val: Math.min(1, state.investments.length > 0 ? 1 : 0),
      done: state.investments.length > 0,
    },
    c5: { val: foodExp, done: foodExp > 0 && foodExp < 400 },
    c6: { val: balance > 0 ? 1 : 0, done: balance > 0 && income > 0 },
  };
  Object.keys(progress).forEach((id) => {
    if (progress[id].done && !state.challengesCompleted.has(id)) {
      state.challengesCompleted.add(id);
      const ch = CHALLENGES.find((c) => c.id === id);
      if (ch) {
        updateXP(ch.xp);
        showToast(`🎯 Desafio concluído: "${ch.title}"!`, "success");
      }
    }
  });
  renderChallenges(progress);
  checkAchievements();
}

function renderChallenges(progress) {
  const income = state.transactions
    .filter((t) => t.type === "income")
    .reduce((a, t) => a + t.value, 0);
  const expense = state.transactions
    .filter((t) => t.type === "expense")
    .reduce((a, t) => a + t.value, 0);
  const balance = income - expense;
  const savePct = income > 0 ? (balance / income) * 100 : 0;
  const foodExp = state.transactions
    .filter((t) => t.type === "expense" && t.cat === "Alimentação")
    .reduce((a, t) => a + t.value, 0);

  const prog = progress || {
    c1: { val: 0, done: false },
    c2: { val: savePct >= 20 ? 1 : 0, done: savePct >= 20 },
    c3: {
      val: state.transactions.length,
      done: state.transactions.length >= 10,
    },
    c4: {
      val: state.investments.length > 0 ? 1 : 0,
      done: state.investments.length > 0,
    },
    c5: { val: foodExp, done: foodExp > 0 && foodExp < 400 },
    c6: {
      val: balance > 0 && income > 0 ? 1 : 0,
      done: balance > 0 && income > 0,
    },
  };

  document.getElementById("challenges-grid").innerHTML = CHALLENGES.map(
    (ch) => {
      const p = prog[ch.id];
      const pct = Math.min(100, Math.round((p.val / ch.target) * 100));
      const done = state.challengesCompleted.has(ch.id);
      return `
      <article class="challenge-card" aria-label="Desafio: ${ch.title}${done ? " — Concluído" : ""}">
        <div class="challenge-header">
          <div class="challenge-title">${ch.title}</div>
          <span class="challenge-xp">+${ch.xp} XP</span>
        </div>
        <div class="challenge-desc">${ch.desc}</div>
        <div class="challenge-progress-row">
          <span class="challenge-progress-label">Progresso</span>
          <span class="challenge-progress-val">${done ? "✅ Concluído" : pct + "%"}</span>
        </div>
        <div class="progress-track" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Progresso do desafio ${ch.title}: ${pct}%">
          <div class="progress-fill" style="width:${pct}%;${done ? "background:var(--accent);" : ""}"></div>
        </div>
        ${done ? '<div class="challenge-complete">🏅 Parabéns! Você completou!</div>' : ""}
      </article>
    `;
    },
  ).join("");
}

// ══════════════════════════════════════════
// ACHIEVEMENTS
// ══════════════════════════════════════════
function checkAchievements() {
  const toUnlock = [];
  const txCount = state.transactions.length;
  const invCount = state.investments.length;
  const chCount = state.challengesCompleted.size;
  const income = state.transactions
    .filter((t) => t.type === "income")
    .reduce((a, t) => a + t.value, 0);
  const expense = state.transactions
    .filter((t) => t.type === "expense")
    .reduce((a, t) => a + t.value, 0);
  const savePct = income > 0 ? ((income - expense) / income) * 100 : 0;

  if (txCount >= 1 && !state.achievementsUnlocked.has("a1"))
    toUnlock.push("a1");
  if (txCount >= 10 && !state.achievementsUnlocked.has("a2"))
    toUnlock.push("a2");
  if (invCount >= 1 && !state.achievementsUnlocked.has("a3"))
    toUnlock.push("a3");
  if (state.level >= 5 && !state.achievementsUnlocked.has("a4"))
    toUnlock.push("a4");
  if (chCount >= 3 && !state.achievementsUnlocked.has("a5"))
    toUnlock.push("a5");
  if (savePct >= 20 && !state.achievementsUnlocked.has("a6"))
    toUnlock.push("a6");
  if (txCount >= 30 && !state.achievementsUnlocked.has("a7"))
    toUnlock.push("a7");
  if (state.level >= 10 && !state.achievementsUnlocked.has("a8"))
    toUnlock.push("a8");

  toUnlock.forEach((id) => {
    state.achievementsUnlocked.add(id);
    const ach = ACHIEVEMENTS.find((a) => a.id === id);
    if (ach) showToast(`🏅 Conquista desbloqueada: "${ach.name}"!`, "success");
  });
  if (toUnlock.length) renderAchievements();
}

function renderAchievements() {
  document.getElementById("achievements-grid").innerHTML = ACHIEVEMENTS.map(
    (a) => {
      const unlocked = state.achievementsUnlocked.has(a.id);
      return `
      <article class="achievement ${unlocked ? "unlocked" : "locked"}" 
               aria-label="Conquista: ${a.name}${unlocked ? " — Desbloqueada" : " — Bloqueada"}">
        <div class="achievement-icon" aria-hidden="true">${a.icon}</div>
        <div class="achievement-name ${unlocked ? "unlocked-text" : ""}">${a.name}</div>
      </article>
    `;
    },
  ).join("");
}

// ══════════════════════════════════════════
// TOAST
// ══════════════════════════════════════════
function showToast(msg, type = "success") {
  const c = document.getElementById("toast-container");
  const t = document.createElement("div");
  t.className = "toast " + type;
  t.textContent = msg;
  t.setAttribute("role", "alert");
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ══════════════════════════════════════════
// KEYBOARD NAV - ENTER ON LOGIN
// ══════════════════════════════════════════
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    if (
      document.getElementById("login-screen").style.display !== "none" ||
      !document.getElementById("app").style.display
    ) {
      if (document.activeElement.tagName === "INPUT") doLogin();
    }
    if (
      document.activeElement.classList.contains("tag") ||
      document.activeElement.classList.contains("tag-add-btn")
    ) {
      document.activeElement.click();
    }
    if (document.activeElement.id === "modal-cat-input") confirmNewCat();
  }
  if (e.key === "Escape") closeModal();
});

window.loggedUser = {
  name: "@Model.NomeUsuario",
  email: "@Model.EmailUsuario",
};
