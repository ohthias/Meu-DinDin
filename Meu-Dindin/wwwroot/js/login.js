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
