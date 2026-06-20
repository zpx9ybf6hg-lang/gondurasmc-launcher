// Магазин: секции с предметами (id из реестра) + цена в G и количество за покупку.
const CATEGORIES = [
  {
    id: "resources", name: "Ресурсы",
    items: [
      { id: "minecraft:coal",            price: 40,   count: 8 },
      { id: "minecraft:copper_ingot",    price: 60,   count: 1 },
      { id: "minecraft:iron_ingot",      price: 120,  count: 1 },
      { id: "minecraft:redstone",        price: 100,  count: 8 },
      { id: "minecraft:lapis_lazuli",    price: 80,   count: 1 },
      { id: "minecraft:quartz",          price: 80,   count: 1 },
      { id: "minecraft:gold_ingot",      price: 300,  count: 1 },
      { id: "minecraft:amethyst_shard",  price: 250,  count: 1 },
      { id: "minecraft:emerald",         price: 1000, count: 1 },
      { id: "minecraft:diamond",         price: 1200, count: 1 },
      { id: "minecraft:netherite_ingot", price: 4000, count: 1 }
    ]
  },
  {
    id: "blocks", name: "Блоки",
    items: [
      { id: "minecraft:cobblestone",   price: 50,   count: 64 },
      { id: "minecraft:oak_planks",    price: 60,   count: 64 },
      { id: "minecraft:oak_log",       price: 70,   count: 16 },
      { id: "minecraft:stone",         price: 60,   count: 64 },
      { id: "minecraft:sand",          price: 50,   count: 32 },
      { id: "minecraft:glass",         price: 90,   count: 16 },
      { id: "minecraft:bricks",        price: 120,  count: 16 },
      { id: "minecraft:obsidian",      price: 300,  count: 8 },
      { id: "minecraft:iron_block",    price: 1000, count: 1 },
      { id: "minecraft:gold_block",    price: 2500, count: 1 },
      { id: "minecraft:diamond_block", price: 9000, count: 1 }
    ]
  },
  {
    id: "mods", name: "Моды",
    items: [
      { id: "create:zinc_ingot",               price: 80,   count: 1 },
      { id: "create:andesite_alloy",           price: 120,  count: 1 },
      { id: "create:brass_ingot",              price: 300,  count: 1 },
      { id: "mekanism:osmium_ingot",           price: 150,  count: 1 },
      { id: "mekanism:bronze_ingot",           price: 150,  count: 1 },
      { id: "mekanism:steel_ingot",            price: 200,  count: 1 },
      { id: "mekanism:refined_obsidian_ingot", price: 1500, count: 1 }
    ]
  }
];

const PRIVILEGES = [
  { id: "vip",      name: "VIP",     price: 5000,  color: "#4aa3ff", perks: ["Цветной ник", "/kit vip", "2 дома"] },
  { id: "vipplus",  name: "VIP+",    price: 12000, color: "#7d63ff", perks: ["Всё из VIP", "/fly", "5 домов", "/feed"] },
  { id: "premium",  name: "Premium", price: 25000, color: "#ffae34", perks: ["Всё из VIP+", "/heal", "10 домов", "префикс ★"] }
];

// Быстрый поиск цены покупки по id.
const priceMap = {};
for (const c of CATEGORIES) for (const it of c.items) priceMap[it.id] = it;

module.exports = { CATEGORIES, PRIVILEGES, priceMap };
