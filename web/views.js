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

const donate = ({ inv = { items: {}, history: [] }, meta = {}, daily = {} } = {}) => {
  const playedH = ((daily.played || 0) / 3600).toFixed(1);
  const needH = ((daily.need || 7200) / 3600);
  const cdH = Math.ceil((daily.cooldownMs || 0) / 3600000);
  let dailyText, locked = !daily.eligible;
  if (daily.eligible) dailyText = "Доступен — открой!";
  else if ((daily.played || 0) < (daily.need || 7200)) dailyText = `Наиграй ${needH} ч сегодня · сейчас ${playedH} ч`;
  else dailyText = `Уже открыт · через ${cdH} ч`;
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
  <h2>Донат</h2>
  <div class="tabs">
    <button class="tab active" data-tab="cases">Кейсы</button>
    <button class="tab" data-tab="shop">Магазин</button>
    <button class="tab" data-tab="vip">Привилегии</button>
    <button class="tab" data-tab="inv">Инвентарь</button>
  </div>

  <!-- КЕЙСЫ -->
  <div class="tab-panel" id="tab-cases">
    <p class="hint">Ежедневный кейс. Нужно наиграть ${needH} ч на сервере, открывается раз в 24 ч.</p>
    <div class="case-list">
      <button class="crate ${locked ? "locked" : ""}" id="crate">
        <div class="crate-art"><div class="crate-lid"></div><div class="crate-latch"></div>${locked ? '<div class="crate-lock">🔒</div>' : ""}</div>
        <div class="crate-name">Ежедневный кейс</div>
        <div class="crate-sub ${daily.eligible ? "ok" : ""}">${esc(dailyText)}</div>
      </button>
    </div>

    <div id="open-stage" class="hidden">
      <div class="reel-window" id="reel-window">
        <div class="reel-marker"></div>
        <div class="reel" id="reel"></div>
      </div>
      <button id="open-btn" class="btn primary big-open"${locked ? " disabled" : ""}>${locked ? "Недоступно" : "Открыть кейс"}</button>
      <p id="open-msg" class="hint" style="text-align:center;margin-top:10px"></p>
    </div>
  </div>

  <!-- МАГАЗИН -->
  <div class="tab-panel hidden" id="tab-shop">
    <p class="hint">Тестовый магазин (бесплатно). Жми «Получить» — предмет упадёт в инвентарь, потом забери в игре командой /claim.</p>
    <div class="shop-grid">
      ${Object.entries(meta).map(([id, m]) => `
        <div class="shop-card" style="border-color:${esc(m.color)}">
          <img src="/items/${esc(id)}.png" alt="${esc(m.name)}">
          <span class="shop-name">${esc(m.name)}</span>
          <button class="btn primary shop-buy" data-id="${esc(id)}">Получить</button>
        </div>`).join("")}
    </div>
  </div>

  <!-- ПРИВИЛЕГИИ -->
  <div class="tab-panel hidden" id="tab-vip">
    <div class="vip-grid">
      <div class="vip-card vip"><div class="vip-name">VIP</div><p class="hint">Скоро</p></div>
      <div class="vip-card vipp"><div class="vip-name">VIP+</div><p class="hint">Скоро</p></div>
      <div class="vip-card prem"><div class="vip-name">Premium</div><p class="hint">Скоро</p></div>
    </div>
  </div>

  <!-- ИНВЕНТАРЬ -->
  <div class="tab-panel hidden" id="tab-inv">
    <h3 class="inv-h">Твой инвентарь</h3>
    <div class="inv-grid" id="inv-grid">${invHtml}</div>
  </div>
</section>

<!-- Оверлей выигрыша -->
<div id="win-overlay" class="win-overlay hidden">
  <div class="win-box" id="win-box">
    <div class="win-title">ВАМ ВЫПАЛО!</div>
    <div class="win-glow" id="win-glow"></div>
    <img id="win-img" alt="">
    <div class="win-name" id="win-name"></div>
    <div class="win-rar" id="win-rar"></div>
    <button class="btn primary" id="win-close">Забрать</button>
  </div>
</div>

<script>
const META = ${JSON.stringify(meta)};
const TILE_W = 116;
const reel = document.getElementById('reel');
const reelWindow = document.getElementById('reel-window');
const openBtn = document.getElementById('open-btn');
let _audio = null;
function audioCtx(){ if(!_audio) _audio = new (window.AudioContext||window.webkitAudioContext)(); return _audio; }

// Вкладки
document.querySelectorAll('.tab').forEach(t => t.onclick = () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === t));
  ['cases','shop','vip','inv'].forEach(p =>
    document.getElementById('tab-'+p).classList.toggle('hidden', p !== t.dataset.tab));
});

// Выбор кейса → показать сцену открытия
document.getElementById('crate').onclick = () => {
  document.getElementById('crate').classList.add('selected');
  document.getElementById('open-stage').classList.remove('hidden');
  document.getElementById('open-stage').scrollIntoView({ behavior: 'smooth', block: 'center' });
};

