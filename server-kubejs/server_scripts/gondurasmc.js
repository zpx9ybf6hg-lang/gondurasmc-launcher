// GondurasMC ↔ сайт: команда /claim (выдача донат-инвентаря) + учёт времени игры.
// Кладётся в kubejs/server_scripts/ на сервере (NeoForge 1.21.1, KubeJS 6).
//
// НАСТРОЙ ЭТИ ДВЕ СТРОКИ:
const WEB = "https://gondurasmc-web.fly.dev";
const KEY = "PASTE_SERVER_KEY_HERE"; // тот же SERVER_KEY, что задан на сайте (fly secrets)

// ── Java-классы для HTTP (KubeJS) ──
const URL = Java.loadClass("java.net.URL");
const BufferedReader = Java.loadClass("java.io.BufferedReader");
const InputStreamReader = Java.loadClass("java.io.InputStreamReader");
const OutputStreamWriter = Java.loadClass("java.io.OutputStreamWriter");
const JThread = Java.loadClass("java.lang.Thread");

function readAll(is) {
  const r = new BufferedReader(new InputStreamReader(is, "UTF-8"));
  let sb = "", line;
  while ((line = r.readLine()) !== null) sb += line;
  r.close();
  return sb;
}
function httpGet(u) {
  const c = new URL(u).openConnection();
  c.setConnectTimeout(5000); c.setReadTimeout(8000); c.setRequestMethod("GET");
  const code = c.getResponseCode();
  return { code: code, text: readAll(code < 400 ? c.getInputStream() : c.getErrorStream()) };
}
function httpPost(u, bodyObj) {
  const c = new URL(u).openConnection();
  c.setConnectTimeout(5000); c.setReadTimeout(8000); c.setRequestMethod("POST");
  c.setRequestProperty("Content-Type", "application/json"); c.setDoOutput(true);
  const w = new OutputStreamWriter(c.getOutputStream(), "UTF-8");
  w.write(JSON.stringify(bodyObj)); w.flush(); w.close();
  return c.getResponseCode();
}
// HTTP не должен блокировать поток сервера → выносим в фон.
function runAsync(fn) { new JThread(fn).start(); }

// Очередь выдачи: заполняется из фонового потока, исполняется в главном (tick).
const giveQueue = [];

// ── Команда /claim ──
ServerEvents.commandRegistry((event) => {
  const Commands = event.commands;
  event.register(
    Commands.literal("claim").executes((ctx) => {
      const player = ctx.source.player;
      if (!player) return 0;
      const uuid = player.uuid.toString();
      const name = player.username;
      player.tell("§7Забираю предметы с сайта...");
      runAsync(() => {
        try {
          const res = httpGet(WEB + "/api/claim?key=" + KEY + "&uuid=" + uuid);
          if (res.code !== 200) { giveQueue.push({ name: name, items: [], err: "§cОшибка сайта (" + res.code + ")" }); return; }
          const data = JSON.parse(res.text);
          giveQueue.push({ name: name, items: data.items || [] });
        } catch (e) {
          giveQueue.push({ name: name, items: [], err: "§cНет связи с сайтом" });
        }
      });
      return 1;
    })
  );
});

// ── Главный поток: выдача предметов + учёт времени ──
let ticks = 0;
ServerEvents.tick((event) => {
  const server = event.server;

  // 1) Выдать накопленное (безопасно, в главном потоке).
  while (giveQueue.length > 0) {
    const job = giveQueue.shift();
    if (job.err) { server.runCommandSilent('tellraw ' + job.name + ' {"text":"' + job.err + '"}'); continue; }
    if (job.items.length === 0) { server.runCommandSilent('tellraw ' + job.name + ' {"text":"§eИнвентарь на сайте пуст"}'); continue; }
    job.items.forEach((it) => {
      server.runCommandSilent("give " + job.name + " minecraft:" + it.id + " " + it.count);
    });
    server.runCommandSilent('tellraw ' + job.name + ' {"text":"§aВыдано предметов: ' + job.items.length + '"}');
  }

  // 2) Раз в минуту — сообщить сайту наигранное время онлайн-игроков.
  ticks++;
  if (ticks >= 1200) {
    ticks = 0;
    server.players.forEach((p) => {
      const uuid = p.uuid.toString();
      runAsync(() => { try { httpPost(WEB + "/api/playtime?key=" + KEY, { uuid: uuid, seconds: 60 }); } catch (e) {} });
    });
  }
});
