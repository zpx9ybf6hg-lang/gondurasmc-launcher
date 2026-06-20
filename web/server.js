const express = require("express");
const session = require("express-session");
const multer = require("multer");
const fetch = require("node-fetch");
const path = require("path");
const V = require("./views");
const cases = require("./cases");
const inventory = require("./inventory");

function itemMeta() {
  const m = {};
  for (const it of cases.ITEMS) {
    const r = cases.RARITY[it.rarity];
    m[it.id] = { name: it.name, color: r.color, rarityLabel: r.label };
  }
  return m;
}

const DRASL_URL = process.env.DRASL_URL || "https://gondurasmc-auth.fly.dev";
const PORT = process.env.PORT || 8080;

const app = express();
app.set("trust proxy", 1);
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-insecure-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  })
);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

// ── drasl API helper ─────────────────────────────────────────
async function drasl(p, { method = "GET", token, body } = {}) {
  const res = await fetch(`${DRASL_URL}/drasl/api/v2${p}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { message: text }; }
  if (!res.ok) throw new Error((data && data.message) || `Ошибка drasl (${res.status})`);
  return data;
}

function render(res, page, opts = {}) {
  res.send(V.layout({ title: opts.title || "GondurasMC", user: opts.user, body: page(opts) }));
}
const requireAuth = (req, res, next) =>
  req.session.token ? next() : res.redirect("/login");

// PNG 64×64 / 64×32 проверка.
function checkSkin(buf) {
  if (buf.slice(0, 8).toString("hex") !== "89504e470d0a1a0a") throw new Error("Это не PNG.");
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  if (w !== 64 || (h !== 64 && h !== 32)) throw new Error(`Нужен PNG 64×64 или 64×32 (у файла ${w}×${h}).`);
}

// ── Маршруты ─────────────────────────────────────────────────
app.get("/health", (_req, res) => res.send("ok"));

app.get("/", (req, res) => render(res, V.landing, { title: "Главная", user: req.session.user }));

app.get("/register", (req, res) =>
  render(res, V.register, { title: "Регистрация", user: req.session.user })
);

app.post("/register", async (req, res) => {
  const email = (req.body.email || "").trim();
  const nick = (req.body.nick || "").trim();
  const password = req.body.password || "";
  const vals = { email, nick };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return render(res, V.register, { title: "Регистрация", error: "Некорректный email.", values: vals });
  if (!/^[A-Za-z0-9_]{3,16}$/.test(nick))
    return render(res, V.register, { title: "Регистрация", error: "Имя игрока: 3–16 символов, латиница/цифры/_", values: vals });
  if (password.length < 8)
    return render(res, V.register, { title: "Регистрация", error: "Пароль минимум 8 символов.", values: vals });
  try {
    // drasl: username = email (вход на сайт), playerName = ник (вход в лаунчере и в игре).
    const r = await drasl("/users", {
      method: "POST",
      body: { username: email, password, playerName: nick, requestApiToken: true }
    });
    setSession(req, r);
    res.redirect("/profile");
  } catch (e) {
    render(res, V.register, { title: "Регистрация", error: e.message, values: vals });
  }
});

app.get("/login", (req, res) =>
  render(res, V.login, { title: "Вход", user: req.session.user })
);

app.post("/login", async (req, res) => {
  const email = (req.body.email || "").trim();
  const password = req.body.password || "";
  try {
    const r = await drasl("/login", { method: "POST", body: { username: email, password } });
    setSession(req, r);
    res.redirect("/profile");
  } catch (e) {
    render(res, V.login, { title: "Вход", error: "Неверный email или пароль.", values: { email } });
  }
});

app.post("/logout", (req, res) => req.session.destroy(() => res.redirect("/")));

app.get("/profile", requireAuth, async (req, res) => {
  try {
    const user = await drasl("/user", { token: req.session.token });
    const player = user.players && user.players[0];
    render(res, V.profile, {
      title: "Профиль", user, player,
      message: req.query.ok ? "Скин обновлён." : null
    });
  } catch (e) {
    req.session.destroy(() => res.redirect("/login"));
  }
});

app.post("/profile/skin", requireAuth, upload.single("skin"), async (req, res) => {
  try {
    const user = await drasl("/user", { token: req.session.token });
    const player = user.players && user.players[0];
    if (!req.file) throw new Error("Файл не выбран.");
    checkSkin(req.file.buffer);
    await drasl(`/players/${player.uuid}`, {
      method: "PATCH",
      token: req.session.token,
      body: { skinBase64: req.file.buffer.toString("base64"), skinModel: req.body.slim ? "slim" : "classic" }
    });
    res.redirect("/profile?ok=1");
  } catch (e) {
    try {
      const user = await drasl("/user", { token: req.session.token });
      render(res, V.profile, { title: "Профиль", user, player: user.players[0], error: e.message });
    } catch { res.redirect("/login"); }
  }
});

app.get("/download", (req, res) =>
  render(res, V.download, { title: "Скачать", user: req.session.user })
);

// Донат / кейсы
app.get("/donate", requireAuth, (req, res) => {
  const inv = inventory.get(req.session.user.uuid);
  render(res, V.donate, { title: "Донат", user: req.session.user, inv, meta: itemMeta() });
});

app.post("/donate/open", requireAuth, (req, res) => {
  const result = cases.openCase();
  inventory.addItem(req.session.user.uuid, result.winner.id);
  res.json({
    winner: result.winner.id,
    winnerIndex: result.winnerIndex,
    reel: result.reel.map((i) => i.id)
  });
});

function setSession(req, r) {
  req.session.token = r.apiToken;
  req.session.user = { username: r.user.username, uuid: r.user.uuid };
}

app.listen(PORT, () => console.log(`web on :${PORT}, drasl=${DRASL_URL}`));
