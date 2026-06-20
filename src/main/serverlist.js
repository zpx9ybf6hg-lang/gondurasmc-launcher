// Запись servers.dat (несжатый NBT), чтобы сервер всегда был в списке
// «Сетевая игра» у любого аккаунта/новой установки.
const fs = require("fs");
const path = require("path");

function nbtStr(s) {
  const b = Buffer.from(s, "utf8");
  const len = Buffer.alloc(2);
  len.writeUInt16BE(b.length, 0);
  return Buffer.concat([len, b]);
}
function int32(n) {
  const b = Buffer.alloc(4);
  b.writeInt32BE(n, 0);
  return b;
}
// TAG_String (id 8): id + name + value
function tagString(name, val) {
  return Buffer.concat([Buffer.from([8]), nbtStr(name), nbtStr(val)]);
}
// TAG_Byte (id 1): id + name + 1 byte
function tagByte(name, val) {
  return Buffer.concat([Buffer.from([1]), nbtStr(name), Buffer.from([val & 0xff])]);
}

// servers: [{ name, ip, acceptTextures? }]
function buildServersDat(servers) {
  const elements = servers.map((s) => {
    const entries = [tagString("name", s.name), tagString("ip", s.ip)];
    if (s.acceptTextures != null) entries.push(tagByte("acceptTextures", s.acceptTextures));
    // payload компаунда-элемента + TAG_End
    return Buffer.concat([...entries, Buffer.from([0])]);
  });

  // TAG_List "servers" из TAG_Compound (id 10)
  const listHeader = Buffer.concat([
    Buffer.from([9]), // TAG_List
    nbtStr("servers"),
    Buffer.from([10]), // тип элементов: TAG_Compound
    int32(elements.length)
  ]);

  // Корневой TAG_Compound с пустым именем
  return Buffer.concat([
    Buffer.from([10]), // TAG_Compound
    nbtStr(""),
    listHeader,
    ...elements,
    Buffer.from([0]) // TAG_End корня
  ]);
}

// Перезаписываем servers.dat нашим сервером (лаунчер односерверный).
function writeServersDat(gameDir, servers) {
  const data = buildServersDat(servers);
  fs.writeFileSync(path.join(gameDir, "servers.dat"), data);
  return data.length;
}

module.exports = { writeServersDat, buildServersDat };
