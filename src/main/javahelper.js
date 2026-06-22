// Поиск и автоматическая загрузка Java 21 (Adoptium/Temurin).
// GUI-приложение на macOS не наследует PATH из терминала, на Windows Java часто
// вообще не установлена — поэтому качаем свою JRE в dataRoot/java/.
const fs = require("fs");
const path = require("path");
const { execFileSync, spawn } = require("child_process");
const fetch = require("node-fetch");

const JAVA_MAJOR = 21;

function adoptiumMeta() {
  const p = process.platform;
  const a = process.arch;
  return {
    os:   p === "win32"  ? "windows" : p === "darwin" ? "mac" : "linux",
    arch: a === "arm64"  ? "aarch64" : "x64",
    ext:  p === "win32"  ? "zip" : "tar.gz"
  };
}

// Найти java-бинарник внутри скачанной JRE (структура Adoptium: jre-21.*.*+*/bin/java).
function findJavaInDir(dir) {
  if (!fs.existsSync(dir)) return null;
  const exe = process.platform === "win32" ? "java.exe" : "java";
  for (const entry of fs.readdirSync(dir)) {
    const candidate = path.join(dir, entry, "bin", exe);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

// Распаковать архив без внешних npm-зависимостей.
function extractArchive(archivePath, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  if (process.platform === "win32") {
    execFileSync("powershell", [
      "-NoProfile", "-NonInteractive", "-Command",
      `Expand-Archive -LiteralPath '${archivePath}' -DestinationPath '${destDir}' -Force`
    ], { timeout: 120000 });
  } else {
    execFileSync("tar", ["-xzf", archivePath, "-C", destDir], { timeout: 120000 });
  }
}

// Скачать файл с прогрессом.
async function downloadFile(url, dest, onProgress) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} при загрузке Java`);
  const total = parseInt(res.headers.get("content-length") || "0", 10);
  let received = 0;
  const out = fs.createWriteStream(dest);
  await new Promise((resolve, reject) => {
    res.body.on("data", (chunk) => {
      received += chunk.length;
      if (total && onProgress) onProgress(received, total);
    });
    res.body.pipe(out);
    res.body.on("error", reject);
    out.on("finish", resolve);
    out.on("error", reject);
  });
}

// Скачать и распаковать JRE 21 в javaDir. Возвращает путь к java-бинарнику.
async function downloadJava(javaDir, report) {
  const log = (t) => report && report({ stage: "java", text: t });
  const { os, arch, ext } = adoptiumMeta();
  const apiUrl =
    `https://api.adoptium.net/v3/assets/latest/${JAVA_MAJOR}/hotspot` +
    `?image_type=jre&os=${os}&architecture=${arch}&jvm_impl=hotspot&vendor=eclipse`;

  log("Получаю информацию о Java 21...");
  const res = await fetch(apiUrl);
  if (!res.ok) throw new Error(`Adoptium API: HTTP ${res.status}`);
  const releases = await res.json();
  if (!releases || !releases.length) throw new Error("Adoptium: нет подходящего релиза Java 21");

  const binary = releases[0].binary;
  const pkg = binary.package;
  const archiveName = pkg.name;
  const archiveUrl = pkg.link;

  const archivePath = path.join(javaDir, archiveName);
  if (!fs.existsSync(archivePath)) {
    log(`Скачиваю Java 21 (~${Math.round((pkg.size || 50000000) / 1048576)} МБ)...`);
    fs.mkdirSync(javaDir, { recursive: true });
    await downloadFile(archiveUrl, archivePath, (recv, total) => {
      const pct = Math.round(recv / total * 100);
      log(`Скачиваю Java 21... ${pct}%`);
    });
  }

  log("Распаковываю Java 21...");
  extractArchive(archivePath, javaDir);

  const javaBin = findJavaInDir(javaDir);
  if (!javaBin) throw new Error("Не удалось найти java после распаковки");

  // Удаляем архив — он больше не нужен.
  try { fs.unlinkSync(archivePath); } catch {}
  log(`Java 21 готова: ${javaBin}`);
  return javaBin;
}

// Основная функция: вернуть путь к java (из конфига / системы / скачанной).
// Если Java нет нигде — вызвать downloadJava и вернуть её путь.
async function resolveJava(configured, javaDir, report) {
  // 1. Явно указанный путь.
  if (configured && fs.existsSync(configured)) return configured;

  // 2. Ранее скачанная нами JRE.
  const bundled = findJavaInDir(javaDir);
  if (bundled) return bundled;

  const exe = process.platform === "win32" ? "java.exe" : "java";

  // 3. JAVA_HOME.
  if (process.env.JAVA_HOME) {
    const j = path.join(process.env.JAVA_HOME, "bin", exe);
    if (fs.existsSync(j)) return j;
  }

  // 4. Стандартные пути macOS.
  if (process.platform === "darwin") {
    try {
      const home = execFileSync("/usr/libexec/java_home", ["-v", "21"], { encoding: "utf8" }).trim();
      const j = path.join(home, "bin", "java");
      if (fs.existsSync(j)) return j;
    } catch {}
    for (const c of ["/opt/homebrew/bin/java", "/usr/local/bin/java", "/usr/bin/java"]) {
      if (fs.existsSync(c)) return c;
    }
  }

  // 5. Стандартные пути Linux.
  if (process.platform === "linux") {
    for (const c of ["/usr/bin/java", "/usr/local/bin/java"]) {
      if (fs.existsSync(c)) return c;
    }
  }

  // 6. Системный PATH (последний шанс без скачивания).
  try {
    execFileSync(exe, ["-version"], { stdio: "ignore" });
    return exe;
  } catch {}

  // 7. Ничего не нашли — скачиваем.
  return await downloadJava(javaDir, report);
}

module.exports = { resolveJava, downloadJava };
