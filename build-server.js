// Сборка серверной части из GondurasMC.mrpack — набор модов, совпадающий с клиентом.
// Запуск: node build-server.js
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");
const fetch = require("node-fetch");
const AdmZip = require("adm-zip");
const cfg = require("./config");

const OUT = path.join(__dirname, "server");
const MRPACK = path.join(__dirname, cfg.modpackFile);

function sha1File(f) {
  if (!fs.existsSync(f)) return null;
  return crypto.createHash("sha1").update(fs.readFileSync(f)).digest("hex");
}

async function download(url, dest) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
}

function copyRec(src, dst) {
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const n of fs.readdirSync(src)) copyRec(path.join(src, n), path.join(dst, n));
  } else {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
  }
}

function runJava(args, cwd) {
  return new Promise((resolve, reject) => {
    const p = spawn(cfg.javaPath || "java", args, { cwd });
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (out += d));
    p.on("error", reject);
    p.on("close", (c) => (c === 0 ? resolve(out) : reject(new Error(out.slice(-1500)))));
  });
}

(async () => {
  const lv = cfg.minecraft.loaderVersion;
  fs.mkdirSync(path.join(OUT, "mods"), { recursive: true });

  console.log("Читаю модпак...");
  const zip = new AdmZip(MRPACK);
  const index = JSON.parse(zip.readAsText(zip.getEntry("modrinth.index.json")));

  // 1. Серверные моды (env.server !== unsupported), кроме исключённых.
  const exclude = (cfg.excludeMods || []).map((s) => s.toLowerCase());
  const isExcluded = (n) => exclude.some((e) => n.toLowerCase().includes(e));
  const files = index.files.filter(
    (f) =>
      (!f.env || f.env.server !== "unsupported") &&
      !isExcluded(path.basename(f.path))
  );
  let i = 0;
  for (const f of files) {
    i++;
    const dest = path.join(OUT, f.path); // обычно mods/...
    if (f.hashes && f.hashes.sha1 && sha1File(dest) === f.hashes.sha1) {
      console.log(`  [${i}/${files.length}] есть: ${path.basename(f.path)}`);
      continue;
    }
    console.log(`  [${i}/${files.length}] качаю: ${path.basename(f.path)}`);
    await download(f.downloads[0], dest);
  }

  // 2. overrides: config — на сервер; mods (общие jar) — тоже; client-overrides — пропускаем.
  const tmp = path.join(OUT, ".extract");
  fs.rmSync(tmp, { recursive: true, force: true });
  zip.extractAllTo(tmp, true);
  const ovr = path.join(tmp, "overrides");
  if (fs.existsSync(path.join(ovr, "config"))) {
    console.log("Копирую config/...");
    copyRec(path.join(ovr, "config"), path.join(OUT, "config"));
  }
  if (fs.existsSync(path.join(ovr, "mods"))) {
    for (const jar of fs.readdirSync(path.join(ovr, "mods"))) {
      if (isExcluded(jar)) continue;
      fs.copyFileSync(path.join(ovr, "mods", jar), path.join(OUT, "mods", jar));
      console.log("  общий мод из overrides:", jar);
    }
  }
  fs.rmSync(tmp, { recursive: true, force: true });

  // 3. Установка серверного NeoForge.
  const installer = path.join(OUT, `neoforge-${lv}-installer.jar`);
  if (!fs.existsSync(path.join(OUT, "libraries", "net", "neoforged", "neoforge"))) {
    console.log("Скачиваю установщик NeoForge...");
    await download(
      `https://maven.neoforged.net/releases/net/neoforged/neoforge/${lv}/neoforge-${lv}-installer.jar`,
      installer
    );
    console.log("Устанавливаю серверный NeoForge (минуту)...");
    await runJava(["-jar", installer, "--install-server"], OUT);
    try { fs.unlinkSync(installer); } catch (_) {}
  }

  // 4. authlib-injector на сервер — проверка входа игроков через drasl.
  const injector = path.join(OUT, "authlib-injector.jar");
  if (!fs.existsSync(injector)) {
    console.log("Скачиваю authlib-injector...");
    await download(
      "https://github.com/yushijinhun/authlib-injector/releases/download/v1.2.5/authlib-injector-1.2.5.jar",
      injector
    );
  }
  // authBase без хвоста /authlib-injector — агент сам добавляет подпути.
  const authBase = (cfg.authBase || "").replace(/\/authlib-injector$/, "");

  // 5. EULA + server.properties (ONLINE-MODE: только зарегистрированные в drasl).
  fs.writeFileSync(path.join(OUT, "eula.txt"), "eula=true\n");
  const propsPath = path.join(OUT, "server.properties");
  if (!fs.existsSync(propsPath)) {
    fs.writeFileSync(
      propsPath,
      [
        "online-mode=true", // проверка через drasl (authlib-injector)
        "enforce-secure-profile=true",
        "motd=GondurasMC",
        `server-port=${cfg.serverPort}`,
        "max-players=20",
        "view-distance=10",
        ""
      ].join("\n")
    );
  }

  // 6. JVM-аргументы NeoForge (user_jvm_args.txt): память + javaagent authlib-injector.
  const jvmArgsPath = path.join(OUT, "user_jvm_args.txt");
  fs.writeFileSync(
    jvmArgsPath,
    [
      `-Xms${cfg.memory.min}M`,
      `-Xmx${cfg.memory.max}M`,
      `-javaagent:authlib-injector.jar=${authBase}`,
      ""
    ].join("\n")
  );

  // 7. Простой скрипт запуска (NeoForge кладёт run.sh/run.bat сам, но подстрахуемся).
  const unixArgs = "libraries/net/neoforged/neoforge/" + lv + "/unix_args.txt";
  const winArgs = "libraries\\net\\neoforged\\neoforge\\" + lv + "\\win_args.txt";
  fs.writeFileSync(
    path.join(OUT, "start.sh"),
    `#!/bin/sh\ncd "$(dirname "$0")"\njava @user_jvm_args.txt @${unixArgs} nogui\n`
  );
  fs.chmodSync(path.join(OUT, "start.sh"), 0o755);
  fs.writeFileSync(
    path.join(OUT, "start.bat"),
    `@echo off\r\ncd /d "%~dp0"\r\njava @user_jvm_args.txt @${winArgs} nogui\r\n`
  );

  console.log("\n✅ Готово. Папка server/ собрана.");
  console.log("   online-mode=true, authlib-injector → " + authBase);
  console.log("Запуск сервера:");
  console.log("  cd server && ./start.sh      (Linux/macOS)");
  console.log("  cd server && start.bat       (Windows)");
})().catch((e) => {
  console.error("ОШИБКА:", e.message);
  process.exit(1);
});
