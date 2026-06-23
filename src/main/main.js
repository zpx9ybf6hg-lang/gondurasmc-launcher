const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const fetch = require("node-fetch");
const { autoUpdater } = require("electron-updater");
const cfg = require("../../config");
const auth = require("./auth");
const { installModpack, enforceMods } = require("./modpack");
const { ensureNeoForge } = require("./neoforge");
const { launchGame, ensureLibraries } = require("./launch");
const { writeServersDat } = require("./serverlist");
const { pingServer } = require("./ping");
const { resolveJava } = require("./javahelper");

// Корень данных лаунчера по ОС.
function dataRoot() {
  const base =
    process.platform === "win32"
      ? path.join(os.homedir(), "AppData", "Roaming")
      : process.platform === "darwin"
      ? path.join(os.homedir(), "Library", "Application Support")
      : path.join(os.homedir(), ".local", "share");
  const dir = path.join(base, "GondurasMC");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Настройки лаунчера (RAM, своя папка игры).
const settingsFile = () => path.join(dataRoot(), "settings.json");
function loadSettings() {
  try { return JSON.parse(fs.readFileSync(settingsFile(), "utf8")); } catch { return {}; }
}
function saveSettings(s) { fs.writeFileSync(settingsFile(), JSON.stringify(s, null, 2)); }

const gameDir = () => {
  const s = loadSettings();
  const d = s.gameDir || path.join(dataRoot(), "instance");
  fs.mkdirSync(d, { recursive: true });
  return d;
};

// Память: из настроек, иначе из config; ограничиваем разумным максимумом.
function maxRam() {
  const s = loadSettings();
  return s.maxRam || cfg.memory.max;
}

function modpackPath() {
  const packed = path.join(process.resourcesPath || "", cfg.modpackFile);
  if (process.resourcesPath && fs.existsSync(packed)) return packed;
  return path.join(__dirname, "..", "..", cfg.modpackFile);
}

// Сессия (полный объект авторизации drasl).
const sessionFile = () => path.join(dataRoot(), "session.json");
function saveSession(a) { fs.writeFileSync(sessionFile(), JSON.stringify(a)); }
function loadSession() {
  try { return JSON.parse(fs.readFileSync(sessionFile(), "utf8")); } catch { return null; }
}
function clearSession() { try { fs.unlinkSync(sessionFile()); } catch {} }

const installedFile = () =>
  path.join(dataRoot(), `installed-${cfg.minecraft.loaderVersion}.json`);
function loadInstalled() {
  try { return JSON.parse(fs.readFileSync(installedFile(), "utf8")); } catch { return null; }
}
function saveInstalled(info) { fs.writeFileSync(installedFile(), JSON.stringify(info, null, 2)); }

async function downloadFile(url, dest) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

// Скачать Minecraft assets (индекс + объекты) если отсутствуют.
async function ensureAssets(gameDir, vanillaVersion, report) {
  const log = (t) => report({ stage: "assets", text: t });
  const vanillaJson = JSON.parse(
    fs.readFileSync(path.join(gameDir, "versions", vanillaVersion, `${vanillaVersion}.json`), "utf8")
  );
  const assetId = vanillaJson.assetIndex.id;
  const assetsDir = path.join(gameDir, "assets");
  const indexesDir = path.join(assetsDir, "indexes");
  const objectsDir = path.join(assetsDir, "objects");
  const indexFile = path.join(indexesDir, `${assetId}.json`);

  fs.mkdirSync(indexesDir, { recursive: true });
  fs.mkdirSync(objectsDir, { recursive: true });

  if (!fs.existsSync(indexFile)) {
    log("Скачиваю индекс ассетов...");
    await downloadFile(vanillaJson.assetIndex.url, indexFile);
  }

  const index = JSON.parse(fs.readFileSync(indexFile, "utf8"));
  const all = Object.values(index.objects);
  const missing = all.filter(({ hash }) =>
    !fs.existsSync(path.join(objectsDir, hash.slice(0, 2), hash))
  );
  if (missing.length === 0) return;

  log(`Скачиваю ассеты (${missing.length} файлов)...`);
  let done = 0;
  const BATCH = 30;
  for (let i = 0; i < missing.length; i += BATCH) {
    await Promise.all(
      missing.slice(i, i + BATCH).map(async ({ hash }) => {
        const dir = path.join(objectsDir, hash.slice(0, 2));
        fs.mkdirSync(dir, { recursive: true });
        const url = `https://resources.download.minecraft.net/${hash.slice(0, 2)}/${hash}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Asset ${hash}: HTTP ${res.status}`);
        fs.writeFileSync(path.join(dir, hash), Buffer.from(await res.arrayBuffer()));
        done++;
        if (done % 200 === 0 || done === missing.length)
          log(`Скачиваю ассеты ${done}/${missing.length}...`);
      })
    );
  }
  log("Ассеты скачаны.");
}

