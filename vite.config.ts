import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// ─────────────────────────────────────────────────────────────────────────
// Dev-only market data proxy. The browser can't call external quote APIs
// directly (CORS), so this middleware fetches them server-side and exposes a
// single same-origin endpoint: GET /api/market → Quote[].
//
// Real (no API key): ALTIN/ONS via gold-api.com (updates every few seconds),
// USD/TRY & EUR/TRY via open.er-api.com (daily). BRENT / BIST 100 / BALTIK
// have no reliable free source → returned as indicative (live:false).
//
// For PRODUCTION, move this same handler into the project's Node backend
// (src/server.mjs) and point the frontend at it.
// ─────────────────────────────────────────────────────────────────────────
function marketApi(): Plugin {
  const SEED = [
    { name: "BRENT", value: 106.65, change: 1.84, decimals: 2, live: false },
    { name: "BALTIK KURU YÜK", value: 2917.0, change: -1.88, decimals: 2, live: false },
    { name: "BIST 100", value: 12150.67, change: -0.94, decimals: 2, live: false },
    { name: "USD/TRY", value: 49.3481, change: 0.11, decimals: 4, live: false },
    { name: "EUR/TRY", value: 55.0919, change: 0.09, decimals: 4, live: false },
    { name: "ALTIN/ONS", value: 4185.3, change: 0.42, decimals: 2, live: false },
  ];

  const baseline: Record<string, number> = {};
  let cache: { ts: number; data: unknown } | null = null;

  const pctFromBaseline = (name: string, value: number, fallback: number) => {
    if (baseline[name] === undefined) {
      baseline[name] = value;
      return fallback; // ilk ölçümde gösterge değişim
    }
    return Number((((value - baseline[name]) / baseline[name]) * 100).toFixed(2));
  };

  const build = async () => {
    const quotes = SEED.map((q) => ({ ...q }));
    const set = (name: string, value: number) => {
      const q = quotes.find((x) => x.name === name);
      if (q) {
        q.value = value;
        q.change = pctFromBaseline(name, value, q.change);
        q.live = true;
      }
    };

    const results = await Promise.allSettled([
      fetch("https://api.gold-api.com/price/XAU").then((r) => r.json()),
      fetch("https://open.er-api.com/v6/latest/USD").then((r) => r.json()),
    ]);

    if (results[0].status === "fulfilled" && results[0].value?.price) {
      set("ALTIN/ONS", Number(results[0].value.price));
    }
    if (results[1].status === "fulfilled" && results[1].value?.rates?.TRY) {
      const rates = results[1].value.rates;
      set("USD/TRY", Number(rates.TRY));
      if (rates.EUR) set("EUR/TRY", Number(rates.TRY / rates.EUR));
    }
    return quotes;
  };

  return {
    name: "market-api",
    configureServer(server) {
      server.middlewares.use("/api/market", async (_req, res) => {
        try {
          // cache dışarıdaki API'leri yormamak için 8 sn
          if (!cache || Date.now() - cache.ts > 8000) {
            cache = { ts: Date.now(), data: await build() };
          }
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify(cache.data));
        } catch {
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify(SEED));
        }
      });
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────
// TCMB resmî döviz kurları (ücretsiz). today.xml sunucu tarafında çekilip
// same-origin JSON olarak sunulur: GET /api/kurlar → Kur[].
// ─────────────────────────────────────────────────────────────────────────
function kurlarApi(): Plugin {
  const FEED = "https://www.tcmb.gov.tr/kurlar/today.xml";
  let cache: { ts: number; data: unknown } | null = null;

  const parseTcmb = (xml: string) => {
    const tarih = (xml.match(/Tarih="([^"]+)"/) || [])[1] || "";
    const out: { kod: string; isim: string; unit: string; alis: string; satis: string }[] = [];
    for (const b of xml.split(/<Currency\b/i).slice(1)) {
      const kod = (b.match(/Kod="([^"]+)"/) || [])[1] || "";
      const pick = (tag: string) => (b.match(new RegExp(`<${tag}>([^<]*)</${tag}>`, "i")) || [])[1]?.trim() || "";
      const satis = pick("ForexSelling");
      if (kod && satis) out.push({ kod, isim: pick("Isim"), unit: pick("Unit"), alis: pick("ForexBuying"), satis });
    }
    return { tarih, kurlar: out };
  };

  const build = async () => {
    const r = await fetch(FEED, { headers: { "User-Agent": "Mozilla/5.0" } });
    return parseTcmb(await r.text());
  };

  return {
    name: "kurlar-api",
    configureServer(server) {
      server.middlewares.use("/api/kurlar", async (_req, res) => {
        try {
          if (!cache || Date.now() - cache.ts > 1800000) {
            cache = { ts: Date.now(), data: await build() };
          }
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify(cache.data));
        } catch {
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify({ tarih: "", kurlar: [] }));
        }
      });
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Piyasa özeti (CNN Türk tarzı): Dolar, Euro, Altın (gr), Gümüş (gr), BIST 100.
// Veri Yahoo Finance'ten (ücretsiz) — CNN Türk ile aynı piyasa. Altın/gümüş ons
// → gram TL dönüşümü USD/TRY ile yapılır. GET /api/piyasa → Piyasa[].
// ─────────────────────────────────────────────────────────────────────────
function piyasaApi(): Plugin {
  const ONS = 31.1035;
  let cache: { ts: number; data: unknown } | null = null;

  const yf = async (sym: string) => {
    const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`, { headers: { "User-Agent": "Mozilla/5.0" } });
    const j = await r.json();
    const m = j?.chart?.result?.[0]?.meta;
    return { price: Number(m?.regularMarketPrice), prev: Number(m?.chartPreviousClose) };
  };

  const trNum = (n: number, d: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: d, maximumFractionDigits: d });
  const pct = (now: number, prev: number) => (prev ? Number((((now - prev) / prev) * 100).toFixed(2)) : 0);

  const build = async () => {
    const [usd, eur, gold, silver, bist] = await Promise.all([
      yf("USDTRY=X"), yf("EURTRY=X"), yf("GC=F"), yf("SI=F"), yf("XU100.IS"),
    ]);
    const goldNow = (gold.price / ONS) * usd.price, goldPrev = (gold.prev / ONS) * usd.prev;
    const silNow = (silver.price / ONS) * usd.price, silPrev = (silver.prev / ONS) * usd.prev;
    return [
      { kod: "USD", ad: "Dolar", deger: trNum(usd.price, 4), yuzde: pct(usd.price, usd.prev) },
      { kod: "EUR", ad: "Euro", deger: trNum(eur.price, 4), yuzde: pct(eur.price, eur.prev) },
      { kod: "GOLD", ad: "Altın (gr)", deger: trNum(goldNow, 3), yuzde: pct(goldNow, goldPrev) },
      { kod: "SILVER", ad: "Gümüş (gr)", deger: trNum(silNow, 4), yuzde: pct(silNow, silPrev) },
      { kod: "BIST", ad: "BIST 100", deger: trNum(bist.price, 2), yuzde: pct(bist.price, bist.prev) },
    ];
  };

  return {
    name: "piyasa-api",
    configureServer(server) {
      server.middlewares.use("/api/piyasa", async (_req, res) => {
        try {
          if (!cache || Date.now() - cache.ts > 60000) {
            cache = { ts: Date.now(), data: await build() };
          }
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify(cache.data));
        } catch {
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify([]));
        }
      });
    },
  };
}

export default defineConfig({
  // Electron (masaüstü) file:// ile yükler → göreli yollar şart.
  base: "./",
  plugins: [react(), marketApi(), kurlarApi(), piyasaApi()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  server: { port: 5173, host: true },
});