function tileHtml(id){
  const m = META[id] || {};
  return '<div class="reel-tile rar-'+(m.rarity||'common')+'" style="border-color:'+(m.color||'#2a3146')+'">'
    + '<img src="/items/'+id+'.png"><span>'+(m.name||id)+'</span></div>';
}

// Магазин (бесплатно, тест): получить предмет → в инвентарь.
document.querySelectorAll('.shop-buy').forEach((b) => b.onclick = async () => {
  b.disabled = true;
  try {
    const r = await fetch('/shop/buy', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id: b.dataset.id }) });
    const d = await r.json();
    if (r.ok) { addToInv(d.id, d.count); b.textContent = '✓ +' + d.count; setTimeout(() => { b.textContent = 'Получить'; b.disabled = false; }, 700); }
    else b.disabled = false;
  } catch(e){ b.disabled = false; }
});

// Клик-тик при прохождении тайла под маркером (как в CS).
function playTick(){
  try {
    const ctx = audioCtx(), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square'; o.frequency.value = 1100;
    o.connect(g); g.connect(ctx.destination);
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.start(t); o.stop(t + 0.06);
  } catch(e){}
}

const DUR = 6.0;
openBtn.addEventListener('click', async () => {
  openBtn.disabled = true;
  document.getElementById('open-msg').textContent = '';
  document.querySelector('.reel-tile.landed')?.classList.remove('landed');
  let data;
  try {
    const r = await fetch('/donate/open', {method:'POST'});
    data = await r.json();
    if (!r.ok) { document.getElementById('open-msg').textContent = data.error || 'Недоступно'; openBtn.disabled = false; return; }
  } catch(e){ openBtn.disabled = false; return; }

  reel.style.transition = 'none';
  reel.style.transform = 'translateX(0)';
  reel.innerHTML = data.reel.map(tileHtml).join('');
  void reel.offsetWidth;

  const jitter = Math.random()*36 - 18;
  const target = -(data.winnerIndex*TILE_W + TILE_W/2 - reelWindow.clientWidth/2) + jitter;
  reelWindow.classList.add('spinning');
  reel.style.transition = 'transform ' + DUR + 's cubic-bezier(0.07,0.85,0.12,1)';
  reel.style.transform = 'translateX('+target+'px)';

  // Тики, синхронные с движением (через позицию трансформа).
  let lastIdx = null, running = true;
  (function track(){
    if(!running) return;
    const x = new DOMMatrixReadOnly(getComputedStyle(reel).transform).m41;
    const idx = Math.round((-x + reelWindow.clientWidth/2 - TILE_W/2) / TILE_W);
    if(idx !== lastIdx){ lastIdx = idx; playTick(); }
    requestAnimationFrame(track);
  })();

  // Снять размытие ближе к концу (когда уже медленно).
  setTimeout(() => reelWindow.classList.remove('spinning'), DUR*1000 - 900);

  setTimeout(() => {
    running = false;
    const tile = reel.children[data.winnerIndex];
    if(tile){ tile.classList.add('landed'); tile.style.boxShadow = '0 0 24px ' + (META[data.winner]||{}).color; }
    setTimeout(() => { showWin(data.winner, data.qty); addToInv(data.winner, data.qty); openBtn.disabled = false; }, 450);
  }, DUR*1000 + 60);
});

function showWin(id, qty){
  const m = META[id] || {};
  const ov = document.getElementById('win-overlay');
  const box = document.getElementById('win-box');
  document.getElementById('win-img').src = '/items/'+id+'.png';
  document.getElementById('win-name').textContent = m.name + ' ×' + qty;
  const rar = document.getElementById('win-rar');
  rar.textContent = m.rarityLabel; rar.style.color = m.color;
  document.getElementById('win-glow').style.background =
    'radial-gradient(circle, '+m.color+'88 0%, transparent 70%)';
  box.style.borderColor = m.color;
  box.className = 'win-box rar-' + (m.rarity || 'common');
  ov.classList.remove('hidden');
  playWinSound(m.rarity);
}
document.getElementById('win-close').onclick = () =>
  document.getElementById('win-overlay').classList.add('hidden');

// Звук без файлов (Web Audio): чем реже — тем «богаче» фанфара.
function playWinSound(rarity){
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const seq = rarity === 'legendary' ? [523,659,784,1047,1319]
      : rarity === 'epic' ? [523,784,1047]
      : rarity === 'rare' ? [523,659,784] : [523,659];
    let t = ctx.currentTime;
    seq.forEach((f) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      o.start(t); o.stop(t + 0.3); t += 0.12;
    });
  } catch(e){}
}

function addToInv(id, qty){
  const grid = document.getElementById('inv-grid');
  const empty = document.getElementById('inv-empty'); if(empty) empty.remove();
  let tile = grid.querySelector('.inv-tile[data-id="'+id+'"]');
  if(tile){ const c = tile.querySelector('.count'); c.textContent = (parseInt(c.textContent)||0) + qty; }
  else {
    const m = META[id] || {};
    const d = document.createElement('div');
    d.className = 'inv-tile'; d.dataset.id = id; d.style.borderColor = m.color;
    d.innerHTML = '<img src="/items/'+id+'.png"><span class="inv-name">'+m.name+'</span><span class="count">'+qty+'</span>';
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
