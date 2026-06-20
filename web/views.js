// HTML-шаблоны кастомного фронтенда GondurasMC.
const esc = (s) =>
  String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

function layout({ title, user, body }) {
  const nav = user
    ? `<a href="/donate">Донат</a>
       <a href="/profile">Профиль</a>
       <a href="/download">Скачать</a>
       <form method="post" action="/logout" class="inline"><button class="navbtn">Выйти</button></form>`
    : `<a href="/donate">Донат</a>
       <a href="/download">Скачать</a>
       <a href="/login">Вход</a>
       <a href="/register" class="nav-cta">Регистрация</a>`;
  return `<!DOCTYPE html><html lang="ru"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} — GondurasMC</title><link rel="stylesheet" href="/style.css">
<link rel="icon" href="/logo.png"></head><body>
<header class="topbar">
  <a class="brand" href="/"><img src="/logo.png" alt="GondurasMC"></a>
  <nav>${nav}</nav>
</header>
<main>${body}</main>
<footer>GondurasMC · Minecraft 1.21.1 · NeoForge</footer>
</body></html>`;
}

function alert(msg, type = "error") {
  if (!msg) return "";
  return `<div class="alert ${type}">${esc(msg)}</div>`;
}

const landing = () => `
<section class="hero">
  <img class="hero-logo" src="/logo.png" alt="GondurasMC">
  <h1>Добро пожаловать на GondurasMC</h1>
  <p class="lead">Технологичная сборка на Create и Mekanism. Зарегистрируйся, поставь скин и заходи через лаунчер.</p>
  <div class="cta-row">
    <a class="btn primary" href="/register">Создать аккаунт</a>
    <a class="btn ghost" href="/download">Скачать лаунчер</a>
  </div>
</section>`;

const register = ({ error, values = {} } = {}) => `
<section class="card narrow">
  <h2>Регистрация</h2>
  <p class="hint">Email — для входа на сайт. Имя игрока — твой ник в игре и вход в лаунчере.</p>
  ${alert(error)}
  <form method="post" action="/register" autocomplete="off">
    <label>Email<input type="email" name="email" value="${esc(values.email)}" placeholder="you@gmail.com" required></label>
    <label>Имя игрока (ник)<input name="nick" value="${esc(values.nick)}" placeholder="3–16, латиница/цифры/_" required></label>
    <label>Пароль<input type="password" name="password" placeholder="минимум 8 символов" required></label>
    <button class="btn primary full">Создать аккаунт</button>
  </form>
  <p class="sub">Уже есть аккаунт? <a href="/login">Войти</a></p>
</section>`;

const login = ({ error, values = {} } = {}) => `
<section class="card narrow">
  <h2>Вход на сайт</h2>
  <p class="hint">Вход по email. В лаунчере — по имени игрока.</p>
  ${alert(error)}
  <form method="post" action="/login" autocomplete="off">
    <label>Email<input type="email" name="email" value="${esc(values.email)}" required></label>
    <label>Пароль<input type="password" name="password" required></label>
    <button class="btn primary full">Войти</button>
  </form>
  <p class="sub">Нет аккаунта? <a href="/register">Регистрация</a></p>
</section>`;

const profile = ({ user, player, message, error }) => `
<section class="card">
  <h2>Профиль</h2>
  ${alert(error)}${alert(message, "ok")}
  <div class="profile-grid">
    <div class="skin-preview">
      ${player && player.skinUrl
        ? `<img src="${esc(player.skinUrl)}" alt="скин">`
        : `<div class="no-skin">Скин не установлен</div>`}
    </div>
    <div class="profile-info">
      <div class="row"><span>Email</span><b>${esc(user.username)}</b></div>
      <div class="row"><span>Имя игрока</span><b>${esc(player ? player.name : "—")}</b></div>
      <div class="row"><span>UUID</span><code>${esc(player ? player.uuid : "—")}</code></div>
    </div>
  </div>

  <h3>Сменить скин</h3>
  <form method="post" action="/profile/skin" enctype="multipart/form-data">
    <input type="file" name="skin" accept="image/png" required>
    <label class="check"><input type="checkbox" name="slim" value="1"> Тонкие руки (Alex)</label>
    <button class="btn primary">Загрузить скин</button>
  </form>
  <p class="hint">PNG 64×64 (или 64×32). Скин увидят все игроки на сервере.</p>
</section>`;

