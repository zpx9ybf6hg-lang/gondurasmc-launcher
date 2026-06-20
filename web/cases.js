// Предметы кейса: вероятность (weight) + диапазон количества (min..max). Стак = 64.
const ITEMS = [
  { id: "cobblestone",     name: "Булыжник",  rarity: "common",    weight: 38, min: 64, max: 512 }, // 1–8 стаков
  { id: "oak_planks",      name: "Дерево",    rarity: "common",    weight: 34, min: 1,  max: 32 },
  { id: "coal",            name: "Уголь",     rarity: "uncommon",  weight: 24, min: 32, max: 192 }, // 32–3 стака
  { id: "iron_ingot",      name: "Железо",    rarity: "uncommon",  weight: 18, min: 8,  max: 128 }, // 8–2 стака
  { id: "redstone",        name: "Редстоун",  rarity: "rare",      weight: 11, min: 32, max: 192 }, // 32–3 стака
  { id: "gold_ingot",      name: "Золото",    rarity: "rare",      weight: 9,  min: 8,  max: 100 },
  { id: "diamond",         name: "Алмаз",     rarity: "epic",      weight: 5,  min: 1,  max: 20 },
  { id: "emerald",         name: "Изумруд",   rarity: "epic",      weight: 4,  min: 1,  max: 32 },
  { id: "netherite_ingot", name: "Незерит",   rarity: "legendary", weight: 1,  min: 1,  max: 4 }
];

const RARITY = {
  common:    { label: "Обычный",     color: "#9aa6c2" },
  uncommon:  { label: "Необычный",   color: "#4aa3ff" },
  rare:      { label: "Редкий",      color: "#7d63ff" },
  epic:      { label: "Эпический",   color: "#d152ff" },
  legendary: { label: "Легендарный", color: "#ffae34" }
};

const byId = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

function pickWeighted() {
  const total = ITEMS.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const it of ITEMS) {
    r -= it.weight;
    if (r < 0) return it;
  }
  return ITEMS[ITEMS.length - 1];
}

function buildReel(winner, length = 60, winnerIndex = 52) {
  const reel = [];
  for (let i = 0; i < length; i++) reel.push(i === winnerIndex ? winner : pickWeighted());
  return { reel, winnerIndex };
}

function openCase() {
  const winner = pickWeighted();
  const qty = randInt(winner.min, winner.max);
  return { winner, qty, ...buildReel(winner) };
}

module.exports = { ITEMS, RARITY, byId, openCase };
