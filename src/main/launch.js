// Запуск Minecraft + NeoForge.
// MCLC не умеет правильно собирать модульный запуск NeoForge (теряет -p,
// --add-opens, --add-modules), поэтому команду java строим сами из version-json.
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

function osName() {
  if (process.platform === "win32") return "windows";
  if (process.platform === "darwin") return "osx";
  return "linux";
}

// Путь к authlib-injector.jar. В собранном .app он лежит в Resources/vendor/
// (extraResources сохраняет относительный путь "vendor/..."), в dev — в vendor/.
function authlibInjectorPath() {
  const candidates = [];
  if (process.resourcesPath) {
    candidates.push(path.join(process.resourcesPath, "vendor", "authlib-injector.jar"));
    candidates.push(path.join(process.resourcesPath, "authlib-injector.jar"));
  }
  candidates.push(path.join(__dirname, "..", "..", "vendor", "authlib-injector.jar"));
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return candidates[0];
}

// Проверка rules (os/arch) у аргументов и библиотек.
function rulesAllow(rules) {
  if (!rules) return true;
  let allowed = false;
  for (const r of rules) {
    let match = true;
    // features (demo, кастомное разрешение, quickPlay) не включаем.
    if (r.features) match = false;
    if (r.os) {
      if (r.os.name && r.os.name !== osName()) match = false;
      if (r.os.arch && r.os.arch !== process.arch && !(r.os.arch === "x86" && process.arch === "ia32")) match = false;
    }
    if (match) allowed = r.action === "allow";
  }
  return allowed;
}

// maven name "g:a:v[:classifier]" -> относительный путь к jar.
function mavenToPath(name) {
  const [coords, ...rest] = name.split("@"); // отбросить расширение @jar
  const parts = coords.split(":");
  const [group, artifact, version] = parts;
  const classifier = parts[3];
  const file = `${artifact}-${version}${classifier ? "-" + classifier : ""}.jar`;
  return path.join(...group.split("."), artifact, version, file);
}

function mavenKey(name) {
  const parts = name.split("@")[0].split(":");
  return `${parts[0]}:${parts[1]}${parts[3] ? ":" + parts[3] : ""}`;
}

function libPath(libDir, lib) {
  if (lib.downloads && lib.downloads.artifact && lib.downloads.artifact.path) {
    return path.join(libDir, lib.downloads.artifact.path);
  }
  return path.join(libDir, mavenToPath(lib.name));
}

// Собрать список библиотек из json (с учётом rules), neoforge переопределяет ваниль.
function collectLibraries(libDir, vanilla, neoforge) {
  const map = new Map();
  const add = (libs) => {
    for (const lib of libs || []) {
      if (!rulesAllow(lib.rules)) continue;
      if (!lib.name) continue;
      map.set(mavenKey(lib.name), libPath(libDir, lib));
    }
  };
  add(vanilla.libraries);
  add(neoforge.libraries); // переопределяет совпадающие
  return [...map.values()];
}

// Развернуть аргумент(ы) с rules и подстановкой плейсхолдеров.
function expandArgs(args, vars) {
  const out = [];
  const sub = (s) =>
    s.replace(/\$\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `\${${k}}`));
  for (const a of args || []) {
    if (typeof a === "string") {
      out.push(sub(a));
    } else if (a && a.value && rulesAllow(a.rules)) {
      const vals = Array.isArray(a.value) ? a.value : [a.value];
      for (const v of vals) out.push(sub(v));
    }
  }
  return out;
}

