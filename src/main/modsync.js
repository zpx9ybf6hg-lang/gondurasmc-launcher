// Синхронизация клиентских модов по манифесту.
// Манифест (JSON) на сервере:
// {
//   "mods": [
//     { "name": "sodium.jar", "url": "https://files.../sodium.jar", "sha1": "abc...", "size": 123 }
//   ]
// }
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const fetch = require("node-fetch");

function sha1File(file) {
  return new Promise((resolve) => {
    if (!fs.existsSync(file)) return resolve(null);
    const hash = crypto.createHash("sha1");
    const stream = fs.createReadStream(file);
    stream.on("data", (d) => hash.update(d));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", () => resolve(null));
  });
}

async function downloadTo(url, dest, onProgress) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Не удалось скачать ${url} (${res.status})`);
  await new Promise((resolve, reject) => {
    const out = fs.createWriteStream(dest);
    res.body.on("data", (chunk) => onProgress && onProgress(chunk.length));
    res.body.pipe(out);
    res.body.on("error", reject);
    out.on("finish", resolve);
  });
}

// gameDir — корень инстанса (.minecraft); моды кладём в gameDir/mods.
async function syncMods(manifestUrl, gameDir, report) {
  const modsDir = path.join(gameDir, "mods");
  fs.mkdirSync(modsDir, { recursive: true });

  report && report({ stage: "manifest", text: "Получаю список модов..." });
  const res = await fetch(manifestUrl);
  if (!res.ok) throw new Error(`Манифест недоступен (${res.status})`);
  const manifest = await res.json();
  const wanted = manifest.mods || [];

  // 1. Удаляем моды, которых нет в манифесте (чистая сборка у всех).
  const wantedNames = new Set(wanted.map((m) => m.name));
  for (const f of fs.readdirSync(modsDir)) {
    if (f.endsWith(".jar") && !wantedNames.has(f)) {
      fs.unlinkSync(path.join(modsDir, f));
      report && report({ stage: "clean", text: `Удалён лишний мод: ${f}` });
    }
  }

  // 2. Докачиваем недостающие/изменённые по sha1.
  let i = 0;
  for (const mod of wanted) {
    i++;
    const dest = path.join(modsDir, mod.name);
    const have = await sha1File(dest);
    if (mod.sha1 && have === mod.sha1) {
      report && report({ stage: "skip", text: `OK: ${mod.name}`, current: i, total: wanted.length });
      continue;
    }
    report && report({ stage: "download", text: `Качаю ${mod.name}...`, current: i, total: wanted.length });
    await downloadTo(mod.url, dest, () => {});
    if (mod.sha1) {
      const after = await sha1File(dest);
      if (after !== mod.sha1) throw new Error(`Хеш не совпал: ${mod.name}`);
    }
  }

  report && report({ stage: "done", text: "Моды синхронизированы." });
  return wanted.length;
}

module.exports = { syncMods };
