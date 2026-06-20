// Ad-hoc подпись macOS-приложения (без Apple Developer).
// Без неё на Apple Silicon неподписанный .app считается «повреждённым».
// Ad-hoc подпись делает .app запускаемым (Gatekeeper всё ещё попросит
// «Открыть» через правый клик при первом запуске — это норма без нотаризации).
const path = require("path");
const { execFileSync } = require("child_process");

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== "darwin") return;
  const app = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`
  );
  console.log("[afterPack] ad-hoc signing", app);
  execFileSync("codesign", ["--force", "--deep", "--sign", "-", app], {
    stdio: "inherit"
  });
};
