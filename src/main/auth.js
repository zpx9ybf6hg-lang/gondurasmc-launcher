// Авторизация через drasl (Yggdrasil-совместимый API).
// Возвращает объект, готовый для minecraft-launcher-core + authlib-injector.
const fetch = require("node-fetch");
const crypto = require("crypto");

function clientToken() {
  // Стабильный clientToken на машину (чтобы не разлогинивало каждый запуск).
  return crypto
    .createHash("sha1")
    .update(require("os").hostname() + require("os").userInfo().username)
    .digest("hex");
}

async function login(authBase, username, password) {
  const res = await fetch(`${authBase}/authserver/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agent: { name: "Minecraft", version: 1 },
      username,
      password,
      clientToken: clientToken(),
      requestUser: true
    })
  });

  if (!res.ok) {
    let msg = `Ошибка входа (${res.status})`;
    try {
      const e = await res.json();
      msg = e.errorMessage || e.error || msg;
    } catch (_) {}
    throw new Error(msg);
  }

  const data = await res.json();
  if (!data.selectedProfile) {
    throw new Error("У аккаунта нет игрового профиля. Зайди на сайт и создай ник.");
  }

  return {
    access_token: data.accessToken,
    client_token: data.clientToken,
    uuid: data.selectedProfile.id,
    name: data.selectedProfile.name,
    user_properties: "{}",
    meta: { type: "drasl", demo: false }
  };
}

// Проверка/продление сохранённого токена.
async function validate(authBase, accessToken) {
  const res = await fetch(`${authBase}/authserver/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken, clientToken: clientToken() })
  });
  return res.status === 204;
}

async function refresh(authBase, accessToken) {
  const res = await fetch(`${authBase}/authserver/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accessToken,
      clientToken: clientToken(),
      requestUser: true
    })
  });
  if (!res.ok) throw new Error("Сессия истекла, войди заново.");
  const data = await res.json();
  return {
    access_token: data.accessToken,
    client_token: data.clientToken,
    uuid: data.selectedProfile.id,
    name: data.selectedProfile.name,
    user_properties: "{}",
    meta: { type: "drasl", demo: false }
  };
}

module.exports = { login, validate, refresh, clientToken };
