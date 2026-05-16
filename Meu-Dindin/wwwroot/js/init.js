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