// Проверка версии модпака на сайте (единое обновление для всех).
async function remoteModpack() {
  try {
    const r = await fetch(`${cfg.websiteUrl}/modpack/version.json`);
    if (!r.ok) return null;
    return await r.json(); // { version, url }
  } catch { return null; }
}

let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 700,
    resizable: false,
    title: cfg.serverName,
    backgroundColor: "#0b1422",
    icon: path.join(__dirname, "..", "..", "assets", "logo.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, "..", "renderer", "index.html"));
}

const REPO = "zpx9ybf6hg-lang/gondurasmc-launcher";
let macUpdate = null;

function sendUpdate(msg) {
  if (win && !win.isDestroyed()) win.webContents.send("update", msg);
}

function isNewer(remote, current) {
  const a = String(remote).split(".").map(Number);
  const b = String(current).split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((a[i] || 0) > (b[i] || 0)) return true;
    if ((a[i] || 0) < (b[i] || 0)) return false;
  }
  return false;
}

// Проверка обновлений лаунчера при запуске.
function setupUpdater() {
  if (process.platform === "darwin") return setupMacUpdater();
  // Windows/Linux: полный авто-апдейт внутри лаунчера.
  autoUpdater.autoDownload = true;
  autoUpdater.on("update-available", (info) => sendUpdate({ kind: "downloading", version: info.version }));
  autoUpdater.on("download-progress", (p) => sendUpdate({ kind: "progress", percent: Math.round(p.percent) }));
  autoUpdater.on("update-downloaded", (info) => sendUpdate({ kind: "ready", version: info.version }));
  autoUpdater.on("error", () => {});
  autoUpdater.checkForUpdates().catch(() => {});
}

// macOS: своя проверка версии (Squirrel без подписи не работает), докачка внутри лаунчера.
async function setupMacUpdater() {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json" }
    });
    if (!res.ok) return;
    const rel = await res.json();
    const remote = String(rel.tag_name || "").replace(/^v/, "");
    if (!remote || !isNewer(remote, app.getVersion())) return;
    macUpdate = { version: remote };
    sendUpdate({ kind: "available-mac", version: remote });
  } catch { /* нет сети — тихо */ }
}

