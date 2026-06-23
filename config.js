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
  // health-damage-hud конфликтует с другим HUD-модом.
  // Sodium 0.8.12-beta из модпака теперь работает (краш был из-за недокачанных
  // LWJGL-библиотек, исправлено в ensureLibraries) и нужен модам Sable/Veil.
  // sodium-neoforge-0.6.13 — наш старый временный мод, удаляем у тех, у кого он остался
  // (заменён обратно на 0.8.12-beta из модпака).
  excludeMods: ["essential", "indrec", "customskinloader", "health-damage-hud", "sodium-neoforge-0.6.13"],

  // Доп-моды поверх модпака (скачиваются автоматически, если отсутствуют).
  extraMods: [
    {
      name: "open-parties-and-claims-neoforge-1.21.1-0.27.5.jar",
      url: "https://cdn.modrinth.com/data/gF3BGWvG/versions/N11y4hWk/open-parties-and-claims-neoforge-1.21.1-0.27.5.jar",
      sha1: "72a83713417b82bcd66f4b1fbe0adaa5f43e363b"
    }
  ],

  // Память (МБ). Для Create-сборки лучше не меньше 4 ГБ.
  memory: { min: 2048, max: 6144 },

  // Путь к Java. null = системная (`java` из PATH). MC 1.21.1 требует Java 21+.
  javaPath: null
};
