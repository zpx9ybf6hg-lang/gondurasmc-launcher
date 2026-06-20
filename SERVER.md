# Сервер GondurasMC (Фаза 3): authlib-injector + online-mode

Серверная папка собирается скриптом `build-server.js` и **точно совпадает** с клиентским
модпаком (минус чисто клиентские моды). Сервер проверяет вход игроков через **drasl** —
зайти можно только под зарегистрированным аккаунтом, чужой ник кикается.

## Что делает `node build-server.js`
Создаёт папку `server/`:
- 94 серверных мода из модпака + общие из overrides (Essential/Sodium и пр. исключены);
- конфиги модпака (`config/`);
- серверный **NeoForge 21.1.233**;
- `authlib-injector.jar` + `user_jvm_args.txt` с `-javaagent:...=https://gondurasmc-auth.fly.dev`;
- `server.properties` с **`online-mode=true`** (проверка через drasl);
- `start.sh` / `start.bat`.

## Требования сервера
- **Java 21** (NeoForge 1.21.1). На своей машине Java 23 заводится, но на хосте ставь 21.
- **RAM:** 6 ГБ (Create+Mekanism). В `user_jvm_args.txt` уже `-Xmx6144M`.
- Открыть порт **25565** (TCP).

## Запуск на хосте
```bash
# на сервере, в папке проекта (где GondurasMC.mrpack и build-server.js)
node build-server.js          # соберёт server/ (нужен Node + Java)
cd server
./start.sh                    # Linux/macOS   (start.bat на Windows)
```
Первый старт генерирует мир — это пара минут. Сервер готов, когда в логе `Done (X.XXXs)!`.

## Проверка защиты от угона ника (главное)
1. В лаунчере войди под своим аккаунтом drasl → подключись к серверу → должен пустить.
2. Попробуй зайти левым лаунчером/offline под чужим ником → **должно кикнуть**
   (`Failed to verify username` / `Invalid session`), т.к. нет валидного токена drasl.

## Если меняешь домен drasl
После переключения BaseURL на свой домен — пересобери:
`node build-server.js` (он подставит новый `authBase` из `config.js`).

## Где запускать
- **Игровой хостинг** (Aternos не подойдёт — нужен свой JVM-флаг; нужен VPS/мод-хостинг
  с доступом к запуску jar и JVM-аргументам).
- **Свой VPS** (Hetzner/Contabo и т.п.): поставить Java 21 + Node, скопировать проект,
  `node build-server.js`, `./start.sh` (лучше под systemd/screen).
- **Своя машина** для теста: можно, но нужен проброс порта 25565 для друзей.
