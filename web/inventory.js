// Инвентарь игрока в БД сайта (JSON-файл на томе). Ключ — uuid аккаунта.
const fs = require("fs");
const path = require("path");

const DIR = process.env.INVENTORY_DIR || path.join(__dirname, "data");
fs.mkdirSync(DIR, { recursive: true });

function file(uuid) {
  return path.join(DIR, `${String(uuid).replace(/[^a-z0-9-]/gi, "")}.json`);
}

function get(uuid) {
  try {
    return JSON.parse(fs.readFileSync(file(uuid), "utf8"));
  } catch {
    return { items: {}, history: [] };
  }
}

function save(uuid, inv) {
  fs.writeFileSync(file(uuid), JSON.stringify(inv));
}

function addItem(uuid, itemId) {
  const inv = get(uuid);
  inv.items[itemId] = (inv.items[itemId] || 0) + 1;
  inv.history.unshift({ item: itemId, at: Date.now() });
  if (inv.history.length > 50) inv.history.length = 50;
  save(uuid, inv);
  return inv;
}

module.exports = { get, addItem };
