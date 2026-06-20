# Фронтенд GondurasMC (для игроков)

Кастомный сайт поверх API drasl: регистрация, вход, профиль + скин, скачивание лаунчера.

- **URL:** https://gondurasmc-web.fly.dev
- **App:** `gondurasmc-web` · регион `arn`
- **Бэкенд auth:** drasl (`DRASL_URL`), через `/drasl/api/v2`

## Страницы
- `/` — лендинг
- `/register` — регистрация (POST → drasl `/users`)
- `/login` — вход (POST → drasl `/login`, токен в серверной сессии)
- `/profile` — профиль + загрузка скина (PATCH → drasl `/players/{uuid}`)
- `/download` — ссылки на сборки лаунчера

## Команды
```bash
cd web
fly deploy --remote-only
fly logs --app gondurasmc-web
```

## Переменные/секреты
- `SESSION_SECRET` — секрет cookie-сессии (`fly secrets set ...`). Уже задан.
- `DRASL_URL` — адрес drasl (в `fly.toml`).
- `DL_WIN` / `DL_MAC` / `DL_LINUX` — ссылки на сборки лаунчера (GitHub Releases/R2).
  Задать: `fly secrets set DL_WIN=https://... DL_MAC=https://... DL_LINUX=https://...`

## Локальный запуск
```bash
npm install
SESSION_SECRET=dev DRASL_URL=https://gondurasmc-auth.fly.dev node server.js
# http://localhost:8080
```

## Свой домен
`fly certs add gondurasmc.com --app gondurasmc-web` + DNS-записи.

## Замечание
Стандартный UI drasl (`/web/*` на auth-домене) остаётся доступным, но мы на него
не ссылаемся — публичное лицо это наш фронт. При желании можно закрыть позже.
