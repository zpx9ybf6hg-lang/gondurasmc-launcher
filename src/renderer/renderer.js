const $ = (id) => document.getElementById(id);
let CFG = null;
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

async function init() {
  CFG = await window.launcher.getConfig();
  $("hw-ver").textContent = CFG.version;
  $("srv-ver").textContent = `${CFG.version} · NeoForge`;
  $("set-ver").textContent = `${CFG.version} · ${CFG.loader}`;
  $("set-srv").textContent = `${CFG.serverHost}:${CFG.serverPort}`;

  // Кнопки входа
  $("login-btn").onclick = doLogin;
  $("register-btn").onclick = () => window.launcher.openWebsite();
  $("set-site").onclick = () => window.launcher.openWebsite();
  $("password").addEventListener("keydown", (e) => { if (e.key === "Enter") doLogin(); });

  initSettings();
  loadNews();

  // Навигация
  document.querySelectorAll(".nav-item").forEach((b) =>
    (b.onclick = () => showPanel(b.dataset.panel))
  );
  $("gear-btn").onclick = () => showPanel("settings");
  $("logout-btn").onclick = async () => { await window.launcher.logout(); location.reload(); };
  $("play-btn").onclick = doPlay;

  // Статус установки/запуска
  window.launcher.onStatus((msg) => {
    const log = $("status-log");
    if (msg.stage !== "debug") {
      log.textContent += (msg.text || "") + "\n";
      log.scrollTop = log.scrollHeight;
    }
    if (msg.total) {
      const cur = msg.current != null ? msg.current : 0;
      $("progress-bar").style.width = Math.min(100, Math.round((cur / msg.total) * 100)) + "%";
    }
    if (msg.stage === "started") $("progress-bar").style.width = "100%";
  });

  // Проверщик обновлений лаунчера
  window.launcher.onUpdate(handleUpdate);
  $("update-btn").onclick = onUpdateBtn;

  if (CFG.current && CFG.current.name) showApp(CFG.current);
  else $("login-view").classList.remove("hidden");
}

let _updateMode = null;
function handleUpdate(msg) {
  const bar = $("update-bar");
  const text = $("update-text");
  const btn = $("update-btn");
  bar.classList.remove("hidden");
  if (msg.kind === "available-mac") {
    text.textContent = `Вышла новая версия ${msg.version} — скачай свежий лаунчер`;
    btn.textContent = "Скачать";
    btn.classList.remove("hidden");
    _updateMode = "web";
  } else if (msg.kind === "downloading") {
    text.textContent = `Загрузка обновления ${msg.version}…`;
    btn.classList.add("hidden");
  } else if (msg.kind === "progress") {
    text.textContent = `Загрузка обновления… ${msg.percent}%`;
    btn.classList.add("hidden");
  } else if (msg.kind === "ready") {
    text.textContent = `Обновление ${msg.version} готово`;
    btn.textContent = "Обновить и перезапустить";
    btn.classList.remove("hidden");
    _updateMode = "install";
  }
}

function onUpdateBtn() {
  if (_updateMode === "install") window.launcher.installUpdate();
  else window.launcher.openWebsite();
}

// Новости тянутся с сайта (меняются централизованно, без релиза лаунчера).
async function loadNews() {
  const list = $("news-list");
  try {
    const r = await fetch(`${CFG.websiteUrl}/news.json`, { cache: "no-store" });
    const items = await r.json();
    if (!Array.isArray(items) || !items.length) {
      list.innerHTML = '<p class="hint">Пока новостей нет.</p>';
      return;
    }
    list.innerHTML = items.map((n) => `
      <div class="news-item">
        <div class="news-head"><b>${esc(n.title)}</b><span class="news-date">${esc(n.date)}</span></div>
        <p>${esc(n.body)}</p>
      </div>`).join("");
  } catch {
    list.innerHTML = '<p class="hint">Не удалось загрузить новости.</p>';
  }
}

