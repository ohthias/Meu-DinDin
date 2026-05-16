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
