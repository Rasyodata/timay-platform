var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import { defineConfig } from "vite";
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
function marketApi() {
    var _this = this;
    var SEED = [
        { name: "BRENT", value: 106.65, change: 1.84, decimals: 2, live: false },
        { name: "BALTIK KURU YÜK", value: 2917.0, change: -1.88, decimals: 2, live: false },
        { name: "BIST 100", value: 12150.67, change: -0.94, decimals: 2, live: false },
        { name: "USD/TRY", value: 49.3481, change: 0.11, decimals: 4, live: false },
        { name: "EUR/TRY", value: 55.0919, change: 0.09, decimals: 4, live: false },
        { name: "ALTIN/ONS", value: 4185.3, change: 0.42, decimals: 2, live: false },
    ];
    var baseline = {};
    var cache = null;
    var pctFromBaseline = function (name, value, fallback) {
        if (baseline[name] === undefined) {
            baseline[name] = value;
            return fallback; // ilk ölçümde gösterge değişim
        }
        return Number((((value - baseline[name]) / baseline[name]) * 100).toFixed(2));
    };
    var build = function () { return __awaiter(_this, void 0, void 0, function () {
        var quotes, set, results, rates;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    quotes = SEED.map(function (q) { return (__assign({}, q)); });
                    set = function (name, value) {
                        var q = quotes.find(function (x) { return x.name === name; });
                        if (q) {
                            q.value = value;
                            q.change = pctFromBaseline(name, value, q.change);
                            q.live = true;
                        }
                    };
                    return [4 /*yield*/, Promise.allSettled([
                            fetch("https://api.gold-api.com/price/XAU").then(function (r) { return r.json(); }),
                            fetch("https://open.er-api.com/v6/latest/USD").then(function (r) { return r.json(); }),
                        ])];
                case 1:
                    results = _d.sent();
                    if (results[0].status === "fulfilled" && ((_a = results[0].value) === null || _a === void 0 ? void 0 : _a.price)) {
                        set("ALTIN/ONS", Number(results[0].value.price));
                    }
                    if (results[1].status === "fulfilled" && ((_c = (_b = results[1].value) === null || _b === void 0 ? void 0 : _b.rates) === null || _c === void 0 ? void 0 : _c.TRY)) {
                        rates = results[1].value.rates;
                        set("USD/TRY", Number(rates.TRY));
                        if (rates.EUR)
                            set("EUR/TRY", Number(rates.TRY / rates.EUR));
                    }
                    return [2 /*return*/, quotes];
            }
        });
    }); };
    return {
        name: "market-api",
        configureServer: function (server) {
            var _this = this;
            server.middlewares.use("/api/market", function (_req, res) { return __awaiter(_this, void 0, void 0, function () {
                var _a;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _c.trys.push([0, 3, , 4]);
                            if (!(!cache || Date.now() - cache.ts > 8000)) return [3 /*break*/, 2];
                            _b = { ts: Date.now() };
                            return [4 /*yield*/, build()];
                        case 1:
                            cache = (_b.data = _c.sent(), _b);
                            _c.label = 2;
                        case 2:
                            res.setHeader("Content-Type", "application/json; charset=utf-8");
                            res.end(JSON.stringify(cache.data));
                            return [3 /*break*/, 4];
                        case 3:
                            _a = _c.sent();
                            res.statusCode = 200;
                            res.setHeader("Content-Type", "application/json; charset=utf-8");
                            res.end(JSON.stringify(SEED));
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            }); });
        },
    };
}
// ─────────────────────────────────────────────────────────────────────────
// TCMB resmî döviz kurları (ücretsiz). today.xml sunucu tarafında çekilip
// same-origin JSON olarak sunulur: GET /api/kurlar → Kur[].
// ─────────────────────────────────────────────────────────────────────────
function kurlarApi() {
    var _this = this;
    var FEED = "https://www.tcmb.gov.tr/kurlar/today.xml";
    var cache = null;
    var parseTcmb = function (xml) {
        var tarih = (xml.match(/Tarih="([^"]+)"/) || [])[1] || "";
        var out = [];
        var _loop_1 = function (b) {
            var kod = (b.match(/Kod="([^"]+)"/) || [])[1] || "";
            var pick = function (tag) { var _a; return ((_a = (b.match(new RegExp("<".concat(tag, ">([^<]*)</").concat(tag, ">"), "i")) || [])[1]) === null || _a === void 0 ? void 0 : _a.trim()) || ""; };
            var satis = pick("ForexSelling");
            if (kod && satis)
                out.push({ kod: kod, isim: pick("Isim"), unit: pick("Unit"), alis: pick("ForexBuying"), satis: satis });
        };
        for (var _i = 0, _a = xml.split(/<Currency\b/i).slice(1); _i < _a.length; _i++) {
            var b = _a[_i];
            _loop_1(b);
        }
        return { tarih: tarih, kurlar: out };
    };
    var build = function () { return __awaiter(_this, void 0, void 0, function () {
        var r, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, fetch(FEED, { headers: { "User-Agent": "Mozilla/5.0" } })];
                case 1:
                    r = _b.sent();
                    _a = parseTcmb;
                    return [4 /*yield*/, r.text()];
                case 2: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
            }
        });
    }); };
    return {
        name: "kurlar-api",
        configureServer: function (server) {
            var _this = this;
            server.middlewares.use("/api/kurlar", function (_req, res) { return __awaiter(_this, void 0, void 0, function () {
                var _a;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _c.trys.push([0, 3, , 4]);
                            if (!(!cache || Date.now() - cache.ts > 1800000)) return [3 /*break*/, 2];
                            _b = { ts: Date.now() };
                            return [4 /*yield*/, build()];
                        case 1:
                            cache = (_b.data = _c.sent(), _b);
                            _c.label = 2;
                        case 2:
                            res.setHeader("Content-Type", "application/json; charset=utf-8");
                            res.end(JSON.stringify(cache.data));
                            return [3 /*break*/, 4];
                        case 3:
                            _a = _c.sent();
                            res.statusCode = 200;
                            res.setHeader("Content-Type", "application/json; charset=utf-8");
                            res.end(JSON.stringify({ tarih: "", kurlar: [] }));
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            }); });
        },
    };
}
// ─────────────────────────────────────────────────────────────────────────
// Piyasa özeti (CNN Türk tarzı): Dolar, Euro, Altın (gr), Gümüş (gr), BIST 100.
// Veri Yahoo Finance'ten (ücretsiz) — CNN Türk ile aynı piyasa. Altın/gümüş ons
// → gram TL dönüşümü USD/TRY ile yapılır. GET /api/piyasa → Piyasa[].
// ─────────────────────────────────────────────────────────────────────────
function piyasaApi() {
    var _this = this;
    var ONS = 31.1035;
    var cache = null;
    var yf = function (sym) { return __awaiter(_this, void 0, void 0, function () {
        var r, j, m;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, fetch("https://query1.finance.yahoo.com/v8/finance/chart/".concat(sym, "?interval=1d&range=1d"), { headers: { "User-Agent": "Mozilla/5.0" } })];
                case 1:
                    r = _d.sent();
                    return [4 /*yield*/, r.json()];
                case 2:
                    j = _d.sent();
                    m = (_c = (_b = (_a = j === null || j === void 0 ? void 0 : j.chart) === null || _a === void 0 ? void 0 : _a.result) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.meta;
                    return [2 /*return*/, { price: Number(m === null || m === void 0 ? void 0 : m.regularMarketPrice), prev: Number(m === null || m === void 0 ? void 0 : m.chartPreviousClose) }];
            }
        });
    }); };
    var trNum = function (n, d) { return n.toLocaleString("tr-TR", { minimumFractionDigits: d, maximumFractionDigits: d }); };
    var pct = function (now, prev) { return (prev ? Number((((now - prev) / prev) * 100).toFixed(2)) : 0); };
    var build = function () { return __awaiter(_this, void 0, void 0, function () {
        var _a, usd, eur, gold, silver, bist, goldNow, goldPrev, silNow, silPrev;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, Promise.all([
                        yf("USDTRY=X"), yf("EURTRY=X"), yf("GC=F"), yf("SI=F"), yf("XU100.IS"),
                    ])];
                case 1:
                    _a = _b.sent(), usd = _a[0], eur = _a[1], gold = _a[2], silver = _a[3], bist = _a[4];
                    goldNow = (gold.price / ONS) * usd.price, goldPrev = (gold.prev / ONS) * usd.prev;
                    silNow = (silver.price / ONS) * usd.price, silPrev = (silver.prev / ONS) * usd.prev;
                    return [2 /*return*/, [
                            { kod: "USD", ad: "Dolar", deger: trNum(usd.price, 4), yuzde: pct(usd.price, usd.prev) },
                            { kod: "EUR", ad: "Euro", deger: trNum(eur.price, 4), yuzde: pct(eur.price, eur.prev) },
                            { kod: "GOLD", ad: "Altın (gr)", deger: trNum(goldNow, 3), yuzde: pct(goldNow, goldPrev) },
                            { kod: "SILVER", ad: "Gümüş (gr)", deger: trNum(silNow, 4), yuzde: pct(silNow, silPrev) },
                            { kod: "BIST", ad: "BIST 100", deger: trNum(bist.price, 2), yuzde: pct(bist.price, bist.prev) },
                        ]];
            }
        });
    }); };
    return {
        name: "piyasa-api",
        configureServer: function (server) {
            var _this = this;
            server.middlewares.use("/api/piyasa", function (_req, res) { return __awaiter(_this, void 0, void 0, function () {
                var _a;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _c.trys.push([0, 3, , 4]);
                            if (!(!cache || Date.now() - cache.ts > 60000)) return [3 /*break*/, 2];
                            _b = { ts: Date.now() };
                            return [4 /*yield*/, build()];
                        case 1:
                            cache = (_b.data = _c.sent(), _b);
                            _c.label = 2;
                        case 2:
                            res.setHeader("Content-Type", "application/json; charset=utf-8");
                            res.end(JSON.stringify(cache.data));
                            return [3 /*break*/, 4];
                        case 3:
                            _a = _c.sent();
                            res.statusCode = 200;
                            res.setHeader("Content-Type", "application/json; charset=utf-8");
                            res.end(JSON.stringify([]));
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            }); });
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
