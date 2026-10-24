// Timay Platform — WebRTC sinyal sunucusu (Toplantı Odası canlı yayın)
// Sadece SDP/ICE sinyallerini oda bazında yönlendirir; medya (ses/görüntü)
// doğrudan tarayıcılar arasında (P2P) akar — bu sunucudan geçmez.
import http from "http";
import { WebSocketServer } from "ws";

const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
  res.end("Timay sinyal sunucusu çalışıyor ✓");
});

const wss = new WebSocketServer({ server });
/** room -> Map(id -> { id, name, ws }) */
const rooms = new Map();
let nextId = 1;

const send = (ws, obj) => { try { ws.send(JSON.stringify(obj)); } catch { /* yoksay */ } };

wss.on("connection", (ws) => {
  const id = "u" + (nextId++);
  let room = null, name = "Katılımcı";

  ws.on("message", (buf) => {
    let msg;
    try { msg = JSON.parse(buf.toString()); } catch { return; }

    if (msg.type === "join") {
      room = String(msg.room || "genel");
      name = String(msg.name || "Katılımcı");
      if (!rooms.has(room)) rooms.set(room, new Map());
      const r = rooms.get(room);
      // Yeni katılana mevcut katılımcıları gönder (kendi id'si dahil)
      send(ws, { type: "peers", id, peers: [...r.values()].map((p) => ({ id: p.id, name: p.name })) });
      // Diğerlerine yeni katılanı bildir
      for (const p of r.values()) send(p.ws, { type: "peer-joined", id, name });
      r.set(id, { id, ws, name });
    } else if (msg.type === "signal") {
      const r = room && rooms.get(room);
      if (!r) return;
      const target = r.get(msg.to);
      if (target) send(target.ws, { type: "signal", from: id, name, data: msg.data });
    }
  });

  ws.on("close", () => {
    if (room && rooms.has(room)) {
      const r = rooms.get(room);
      r.delete(id);
      for (const p of r.values()) send(p.ws, { type: "peer-left", id });
      if (r.size === 0) rooms.delete(room);
    }
  });
});

server.listen(PORT, () => console.log(`[timay-signal] dinleniyor :${PORT}`));
