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
