// Хранилище игрока: донат-инвентарь + наигранное время за сегодня + кулдаун кейса.
// Ключ — UUID игрока (совпадает на сайте и на сервере через authlib-injector/drasl).
const fs = require("fs");
const path = require("path");

const DIR = process.env.INVENTORY_DIR || path.join(__dirname, "data");
fs.mkdirSync(DIR, { recursive: true });

const NEED_SECONDS = Number(process.env.DAILY_NEED_SECONDS || 7200); // 2 часа
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // раз в 24 часа

function file(uuid) {
  return path.join(DIR, `${String(uuid).replace(/[^a-z0-9-]/gi, "")}.json`);
}
function today() {
  return new Date().toISOString().slice(0, 10);
}

function get(uuid) {
  try {
    return JSON.parse(fs.readFileSync(file(uuid), "utf8"));
  } catch {
    return { items: {}, history: [], playtimeDate: today(), playtimeSeconds: 0, lastDailyOpen: 0 };
  }
}
function save(uuid, s) {
  fs.writeFileSync(file(uuid), JSON.stringify(s));
}

function addItem(uuid, itemId, count = 1) {
  const s = get(uuid);
  s.items[itemId] = (s.items[itemId] || 0) + count;
  s.history.unshift({ item: itemId, count, at: Date.now() });
  if (s.history.length > 50) s.history.length = 50;
  save(uuid, s);
  return s;
}

// Забрать все предметы (для выдачи на сервере) и очистить.
function takeAll(uuid) {
  const s = get(uuid);
  const items = s.items || {};
  s.items = {};
  save(uuid, s);
  return items;
}

function addPlaytime(uuid, seconds) {
  const s = get(uuid);
  if (s.playtimeDate !== today()) { s.playtimeDate = today(); s.playtimeSeconds = 0; }
  s.playtimeSeconds = (s.playtimeSeconds || 0) + seconds;
  save(uuid, s);
  return s.playtimeSeconds;
}

function dailyStatus(uuid) {
  const s = get(uuid);
  const played = s.playtimeDate === today() ? s.playtimeSeconds || 0 : 0;
  const cooldownMs = Math.max(0, COOLDOWN_MS - (Date.now() - (s.lastDailyOpen || 0)));
  return {
    eligible: played >= NEED_SECONDS && cooldownMs === 0,
    played,
    need: NEED_SECONDS,
    cooldownMs
  };
}

function markDailyOpen(uuid) {
  const s = get(uuid);
  s.lastDailyOpen = Date.now();
  save(uuid, s);
}

// ── Валюта G ──
function getBalance(uuid) { return get(uuid).balance || 0; }
function addBalance(uuid, amount) {
  const s = get(uuid);
  s.balance = (s.balance || 0) + amount;
  save(uuid, s);
  return s.balance;
}
function spend(uuid, amount) {
  const s = get(uuid);
  if ((s.balance || 0) < amount) return false;
  s.balance -= amount;
  save(uuid, s);
  return true;
}

// ── Привилегия ──
function getRank(uuid) { return get(uuid).rank || null; }
function setRank(uuid, rank) { const s = get(uuid); s.rank = rank; save(uuid, s); }

module.exports = {
  get, addItem, takeAll, addPlaytime, dailyStatus, markDailyOpen, NEED_SECONDS,
  getBalance, addBalance, spend, getRank, setRank
};
