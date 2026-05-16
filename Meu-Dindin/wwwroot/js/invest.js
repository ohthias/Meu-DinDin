const INVEST_TIPS = [
  { icon: '🏦', title: 'Regra dos 50/30/20', body: '50% necessidades, 30% desejos e 20% para poupança ou investimentos. Uma base simples pra começar!' },
  { icon: '💰', title: 'Fundo de emergência primeiro', body: 'Antes de investir, monte uma reserva de 3 a 6 meses de gastos em renda fixa com liquidez diária.' },
  { icon: '📊', title: 'Começar pelo Tesouro Direto', body: 'O Tesouro Selic é considerado o investimento mais seguro do Brasil, ideal para iniciantes e reserva de emergência.' },
  { icon: '🔄', title: 'Investir todo mês (DCA)', body: 'Dollar-Cost Averaging: invista um valor fixo todo mês, independente do mercado. Funciona muito bem no longo prazo.' },
  { icon: '📱', title: 'Apps de corretoras gratuitas', body: 'Nubank, Rico, XP, BTG têm taxas zero para Tesouro Direto e ações. Sem desculpas pra não começar!' },
  { icon: '⏰', title: 'Juros compostos são mágicos', body: 'Quem investe R$200/mês por 30 anos com 10% a.a. acumula ~R$450 mil. Comece cedo, o tempo é seu maior aliado.' },
];
 
const INVEST_PRODUCTS = [
  { name: 'Tesouro Selic', risk: 'Baixo', desc: 'Títulos do governo federal. Liquidez diária, seguro e ideal para reserva de emergência.', rate: '~14% a.a.', badge: 'badge-low' },
  { name: 'CDB 100% CDI', risk: 'Baixo', desc: 'Empréstimo para bancos com rendimento atrelado ao CDI. Garantido pelo FGC até R$250k.', rate: '~13.7% a.a.', badge: 'badge-low' },
  { name: 'LCI / LCA', risk: 'Baixo', desc: 'Letras de crédito imobiliário e do agronegócio. Isentos de IR para pessoa física!', rate: '~11% a.a.', badge: 'badge-low' },
  { name: 'Fundos DI', risk: 'Médio', desc: 'Fundos que acompanham o DI. Gestão profissional, boa para diversificação.', rate: '~13% a.a.', badge: 'badge-mid' },
  { name: 'ETF (BOVA11)', risk: 'Médio', desc: 'Fundo que replica o Ibovespa. Diversificação automática em toda a bolsa brasileira.', rate: 'Variável', badge: 'badge-mid' },
  { name: 'BDR / Stocks EUA', risk: 'Alto', desc: 'Ações de empresas americanas (Apple, Tesla). Alta volatilidade, ideal para longo prazo.', rate: 'Variável', badge: 'badge-high' },
];

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