async function doLogin() {
  $("login-error").textContent = "";
  $("login-btn").disabled = true;
  try {
    const profile = await window.launcher.login({
      username: $("username").value.trim(),
      password: $("password").value
    });
    showApp(profile);
  } catch (e) {
    $("login-error").textContent = e.message || String(e);
  } finally {
    $("login-btn").disabled = false;
  }
}

function showApp(profile) {
  $("login-view").classList.add("hidden");
  $("app-view").classList.remove("hidden");
  $("hw-name").textContent = profile.name;
  $("set-acc").textContent = profile.name;
  pingServer();
  if (!window._pingTimer) window._pingTimer = setInterval(pingServer, 10000);
  initSkinViewer();
}

// ── 3D-скин ──────────────────────────────────────────────────
async function initSkinViewer() {
  const canvas = $("skin-canvas");
  const fallback = $("hero-fallback");
  try {
    const skin = await window.launcher.getSkinImage();
    if (!skin || !skin.dataUrl) { fallback.style.display = "block"; return; }
    fallback.style.display = "none";
    if (window._skinViewer) window._skinViewer.dispose();
    const viewer = new skinview3d.SkinViewer({
      canvas,
      width: canvas.clientWidth,
      height: canvas.clientHeight
    });
    viewer.loadSkin(skin.dataUrl, { model: skin.slim ? "slim" : "default" });
    viewer.animation = new skinview3d.WalkingAnimation();
    viewer.animation.speed = 0.6;
    viewer.autoRotate = true;
    viewer.autoRotateSpeed = 0.4;
    viewer.zoom = 0.85;
    window._skinViewer = viewer;
  } catch (e) {
    fallback.style.display = "block";
  }
}

// ── Настройки ────────────────────────────────────────────────
function initSettings() {
  const s = CFG.settings || {};
  const slider = $("ram-slider");
  const val = $("ram-val");
  const cap = Math.min(s.totalRamMb ? s.totalRamMb - 1024 : 16384, 32768);
  slider.max = Math.max(4096, Math.floor(cap / 512) * 512);
  slider.value = s.maxRam || 6144;
  const fmt = (mb) => (mb / 1024).toFixed(mb % 1024 ? 1 : 0) + " ГБ";
  val.textContent = fmt(slider.value);
  slider.oninput = () => (val.textContent = fmt(slider.value));
  slider.onchange = async () => {
    const set = await window.launcher.setRam(Number(slider.value));
    val.textContent = fmt(set);
  };
  $("set-dir").textContent = s.gameDir || "—";
  $("set-dir").title = s.gameDir || "";
  $("open-folder").onclick = () => window.launcher.openFolder();
  $("choose-folder").onclick = async () => {
    const r = await window.launcher.chooseFolder();
    if (r && r.gameDir) { $("set-dir").textContent = r.gameDir; $("set-dir").title = r.gameDir; }
  };
}

function showPanel(name) {
  document.querySelectorAll(".nav-item").forEach((b) =>
    b.classList.toggle("active", b.dataset.panel === name)
  );
  ["home", "settings", "news"].forEach((p) =>
    $("panel-" + p).classList.toggle("hidden", p !== name)
  );
}

async function doPlay() {
  $("play-btn").disabled = true;
  $("status-log").textContent = "";
  $("progress-bar").style.width = "0%";
  showPanel("home");
  try {
    await window.launcher.play();
  } catch (e) {
    $("status-log").textContent += "ОШИБКА: " + (e.message || e) + "\n";
  } finally {
    $("play-btn").disabled = false;
  }
}

// Мониторинг сервера прямым Minecraft-пингом (раз в 10 сек).
async function pingServer() {
  const dot = $("srv-status");
  try {
    const d = await window.launcher.pingServer();
    if (d && d.online) {
      dot.textContent = "Онлайн"; dot.className = "srv-dot on";
      $("srv-players").textContent = d.players ? `${d.players.online}/${d.players.max}` : "—";
    } else {
      dot.textContent = "Оффлайн"; dot.className = "srv-dot off";
      $("srv-players").textContent = "—";
    }
  } catch {
    dot.textContent = "Оффлайн"; dot.className = "srv-dot off";
  }
}

init();
