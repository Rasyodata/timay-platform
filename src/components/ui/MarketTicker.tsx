import { useEffect, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────
// Scrolling market ticker (Bloomberg HT tarzı kayan yazı).
//
// NOT: Tarayıcıda çalışan bir SPA, bloomberght.com'dan doğrudan canlı veri
// çekemez (CORS + tescilli besleme). Değerler kullanıcının verdiği gerçek
// kapanışlarla başlatılır ve "canlı" hissi için hafifçe dalgalandırılır.
// Gerçek zamanlı veri için bir backend proxy / market-data API gerekir —
// `seed`'i o endpoint'ten besleyip bu bileşeni aynen kullanabilirsiniz.
// ─────────────────────────────────────────────────────────────────────────

interface Quote {
  name: string;
  value: number;
  change: number; // yüzde
  decimals: number;
}

const SEED: Quote[] = [
  { name: "BRENT", value: 106.65, change: 1.84, decimals: 2 },
  { name: "BALTIK KURU YÜK", value: 2917.0, change: -1.88, decimals: 2 },
  { name: "BIST 100", value: 12150.67, change: -0.94, decimals: 2 },
  { name: "USD/TRY", value: 49.3481, change: 0.11, decimals: 4 },
  { name: "EUR/TRY", value: 55.0919, change: 0.09, decimals: 4 },
  { name: "ALTIN/ONS", value: 4185.3, change: 0.42, decimals: 2 },
];

function fmt(v: number, decimals: number) {
  return v.toLocaleString("tr-TR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function QuoteItem({ q }: { q: Quote }) {
  const up = q.change >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className="mx-5 inline-flex items-center gap-2 whitespace-nowrap text-xs">
      <span className="font-semibold uppercase tracking-wide text-muted">{q.name}</span>
      <span className="font-semibold text-ink nums tabular-nums">{fmt(q.value, q.decimals)}</span>
      <span className={`inline-flex items-center gap-0.5 font-semibold nums ${up ? "text-good" : "text-critical"}`}>
        <Icon size={12} />
        {up ? "+" : ""}
        {q.change.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
      </span>
    </span>
  );
}

export default function MarketTicker() {
  const [quotes, setQuotes] = useState<Quote[]>(SEED);

  // Gerçek veri: /api/market (dev sunucusu, sunucu tarafında harici API'leri
  // çeker — ALTIN/ONS & FX gerçek). Her 10 sn'de yenilenir; hata olursa seed.
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/market");
        if (!res.ok) return;
        const data = (await res.json()) as Quote[];
        if (alive && Array.isArray(data) && data.length) setQuotes(data);
      } catch {
        /* seed değerlerinde kal */
      }
    };
    load();
    const id = window.setInterval(load, 10_000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  // İçeriği iki kez basıp %50 kaydırarak kusursuz sonsuz döngü.
  const loop = [...quotes, ...quotes];

  return (
    <div className="group relative overflow-hidden rounded-xl border border-line bg-white/[0.02] py-2">
      {/* kenar yumuşatma (fade) */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-base to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-base to-transparent" />
      {/* canlı etiketi */}
      <span className="pointer-events-none absolute left-2 top-1/2 z-20 flex -translate-y-1/2 items-center gap-1 rounded-md border border-good/30 bg-base/90 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-good backdrop-blur">
        <span className="h-1 w-1 animate-pulse-dot rounded-full bg-good" />
        Canlı
      </span>

      <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused]">
        {loop.map((q, i) => (
          <QuoteItem key={`${q.name}-${i}`} q={q} />
        ))}
      </div>
    </div>
  );
}