async function launchGame({ cfg, gameDir, auth, neoforgeId, javaBin, onEvent }) {
  const libDir = path.join(gameDir, "libraries");
  const vanillaVer = cfg.minecraft.version; // 1.21.1
  const vanilla = JSON.parse(
    fs.readFileSync(path.join(gameDir, "versions", vanillaVer, `${vanillaVer}.json`), "utf8")
  );
  const neoforge = JSON.parse(
    fs.readFileSync(path.join(gameDir, "versions", neoforgeId, `${neoforgeId}.json`), "utf8")
  );

  const sep = process.platform === "win32" ? ";" : ":";
  const nativesDir = path.join(gameDir, "natives");
  fs.mkdirSync(nativesDir, { recursive: true });

  // Индекс ассетов должен лежать под именем assetIndex.id (напр. 17.json).
  // Установщик/MCLC иногда сохраняет его под именем версии — копируем при необходимости.
  const assetId = vanilla.assetIndex.id;
  const indexesDir = path.join(gameDir, "assets", "indexes");
  const wantIndex = path.join(indexesDir, `${assetId}.json`);
  if (!fs.existsSync(wantIndex) && fs.existsSync(indexesDir)) {
    const existing = fs.readdirSync(indexesDir).find((f) => f.endsWith(".json"));
    if (existing) fs.copyFileSync(path.join(indexesDir, existing), wantIndex);
  }

  // Клиентский jar (ванильный) — он один на classpath, остальное игнорит securejarhandler.
  const clientJar = path.join(gameDir, "versions", vanillaVer, `${vanillaVer}.jar`);

  const vars = {
    library_directory: libDir,
    classpath_separator: sep,
    version_name: vanillaVer,
    natives_directory: nativesDir,
    game_directory: gameDir,
    assets_root: path.join(gameDir, "assets"),
    assets_index_name: vanilla.assetIndex.id,
    auth_player_name: auth.name,
    auth_uuid: auth.uuid,
    auth_access_token: auth.access_token,
    clientid: "0",
    auth_xuid: "0",
    user_type: "msa",
    version_type: "release",
    launcher_name: "GondurasMC",
    launcher_version: "1.0"
  };

  // Модульный путь NeoForge (из его jvm-аргументов).
  // ВАЖНО: jары с module path кладём ТАКЖЕ в classpath — так делает Prism Launcher.
  // Это позволяет ModuleClassLoader делегировать загрузку классов через app class loader,
  // который видит весь classpath включая LWJGL. Без этого earlydisplay падает на Windows.
  const jvmNeo = expandArgs(neoforge.arguments.jvm, vars);

  // Classpath = ВСЕ библиотеки + клиентский jar (включая те что на module path).
  const allLibs = collectLibraries(libDir, vanilla, neoforge);
  const classpath = [...allLibs, clientJar].join(sep);
  vars.classpath = classpath;

  // Сборка финальной команды.
  const jvmVanilla = expandArgs(vanilla.arguments.jvm, vars);
  const memory = [`-Xmx${cfg.memory.max}M`, `-Xms${cfg.memory.min}M`];
  const gameArgs = [
    ...expandArgs(vanilla.arguments.game, vars),
    ...expandArgs(neoforge.arguments.game, vars)
  ];

  // authlib-injector: подключает аккаунты/скины drasl (вход и сессии).
  const authAgent =
    cfg.authMode === "drasl" && cfg.authBase
      ? [`-javaagent:${authlibInjectorPath()}=${cfg.authBase}`]
      : [];

  const args = [
    ...memory,
    ...authAgent,
    ...jvmVanilla, // содержит -cp ${classpath}, -Djava.library.path и пр.
    ...jvmNeo, // содержит -p, --add-opens, --add-modules, --add-exports
    neoforge.mainClass,
    ...gameArgs
  ];

  onEvent && onEvent({ type: "debug", text: `Java bin: ${javaBin}\nArgs: ${args.join(" ")}` });

  return new Promise((resolve, reject) => {
    const child = spawn(javaBin, args, { cwd: gameDir });
    onEvent && onEvent({ type: "started" });
    child.stdout.on("data", (d) => onEvent && onEvent({ type: "data", text: String(d) }));
    child.stderr.on("data", (d) => onEvent && onEvent({ type: "data", text: String(d) }));
    child.on("error", (err) => {
      onEvent && onEvent({ type: "data", text: `Spawn error: ${err.message}\n` });
      reject(err);
    });
    child.on("close", (code) => {
      onEvent && onEvent({ type: "close", code });
      resolve(code);
    });
  });
}

module.exports = { launchGame };
