// Установка Modrinth-модпака (.mrpack) в папку инстанса.
//  - читает modrinth.index.json
//  - скачивает удалённые файлы (моды) по sha1
//  - копирует overrides/ (доп. моды, config, options.txt, servers.dat)
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const fetch = require("node-fetch");
const AdmZip = require("adm-zip");

function sha1File(file) {
  return new Promise((resolve) => {
    if (!fs.existsSync(file)) return resolve(null);
    const h = crypto.createHash("sha1");
    const s = fs.createReadStream(file);
    s.on("data", (d) => h.update(d));
    s.on("end", () => resolve(h.digest("hex")));
    s.on("error", () => resolve(null));
  });
}

async function download(url, dest) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status} для ${url}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  await new Promise((resolve, reject) => {
    const out = fs.createWriteStream(dest);
    res.body.pipe(out);
    res.body.on("error", reject);
    out.on("finish", resolve);
  });
}

function copyRecursive(src, dst) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const item of fs.readdirSync(src)) {
      copyRecursive(path.join(src, item), path.join(dst, item));
    }
  } else {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
  }
}

function isExcluded(filename, excludeMods) {
  const low = filename.toLowerCase();
  return (excludeMods || []).some((e) => low.includes(e.toLowerCase()));
}

// Удаляет исключённые моды и докачивает доп-моды. Лёгкая, запускается каждый раз.
async function enforceMods(gameDir, opts, report) {
  const log = (text, extra) => report && report({ stage: "modpack", text, ...extra });
  const modsDir = path.join(gameDir, "mods");
  fs.mkdirSync(modsDir, { recursive: true });

  // Удалить исключённые.
  for (const f of fs.readdirSync(modsDir)) {
    if (f.endsWith(".jar") && isExcluded(f, opts.excludeMods)) {
      fs.unlinkSync(path.join(modsDir, f));
      log(`Удалён мод: ${f}`);
    }
  }

  // Докачать доп-моды.
  for (const mod of opts.extraMods || []) {
    const dest = path.join(modsDir, mod.name);
    const have = await sha1File(dest);
    if (mod.sha1 && have === mod.sha1) continue;
    log(`Доп-мод: ${mod.name}`);
    await download(mod.url, dest);
    if (mod.sha1) {
      const after = await sha1File(dest);
      if (after !== mod.sha1) throw new Error(`sha1 не совпал: ${mod.name}`);
    }
  }
}

// mrpackPath — путь к .mrpack; gameDir — корень инстанса (.minecraft).
async function installModpack(mrpackPath, gameDir, report, opts = {}) {
  if (!fs.existsSync(mrpackPath)) {
    throw new Error(`Модпак не найден: ${mrpackPath}`);
  }
  const log = (text, extra) => report && report({ stage: "modpack", text, ...extra });

  log("Читаю модпак...");
  const zip = new AdmZip(mrpackPath);
  const indexEntry = zip.getEntry("modrinth.index.json");
  if (!indexEntry) throw new Error("В .mrpack нет modrinth.index.json");
  const index = JSON.parse(zip.readAsText(indexEntry));

  // 1. Удалённые файлы (моды и пр.), кроме исключённых.
  const files = (index.files || []).filter(
    (f) =>
      (!f.env || f.env.client !== "unsupported") &&
      !isExcluded(path.basename(f.path), opts.excludeMods)
  );
  let done = 0;
  for (const f of files) {
    done++;
    const dest = path.join(gameDir, f.path);
    const want = f.hashes && f.hashes.sha1;
    const have = await sha1File(dest);
    if (want && have === want) continue; // уже есть и совпадает
    log(`Качаю (${done}/${files.length}) ${path.basename(f.path)}`, {
      current: done,
      total: files.length
    });
    await download(f.downloads[0], dest);
    if (want) {
      const after = await sha1File(dest);
      if (after !== want) throw new Error(`sha1 не совпал: ${f.path}`);
    }
  }

  // 2. overrides/ и client-overrides/ поверх инстанса.
  // Пропускаем при простой синхронизации модов (skipOverrides), чтобы не затирать
  // конфиги/настройки игрока при каждом запуске.
  if (opts.skipOverrides) {
    log("Моды синхронизированы.");
    return {
      name: index.name,
      version: index.versionId,
      mods: files.length,
      dependencies: index.dependencies
    };
  }
  const tmp = path.join(gameDir, ".mrpack_extract");
  fs.rmSync(tmp, { recursive: true, force: true });
  zip.extractAllTo(tmp, true);
  for (const dir of ["overrides", "client-overrides"]) {
    const src = path.join(tmp, dir);
    if (fs.existsSync(src)) {
      log(`Применяю ${dir}...`);
      copyRecursive(src, gameDir);
    }
  }
  fs.rmSync(tmp, { recursive: true, force: true });

  log("Модпак установлен.");
  return {
    name: index.name,
    version: index.versionId,
    mods: files.length,
    dependencies: index.dependencies
  };
}

module.exports = { installModpack, enforceMods };
