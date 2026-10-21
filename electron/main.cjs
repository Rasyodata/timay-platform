// Timay Platform — Electron ana süreç (Windows/macOS/Linux masaüstü).
// Üretimde dist/ içeriğini yerel bir http sunucusundan servis eder; böylece
// uygulama tam olarak dev sunucusundaki gibi çalışır ve canlı market verisi
// (/api/market) masaüstünde de gelir. Dev modda vite sunucusuna bağlanır.
const { app, BrowserWindow, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");

const DIST = path.join(__dirname, "..", "dist");
const isDev = process.env.ELECTRON_DEV === "1";

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".ico": "image/x-icon",
  ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".map": "application/json",
};

// ── Market verisi (dev proxy'nin masaüstü karşılığı; canlı ALTIN/USD/EUR) ──
const SEED = [
  { name: "BRENT", value: 106.65, change: 1.84, decimals: 2, live: false },
  { name: "BALTIK KURU YÜK", value: 2917.0, change: -1.88, decimals: 2, live: false },
  { name: "BIST 100", value: 12150.67, change: -0.94, decimals: 2, live: false },
  { name: "USD/TRY", value: 49.3481, change: 0.11, decimals: 4, live: false },
  { name: "EUR/TRY", value: 55.0919, change: 0.09, decimals: 4, live: false },
  { name: "ALTIN/ONS", value: 4185.3, change: 0.42, decimals: 2, live: false },
];
const baseline = {};
let cache = null;
const pct = (name, value, fallback) => {
  if (baseline[name] === undefined) { baseline[name] = value; return fallback; }
  return Number((((value - baseline[name]) / baseline[name]) * 100).toFixed(2));
};
async function marketData() {
  const quotes = SEED.map((q) => ({ ...q }));
  const set = (name, value) => { const q = quotes.find((x) => x.name === name); if (q) { q.value = value; q.change = pct(name, value, q.change); q.live = true; } };
  const results = await Promise.allSettled([
    fetch("https://api.gold-api.com/price/XAU").then((r) => r.json()),
    fetch("https://open.er-api.com/v6/latest/USD").then((r) => r.json()),
  ]);
  if (results[0].status === "fulfilled" && results[0].value?.price) set("ALTIN/ONS", Number(results[0].value.price));
  if (results[1].status === "fulfilled" && results[1].value?.rates?.TRY) {
    const rates = results[1].value.rates;
    set("USD/TRY", Number(rates.TRY));
    if (rates.EUR) set("EUR/TRY", Number(rates.TRY / rates.EUR));
  }
  return quotes;
}

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      const url = (req.url || "/").split("?")[0];
      if (url === "/api/market") {
        try {
          if (!cache || Date.now() - cache.ts > 8000) cache = { ts: Date.now(), data: await marketData() };
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          return res.end(JSON.stringify(cache.data));
        } catch {
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          return res.end(JSON.stringify(SEED));
        }
      }
      let file = path.join(DIST, url === "/" ? "index.html" : decodeURIComponent(url));
      if (!file.startsWith(DIST)) file = path.join(DIST, "index.html"); // path traversal koruması
      fs.readFile(file, (err, buf) => {
        if (err) {
          // SPA geri dönüşü → index.html
          fs.readFile(path.join(DIST, "index.html"), (e2, idx) => {
            if (e2) { res.statusCode = 404; return res.end("Not found"); }
            res.setHeader("Content-Type", "text/html; charset=utf-8"); res.end(idx);
          });
          return;
        }
        res.setHeader("Content-Type", MIME[path.extname(file)] || "application/octet-stream");
        res.end(buf);
      });
    });
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1024, minHeight: 680,
    backgroundColor: "#0b0f17",
    title: "Timay Platform",
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, preload: path.join(__dirname, "preload.cjs") },
  });
  // Dış bağlantılar sistem tarayıcısında açılsın (uygulama penceresi kirlenmesin).
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: "deny" }; });

  if (isDev) {
    await win.loadURL(process.env.ELECTRON_URL || "http://localhost:5173");
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    const port = await startServer();
    await win.loadURL(`http://127.0.0.1:${port}/`);
  }
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
