// Установка NeoForge через официальный установщик в headless-режиме.
// Создаёт versions/neoforge-<ver>/ с профилем, который потом запускает MCLC.
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const fetch = require("node-fetch");

function versionId(loaderVersion) {
  return `neoforge-${loaderVersion}`;
}

function installerUrl(loaderVersion) {
  return (
    "https://maven.neoforged.net/releases/net/neoforged/neoforge/" +
    `${loaderVersion}/neoforge-${loaderVersion}-installer.jar`
  );
}

function isInstalled(gameDir, loaderVersion) {
  const id = versionId(loaderVersion);
  return fs.existsSync(path.join(gameDir, "versions", id, `${id}.json`));
}

async function downloadInstaller(loaderVersion, dest) {
  const res = await fetch(installerUrl(loaderVersion), { redirect: "follow" });
  if (!res.ok) throw new Error(`Не скачать установщик NeoForge (HTTP ${res.status})`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  await new Promise((resolve, reject) => {
    const out = fs.createWriteStream(dest);
    res.body.pipe(out);
    res.body.on("error", reject);
    out.on("finish", resolve);
  });
}

function runInstaller(javaPath, installerJar, gameDir) {
  return new Promise((resolve, reject) => {
    const args = ["-jar", installerJar, "--install-client", gameDir];
    const child = spawn(javaPath, args, { cwd: gameDir });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(out);
      else reject(new Error(`Установщик NeoForge завершился с кодом ${code}\n${out.slice(-1500)}`));
    });
  });
}

// Установщик требует наличия launcher_profiles.json в gameDir.
function ensureLauncherProfiles(gameDir) {
  const f = path.join(gameDir, "launcher_profiles.json");
  if (!fs.existsSync(f)) {
    fs.mkdirSync(gameDir, { recursive: true });
    fs.writeFileSync(
      f,
      JSON.stringify({ profiles: {}, settings: {}, version: 3 }, null, 2)
    );
  }
}

async function ensureNeoForge(javaPath, gameDir, loaderVersion, report) {
  const log = (text) => report && report({ stage: "neoforge", text });
  if (isInstalled(gameDir, loaderVersion)) {
    log(`NeoForge ${loaderVersion} уже установлен.`);
    return versionId(loaderVersion);
  }
  fs.mkdirSync(gameDir, { recursive: true });
  ensureLauncherProfiles(gameDir);

  const installerJar = path.join(gameDir, `neoforge-${loaderVersion}-installer.jar`);
  log(`Скачиваю установщик NeoForge ${loaderVersion}...`);
  await downloadInstaller(loaderVersion, installerJar);

  log("Устанавливаю NeoForge (это может занять минуту)...");
  await runInstaller(javaPath, installerJar, gameDir);

  if (!isInstalled(gameDir, loaderVersion)) {
    throw new Error("Установщик отработал, но профиль NeoForge не найден.");
  }
  try { fs.unlinkSync(installerJar); } catch (_) {}
  log("NeoForge установлен.");
  return versionId(loaderVersion);
}

module.exports = { ensureNeoForge, versionId, isInstalled };
