// Кейс: пул выпадения (id из реестра) + вес + количество (стак = 64).
const { ITEMS, RARITY } = require("./items");

const POOL = [
  { id: "minecraft:cobblestone",     weight: 38, min: 64, max: 512 },
  { id: "minecraft:oak_planks",      weight: 34, min: 1,  max: 32 },
  { id: "minecraft:coal",            weight: 24, min: 32, max: 192 },
  { id: "minecraft:iron_ingot",      weight: 18, min: 8,  max: 128 },
  { id: "minecraft:redstone",        weight: 11, min: 32, max: 192 },
  { id: "minecraft:gold_ingot",      weight: 9,  min: 8,  max: 100 },
  { id: "minecraft:diamond",         weight: 5,  min: 1,  max: 20 },
  { id: "minecraft:emerald",         weight: 4,  min: 1,  max: 32 },
  { id: "minecraft:netherite_ingot", weight: 1,  min: 1,  max: 4 }
];

const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

function pickWeighted() {
  const total = POOL.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const it of POOL) { r -= it.weight; if (r < 0) return it; }
  return POOL[POOL.length - 1];
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

module.exports = { POOL, RARITY, ITEMS, openCase };
