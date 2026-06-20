// Прямой Minecraft Server List Ping (SLP, протокол 1.7+).
// Без сторонних сервисов — статус и онлайн берём напрямую с сервера.
const net = require("net");

function varint(n) {
  const bytes = [];
  let v = n >>> 0;
  do {
    let t = v & 0x7f;
    v >>>= 7;
    if (v !== 0) t |= 0x80;
    bytes.push(t);
  } while (v !== 0);
  return Buffer.from(bytes);
}

function packet(id, data) {
  const body = Buffer.concat([varint(id), data]);
  return Buffer.concat([varint(body.length), body]);
}

function pingServer(host, port, timeout = 5000) {
  return new Promise((resolve) => {
    const sock = net.connect({ host, port });
    let buf = Buffer.alloc(0);
    let done = false;
    const finish = (r) => { if (!done) { done = true; sock.destroy(); resolve(r); } };

    sock.setTimeout(timeout);
    sock.on("connect", () => {
      const h = Buffer.from(host, "utf8");
      const portB = Buffer.alloc(2);
      portB.writeUInt16BE(port, 0);
      const handshake = Buffer.concat([varint(767), varint(h.length), h, portB, varint(1)]);
      sock.write(packet(0x00, handshake));
      sock.write(packet(0x00, Buffer.alloc(0))); // status request
    });
    sock.on("data", (d) => {
      buf = Buffer.concat([buf, d]);
      const s = buf.toString("utf8");
      const i = s.indexOf("{");
      if (i < 0) return;
      try {
        const j = JSON.parse(s.slice(i));
        finish({
          online: true,
          version: j.version && j.version.name,
          players: j.players ? { online: j.players.online, max: j.players.max } : null
        });
      } catch (_) { /* ждём ещё данные */ }
    });
    sock.on("timeout", () => finish({ online: false }));
    sock.on("error", () => finish({ online: false }));
  });
}

module.exports = { pingServer };