app.whenReady().then(() => {
  createWindow();
  win.webContents.once("did-finish-load", () => {
    setTimeout(setupUpdater, 1500); // дать рендереру подписаться
  });
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Применить обновление (Win/Linux): перезапуск с установкой.
ipcMain.handle("install-update", () => {
  autoUpdater.quitAndInstall();
});

// macOS: скачать новый билд внутри лаунчера и открыть (без карантина → без «damaged»).
ipcMain.handle("download-update", async () => {
  const url = `https://github.com/${REPO}/releases/latest/download/GondurasMC.dmg`;
  const dest = path.join(app.getPath("temp"), "GondurasMC-update.dmg");
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const total = Number(res.headers.get("content-length")) || 0;
  let recv = 0;
  const chunks = [];
  await new Promise((resolve, reject) => {
    res.body.on("data", (c) => {
      recv += c.length;
      chunks.push(c);
      if (total) sendUpdate({ kind: "progress", percent: Math.round((recv / total) * 100) });
    });
    res.body.on("end", resolve);
    res.body.on("error", reject);
  });
  fs.writeFileSync(dest, Buffer.concat(chunks));
  await shell.openPath(dest); // монтирует .dmg — игроку остаётся перетащить в Applications
  sendUpdate({ kind: "downloaded-mac", version: macUpdate ? macUpdate.version : "" });
  return { ok: true };
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

function profileOf(a) {
  return a ? { name: a.name, uuid: a.uuid } : null;
}

// ── IPC ──────────────────────────────────────────────────────
ipcMain.handle("get-config", () => ({
  serverName: cfg.serverName,
  websiteUrl: cfg.websiteUrl,
  serverHost: cfg.serverHost,
  serverPort: cfg.serverPort,
  version: cfg.minecraft.version,
  loader: `${cfg.minecraft.loader} ${cfg.minecraft.loaderVersion}`,
  skinHost: cfg.authBase.replace(/\/authlib-injector$/, ""),
  current: profileOf(loadSession()),
  settings: {
    maxRam: maxRam(),
    minRam: cfg.memory.min,
    gameDir: gameDir(),
    totalRamMb: Math.floor(os.totalmem() / (1024 * 1024))
  }
}));

ipcMain.handle("open-website", () => shell.openExternal(cfg.websiteUrl));

ipcMain.handle("ping-server", () => pingServer(cfg.serverHost, cfg.serverPort));

// Настройки RAM
ipcMain.handle("set-ram", (_e, mb) => {
  const s = loadSettings();
  s.maxRam = Math.max(2048, Math.min(Number(mb) || cfg.memory.max, Math.floor(os.totalmem() / (1024 * 1024)) - 1024));
  saveSettings(s);
  return s.maxRam;
});

// Папка игры: открыть / выбрать другую
ipcMain.handle("open-folder", () => shell.openPath(gameDir()));
ipcMain.handle("choose-folder", async () => {
  const res = await dialog.showOpenDialog(win, {
    title: "Папка для файлов игры",
    properties: ["openDirectory", "createDirectory"]
  });
  if (res.canceled || !res.filePaths[0]) return { canceled: true };
  const s = loadSettings();
  s.gameDir = res.filePaths[0];
  saveSettings(s);
  return { gameDir: s.gameDir };
});

// 3D-скин игрока: тянем текстуру через drasl и отдаём data-URL (без CORS в WebGL).
ipcMain.handle("get-skin-image", async () => {
  const a = loadSession();
  if (!a) return null;
  const base = cfg.authBase.replace(/\/authlib-injector$/, "");
  const uuid = String(a.uuid).replace(/-/g, "");
  try {
    const res = await fetch(`${base}/session/session/minecraft/profile/${uuid}`);
    if (!res.ok) return { dataUrl: null };
    const prof = await res.json();
    const tex = (prof.properties || []).find((p) => p.name === "textures");
    if (!tex) return { dataUrl: null };
    const decoded = JSON.parse(Buffer.from(tex.value, "base64").toString("utf8"));
    const skin = decoded.textures && decoded.textures.SKIN;
    if (!skin || !skin.url) return { dataUrl: null };
    const slim = !!(skin.metadata && skin.metadata.model === "slim");
    const img = await fetch(skin.url);
    if (!img.ok) return { dataUrl: null };
    const buf = Buffer.from(await img.arrayBuffer());
    return { dataUrl: `data:image/png;base64,${buf.toString("base64")}`, slim };
  } catch {
    return { dataUrl: null };
  }
});

ipcMain.handle("login", async (_e, { username, password }) => {
  const a = await auth.login(cfg.authBase, username, password);
  saveSession(a);
  return profileOf(a);
});

ipcMain.handle("logout", () => { clearSession(); return true; });

ipcMain.handle("play", async (event) => {
  const send = (msg) => event.sender.send("status", msg);
  let a = loadSession();
  if (!a) throw new Error("Сначала войди в аккаунт.");

  // Обновить токен при необходимости.
  try {
    if (!(await auth.validate(cfg.authBase, a.access_token))) {
      a = await auth.refresh(cfg.authBase, a.access_token);
      saveSession(a);
    }
  } catch {
    clearSession();
    throw new Error("Сессия истекла, войди заново.");
  }

  const dir = gameDir();
  const javaDir = path.join(dataRoot(), "java");

  send({ stage: "java", text: "Проверяю Java..." });
  const javaBin = await resolveJava(cfg.javaPath, javaDir, send);
  send({ stage: "java", text: `Java: ${path.basename(path.dirname(javaBin))}` });

  send({ stage: "neoforge", text: "Проверяю NeoForge..." });
  const neoforgeId = await ensureNeoForge(javaBin, dir, cfg.minecraft.loaderVersion, send);

  send({ stage: "libraries", text: "Проверяю библиотеки..." });
  await ensureLibraries(dir, neoforgeId, cfg.minecraft.version, send);

  send({ stage: "assets", text: "Проверяю ассеты..." });
  await ensureAssets(dir, cfg.minecraft.version, send);

  // Обновление сборки: сверяем версию с сайтом, при отличии — качаем новый .mrpack.
  send({ stage: "modpack", text: "Проверяю версию сборки..." });
  const remote = await remoteModpack();
  const installed = loadInstalled();
  const need = !installed || (remote && remote.version && remote.version !== installed.modpackVersion);
  let mrpath = modpackPath();
  if (need && remote && remote.url) {
    send({ stage: "modpack", text: `Скачиваю сборку ${remote.version}...` });
    mrpath = path.join(dataRoot(), `modpack-${remote.version}.mrpack`);
    await downloadFile(remote.url, mrpath);
  }
  if (need) {
    send({ stage: "modpack", text: "Устанавливаю сборку..." });
    const info = await installModpack(mrpath, dir, send, {
      excludeMods: cfg.excludeMods,
      extraMods: cfg.extraMods
    });
    saveInstalled({ modpackVersion: remote ? remote.version : "bundled", ...info });
  } else {
    // Версия не менялась — лёгкая синхронизация модов (докачать недостающие из сборки,
    // напр. после смены версии мода в config), без перезаписи конфигов игрока.
    send({ stage: "modpack", text: "Синхронизирую моды..." });
    await installModpack(mrpath, dir, send, {
      excludeMods: cfg.excludeMods,
      extraMods: cfg.extraMods,
      skipOverrides: true
    });
  }
  await enforceMods(dir, { excludeMods: cfg.excludeMods, extraMods: cfg.extraMods }, send);

  // Сервер всегда в списке «Сетевая игра».
  writeServersDat(dir, [{ name: cfg.serverName, ip: `${cfg.serverHost}:${cfg.serverPort}`, acceptTextures: 1 }]);

  // Windows: отключаем NeoForge early display (fancy loading screen), потому что он
  // падает при загрузке LWJGL через SecureJarHandler в кастомном лаунчере.
  // earlyWindowControl=false — официальный фикс NeoForge (neoforged.net/meta/displayerrors/).
  if (process.platform === "win32") {
    const cfgDir = path.join(dir, "config");
    const fmlToml = path.join(cfgDir, "fml.toml");
    fs.mkdirSync(cfgDir, { recursive: true });
    if (fs.existsSync(fmlToml)) {
      let txt = fs.readFileSync(fmlToml, "utf8");
      if (/earlyWindowControl\s*=\s*true/.test(txt)) {
        txt = txt.replace(/earlyWindowControl\s*=\s*true/, "earlyWindowControl = false");
        fs.writeFileSync(fmlToml, txt);
      } else if (!/earlyWindowControl/.test(txt)) {
        fs.appendFileSync(fmlToml, "\nearlyWindowControl = false\n");
      }
    } else {
      fs.writeFileSync(fmlToml, "[client]\n\tearlyWindowControl = false\n");
    }
  }

  const runCfg = { ...cfg, memory: { min: cfg.memory.min, max: maxRam() } };
  send({ stage: "launch", text: `Запускаю игру под ником ${a.name} (${maxRam()} МБ)...` });

  // Лог-файл — пишем stderr/stdout Java, чтобы диагностировать «код 1» на Windows.
  const logPath = path.join(dataRoot(), "launcher.log");
  const logStream = fs.createWriteStream(logPath, { flags: "w" });
  const writeLog = (text) => { try { logStream.write(text); } catch {} };

  await launchGame({
    cfg: runCfg,
    gameDir: dir,
    auth: a,
    neoforgeId,
    javaBin,
    onEvent: (ev) => {
      if (ev.type === "started") {
        send({ stage: "started", text: "Игра запущена! Загрузка модов (~30 сек)..." });
      } else if (ev.type === "close") {
        logStream.end();
        if (ev.code !== 0) {
          // Показываем путь к логу при ошибке.
          send({ stage: "closed", text: `Игра завершилась с кодом ${ev.code}. Лог: ${logPath}` });
        } else {
          send({ stage: "closed", text: `Игра закрыта (код ${ev.code})` });
        }
      } else if (ev.type === "debug") {
        writeLog(ev.text + "\n");
        send({ stage: "debug", text: ev.text });
      } else if (ev.type === "data") {
        writeLog(ev.text);
      }
    }
  });
  return true;
});
