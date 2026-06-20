// Реестр всех предметов: id (как в /give) → название, текстура (файл в /items), редкость.
const RARITY = {
  common:    { label: "Обычный",     color: "#9aa6c2" },
  uncommon:  { label: "Необычный",   color: "#4aa3ff" },
  rare:      { label: "Редкий",      color: "#7d63ff" },
  epic:      { label: "Эпический",   color: "#d152ff" },
  legendary: { label: "Легендарный", color: "#ffae34" }
};

const ITEMS = {
  // ── Ваниль: ресурсы ──
  "minecraft:diamond":         { name: "Алмаз",      tex: "diamond",         rarity: "epic" },
  "minecraft:emerald":         { name: "Изумруд",    tex: "emerald",         rarity: "epic" },
  "minecraft:netherite_ingot": { name: "Незерит",    tex: "netherite_ingot", rarity: "legendary" },
  "minecraft:gold_ingot":      { name: "Золото",     tex: "gold_ingot",      rarity: "rare" },
  "minecraft:iron_ingot":      { name: "Железо",     tex: "iron_ingot",      rarity: "uncommon" },
  "minecraft:copper_ingot":    { name: "Медь",       tex: "copper_ingot",    rarity: "common" },
  "minecraft:lapis_lazuli":    { name: "Лазурит",    tex: "lapis_lazuli",    rarity: "uncommon" },
  "minecraft:quartz":          { name: "Кварц",      tex: "quartz",          rarity: "uncommon" },
  "minecraft:amethyst_shard":  { name: "Аметист",    tex: "amethyst_shard",  rarity: "rare" },
  "minecraft:coal":            { name: "Уголь",      tex: "coal",            rarity: "common" },
  "minecraft:redstone":        { name: "Редстоун",   tex: "redstone",        rarity: "uncommon" },
  // ── Ваниль: блоки ──
  "minecraft:cobblestone":     { name: "Булыжник",   tex: "cobblestone",     rarity: "common" },
  "minecraft:oak_planks":      { name: "Доски",      tex: "oak_planks",      rarity: "common" },
  "minecraft:oak_log":         { name: "Бревно",     tex: "oak_log",         rarity: "common" },
  "minecraft:stone":           { name: "Камень",     tex: "stone",           rarity: "common" },
  "minecraft:dirt":            { name: "Земля",      tex: "dirt",            rarity: "common" },
  "minecraft:glass":           { name: "Стекло",     tex: "glass",           rarity: "common" },
  "minecraft:obsidian":        { name: "Обсидиан",   tex: "obsidian",        rarity: "rare" },
  "minecraft:bricks":          { name: "Кирпичи",    tex: "bricks",          rarity: "common" },
  "minecraft:sand":            { name: "Песок",      tex: "sand",            rarity: "common" },
  "minecraft:gold_block":      { name: "Блок золота",  tex: "gold_block",    rarity: "rare" },
  "minecraft:diamond_block":   { name: "Блок алмазов", tex: "diamond_block", rarity: "epic" },
  "minecraft:iron_block":      { name: "Блок железа",  tex: "iron_block",    rarity: "uncommon" },
  // ── Моды ──
  "mekanism:steel_ingot":            { name: "Сталь",              tex: "mek_ingot_steel",            rarity: "rare" },
  "mekanism:osmium_ingot":           { name: "Осмий",              tex: "mek_ingot_osmium",           rarity: "uncommon" },
  "mekanism:bronze_ingot":           { name: "Бронза",             tex: "mek_ingot_bronze",           rarity: "uncommon" },
  "mekanism:refined_obsidian_ingot": { name: "Очищ. обсидиан",     tex: "mek_ingot_refined_obsidian", rarity: "epic" },
  "create:andesite_alloy":           { name: "Андезит. сплав",     tex: "create_andesite_alloy",      rarity: "uncommon" },
  "create:zinc_ingot":               { name: "Цинк",               tex: "create_zinc_ingot",          rarity: "common" },
  "create:brass_ingot":              { name: "Латунь",             tex: "create_brass_ingot",         rarity: "rare" }
};

module.exports = { ITEMS, RARITY };
