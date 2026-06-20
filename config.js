// ─────────────────────────────────────────────────────────────
//  Конфигурация лаунчера.
// ─────────────────────────────────────────────────────────────
const path = require("path");

module.exports = {
  serverName: "GondurasMC",

  // РЕЖИМ ВХОДА: "drasl" — вход по аккаунту drasl (общие аккаунты, нативные скины,
  // защита от угона ника). Сайт регистрации: https://gondurasmc-web.fly.dev
  authMode: "drasl",

  // Базовый URL authlib-injector для drasl (вход + javaagent).
  // ВАЖНО: с завершающим /authlib-injector.
  authBase: "https://gondurasmc-auth.fly.dev/authlib-injector",

  // Сайт для кнопки «Регистрация».
  websiteUrl: "https://gondurasmc-web.fly.dev",

  // Модпак (.mrpack). В dev лежит в корне проекта,
  // в собранном билде — в resources (см. extraResources в package.json).
  modpackFile: "GondurasMC.mrpack",

  // Версия игры и загрузчик (берутся из modrinth.index.json модпака).
  minecraft: {
    version: "1.21.1",
    loader: "neoforge",
    loaderVersion: "21.1.233"
  },

  // Адрес игрового сервера (мониторинг в лаунчере + авто-добавление в список в игре).
  serverHost: "185.207.164.156",
  serverPort: 24145,

  // Моды, которые лаунчер НЕ ставит и удаляет, если они есть (подстроки имени файла).
  // CustomSkinLoader больше не нужен — скины отдаёт drasl нативно для всех.
  excludeMods: ["essential", "indrec", "customskinloader"],

  // Доп-моды поверх модпака (клиентские).
  extraMods: [],

  // Память (МБ). Для Create-сборки лучше не меньше 4 ГБ.
  memory: { min: 2048, max: 6144 },

  // Путь к Java. null = системная (`java` из PATH). MC 1.21.1 требует Java 21+.
  javaPath: null
};
