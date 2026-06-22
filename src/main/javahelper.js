// Надёжный поиск исполняемого java. GUI-приложение на macOS (запуск из Finder)
// часто НЕ наследует PATH из терминала, поэтому простой spawn("java") падает.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

function resolveJava(configured) {
  if (configured && fs.existsSync(configured)) return configured;
  const exe = process.platform === "win32" ? "java.exe" : "java";

  if (process.env.JAVA_HOME) {
    const j = path.join(process.env.JAVA_HOME, "bin", exe);
    if (fs.existsSync(j)) return j;
  }
  if (process.platform === "darwin") {
    try {
      const home = execFileSync("/usr/libexec/java_home", [], { encoding: "utf8" }).trim();
      const j = path.join(home, "bin", "java");
      if (fs.existsSync(j)) return j;
    } catch (_) {}
    for (const c of ["/opt/homebrew/bin/java", "/usr/local/bin/java", "/usr/bin/java"]) {
      if (fs.existsSync(c)) return c;
    }
  }
  if (process.platform === "linux") {
    for (const c of ["/usr/bin/java", "/usr/local/bin/java"]) if (fs.existsSync(c)) return c;
  }
  return "java"; // последний шанс — полагаемся на PATH
}

module.exports = { resolveJava };
