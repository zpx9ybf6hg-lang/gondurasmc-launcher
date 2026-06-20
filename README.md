# GondurasMC Launcher

Лаунчер для модпака **GondurasMC** (Minecraft 1.21.1 + NeoForge 21.1.233).

## Как сейчас работает (локальный режим)

1. Игрок вводит **ник + пароль**. Если ника ещё нет — аккаунт создаётся автоматически.
   Пароль проверяет сам лаунчер (хранится как scrypt-хеш в `accounts.json`).
2. По кнопке **ИГРАТЬ** лаунчер:
   - ставит **NeoForge 21.1.233** (официальный установщик, headless);
   - распаковывает модпак `GondurasMC.mrpack` (качает 99 модов + копирует
     `overrides/`: ещё 4 мода, конфиги, options.txt, servers.dat);
   - запускает игру в **offline-режиме** под выбранным ником.

Это «пиратский»/offline вход: сервер должен быть в `online-mode=false`.
Скины и общие аккаунты — следующий этап (drasl + authlib-injector, файлы уже заложены).

## Запуск (разработка)

```bash
npm install
npm start
```

## Сборка под платформы

```bash
npm run dist          # текущая ОС
npm run dist:win      # Windows (.exe / nsis)
npm run dist:mac      # macOS (.dmg)
npm run dist:linux    # Linux (AppImage)
```
Модпак `GondurasMC.mrpack` упаковывается в билд автоматически (extraResources).

## Где лежат данные игрока
- macOS: `~/Library/Application Support/GondurasMC/`
- Windows: `%APPDATA%/GondurasMC/`
- Linux: `~/.local/share/GondurasMC/`

Внутри: `accounts.json`, папка `instance/` (.minecraft с модами и NeoForge),
маркер `installed-21.1.233.json` (чтобы не переустанавливать модпак каждый раз).

## ⚠️ Java
MC 1.21.1 / NeoForge 21.1.x рассчитаны на **Java 21**. На машине сейчас Java 23 —
обычно работает, но если игра падает на старте, поставь **Java 21** (Temurin/Adoptium)
и пропиши путь к ней в `config.js` → `javaPath`. На будущее — лаунчер можно научить
скачивать свой JRE.

## Структура
```
config.js              настройки (версия, память, режим входа, путь к Java)
src/main/account.js    локальные аккаунты + offline-UUID
src/main/neoforge.js   установка NeoForge (headless)
src/main/modpack.js    распаковка .mrpack + докачка модов по sha1
src/main/launch.js     запуск игры (MCLC, offline)
src/main/main.js       Electron + связка всего
src/renderer/          интерфейс (вход, ИГРАТЬ, прогресс, лог)
```

## TODO (следующие этапы)
- [ ] Скины и единые аккаунты через drasl + authlib-injector.
- [ ] Скачивание собственного JRE (Java 21), чтобы не зависеть от системной.
- [ ] Автообновление лаунчера и модпака (новый .mrpack → докачка дельты).