const download = ({ user }) => `
<section class="card">
  <h2>Скачать лаунчер</h2>
  <p class="hint">Лаунчер сам скачает модпак и запустит игру. Вход — под аккаунтом GondurasMC.</p>
  <div class="dl-grid">
    <a class="dl" href="${esc(DL.win)}"><b>Windows</b><span>.exe</span></a>
    <a class="dl" href="${esc(DL.mac)}"><b>macOS</b><span>.dmg</span></a>
    <a class="dl" href="${esc(DL.linux)}"><b>Linux</b><span>.AppImage</span></a>
  </div>
  ${!user ? `<p class="sub">Сначала <a href="/register">зарегистрируйся</a>, чтобы войти в лаунчере.</p>` : ""}
</section>`;

const donate = ({ inv = { items: {}, history: [] }, meta = {} } = {}) => {
  const entries = Object.entries(inv.items).sort((a, b) => b[1] - a[1]);
  const invHtml = entries.length
    ? entries.map(([id, c]) => {
        const m = meta[id] || {};
        return `<div class="inv-tile" data-id="${esc(id)}" style="border-color:${esc(m.color)}">
          <img src="/items/${esc(id)}.png" alt="${esc(m.name)}">
          <span class="inv-name">${esc(m.name)}</span>
          <span class="count">${c}</span></div>`;
      }).join("")
    : `<p class="hint" id="inv-empty">Инвентарь пуст — открой кейс!</p>`;

  return `
<section class="card">
  <h2>Донат · Кейсы</h2>
  <p class="hint">Открывай кейсы бесплатно (пока без лимитов). Выпавшее падает в твой инвентарь на сайте. Позже можно будет забрать на сервер.</p>

  <div class="case-stage">
    <div class="reel-window" id="reel-window">
      <div class="reel-marker"></div>
      <div class="reel" id="reel"></div>
    </div>
    <div class="result hidden" id="result"></div>
  </div>
  <button id="open-btn" class="btn primary big-open">Открыть кейс</button>

  <h3 class="inv-h">Инвентарь</h3>
  <div class="inv-grid" id="inv-grid">${invHtml}</div>
</section>

<script>
const META = ${JSON.stringify(meta)};
const reel = document.getElementById('reel');
const btn = document.getElementById('open-btn');
const TILE_W = 116;

function tileHtml(id){
  const m = META[id] || {};
  return '<div class="reel-tile" style="border-color:'+(m.color||'#2a3146')+'">'
    + '<img src="/items/'+id+'.png"><span>'+(m.name||id)+'</span></div>';
}

btn.addEventListener('click', async () => {
  btn.disabled = true;
  document.getElementById('result').classList.add('hidden');
  let data;
  try { const r = await fetch('/donate/open', {method:'POST'}); data = await r.json(); }
  catch(e){ btn.disabled = false; return; }

  reel.style.transition = 'none';
  reel.style.transform = 'translateX(0)';
  reel.innerHTML = data.reel.map(tileHtml).join('');
  const win = document.getElementById('reel-window');
  void reel.offsetWidth;
  const jitter = Math.random()*40 - 20;
  const target = -(data.winnerIndex*TILE_W + TILE_W/2 - win.clientWidth/2) + jitter;
  reel.style.transition = 'transform 5.5s cubic-bezier(0.10,0.83,0.13,1)';
  reel.style.transform = 'translateX('+target+'px)';

  setTimeout(() => { showResult(data.winner); addToInv(data.winner); btn.disabled = false; }, 5700);
});

function showResult(id){
  const m = META[id] || {};
  const el = document.getElementById('result');
  el.style.borderColor = m.color;
  el.innerHTML = '<img src="/items/'+id+'.png"><div><div class="r-rar" style="color:'+m.color+'">'+m.rarityLabel+'</div><div class="r-name">Выпало: '+m.name+'</div></div>';
  el.classList.remove('hidden');
}

function addToInv(id){
  const grid = document.getElementById('inv-grid');
  const empty = document.getElementById('inv-empty'); if(empty) empty.remove();
  let tile = grid.querySelector('.inv-tile[data-id="'+id+'"]');
  if(tile){ const c = tile.querySelector('.count'); c.textContent = (parseInt(c.textContent)||0)+1; }
  else {
    const m = META[id] || {};
    const d = document.createElement('div');
    d.className = 'inv-tile'; d.dataset.id = id; d.style.borderColor = m.color;
    d.innerHTML = '<img src="/items/'+id+'.png"><span class="inv-name">'+m.name+'</span><span class="count">1</span>';
    grid.prepend(d);
  }
}
</script>`;
};

// Ссылки на сборки лаунчера (заполнить после публикации релизов).
const DL = {
  win: process.env.DL_WIN || "#",
  mac: process.env.DL_MAC || "#",
  linux: process.env.DL_LINUX || "#"
};

module.exports = { layout, landing, register, login, profile, download, donate };
