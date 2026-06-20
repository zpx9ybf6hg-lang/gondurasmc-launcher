# Auth-сервер (drasl) на Fly.io

Yggdrasil-движок: аккаунты, авторизация, сессии, скины.

- **URL:** https://gondurasmc-auth.fly.dev
- **App:** `gondurasmc-auth` · регион `arn` (Стокгольм)
- **Том:** `drasl_data` → `/var/lib/drasl` (SQLite, скины, ключи подписи)
- **authlib-injector URL** (для сервера и лаунчера): `https://gondurasmc-auth.fly.dev`

## Файлы
- `Dockerfile` — `FROM unmojang/drasl` + наш `config.toml`
- `config.toml` — Domain/BaseURL, открытая регистрация, оффлайн-UUID, админ
- `fly.toml` — Fly: порт 25585, том, всегда онлайн

## Команды
```bash
cd auth
fly deploy --remote-only      # передеплой после правки config.toml
fly logs --app gondurasmc-auth
fly status --app gondurasmc-auth
fly ssh console --app gondurasmc-auth   # внутрь контейнера
```

## Первый запуск
1. Открой https://gondurasmc-auth.fly.dev/web/registration и зарегистрируй ник
   `lolercasepig` — он станет админом (он в `DefaultAdmins`).
2. Зайди в профиль, загрузи скин — проверь, что сохраняется.

## Подключение своего домена (когда будет)
1. `fly certs add auth.твойдомен.com --app gondurasmc-auth`
2. Добавь DNS-записи, которые покажет команда (CNAME/A на Fly).
3. В `config.toml` поменяй `Domain` и `BaseURL` на `auth.твойдомен.com` → `fly deploy`.
4. В лаунчере и на сервере обнови authlib-injector URL на новый.

## Обновление drasl
```bash
fly deploy --remote-only   # тянет свежий unmojang/drasl при пересборке
```
Перед обновлением смотри release-notes drasl на предмет breaking changes.
