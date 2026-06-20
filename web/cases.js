// Предметы кейса и логика выпадения (взвешенный рандом).
const ITEMS = [
  { id: "cobblestone",    name: "Булыжник",  rarity: "common",    weight: 38 },
  { id: "oak_planks",     name: "Доски",     rarity: "common",    weight: 34 },
  { id: "coal",           name: "Уголь",     rarity: "uncommon",  weight: 24 },
  { id: "iron_ingot",     name: "Железо",    rarity: "uncommon",  weight: 18 },
  { id: "redstone",       name: "Редстоун",  rarity: "rare",      weight: 11 },
  { id: "gold_ingot",     name: "Золото",    rarity: "rare",      weight: 9 },
  { id: "diamond",        name: "Алмаз",     rarity: "epic",      weight: 5 },
  { id: "emerald",        name: "Изумруд",   rarity: "epic",      weight: 4 },
  { id: "netherite_ingot", name: "Незерит",  rarity: "legendary", weight: 1 }
];

const RARITY = {
  common:    { label: "Обычный",     color: "#9aa6c2" },
  uncommon:  { label: "Необычный",   color: "#4aa3ff" },
  rare:      { label: "Редкий",      color: "#7d63ff" },
  epic:      { label: "Эпический",   color: "#d152ff" },
  legendary: { label: "Легендарный", color: "#ffae34" }
};

const byId = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

function pickWeighted() {
  const total = ITEMS.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const it of ITEMS) {
    r -= it.weight;
    if (r < 0) return it;
  }
  return ITEMS[ITEMS.length - 1];
}

// Лента для анимации (как в CS): много случайных + победитель на фикс. позиции.
function buildReel(winner, length = 60, winnerIndex = 52) {
  const reel = [];
  for (let i = 0; i < length; i++) {
    reel.push(i === winnerIndex ? winner : pickWeighted());
  }
  return { reel, winnerIndex };
}

function openCase() {
  const winner = pickWeighted();
  return { winner, ...buildReel(winner) };
}

module.exports = { ITEMS, RARITY, byId, openCase };
