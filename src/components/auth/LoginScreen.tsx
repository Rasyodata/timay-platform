import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  BadgeCheck,
  CalendarClock,
  ClipboardCheck,
  Eye,
  EyeOff,
  FolderKanban,
  Handshake,
  Lock,
  LogIn,
  Mail,
  Rocket,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useUsers } from "@/context/UsersContext";
import { ROLE_LABELS } from "@/types/modules";
import MarketTicker from "@/components/ui/MarketTicker";

const compactTRY = new Intl.NumberFormat("tr-TR", { notation: "compact", maximumFractionDigits: 1 });

// ── Live ticking portfolio counter ──────────────────────────────────────────
function useTicker(base: number, tick = 1400) {
  const [value, setValue] = useState(base);
  useEffect(() => {
    const id = window.setInterval(() => {
      setValue((v) => Math.max(base * 0.97, v + (Math.random() - 0.35) * base * 0.0018));
    }, tick);
    return () => window.clearInterval(id);
  }, [base, tick]);
  return value;
}

// ── Continuously flowing area sparkline (hand-rolled SVG) ────────────────────
function LiveSparkline() {
  const [points, setPoints] = useState<number[]>(() =>
    Array.from({ length: 48 }, (_, i) => 50 + Math.sin(i / 4) * 16 + i * 0.5),
  );
  useEffect(() => {
    const id = window.setInterval(() => {
      setPoints((prev) => {
        const last = prev[prev.length - 1];
        const next = Math.max(14, Math.min(96, last + (Math.random() - 0.46) * 11));
        return [...prev.slice(1), next];
      });
    }, 900);
    return () => window.clearInterval(id);
  }, []);

  const W = 520;
  const H = 150;
  const path = useMemo(() => {
    const step = W / (points.length - 1);
    const line = points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(1)} ${(H - (p / 100) * H).toFixed(1)}`)
      .join(" ");
    const area = `${line} L ${W} ${H} L 0 ${H} Z`;
    return { line, area };
  }, [points]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-24 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="login-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="login-stroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="55%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
      </defs>
      <path d={path.area} fill="url(#login-fill)" className="transition-all duration-700 ease-out" />
      <path
        d={path.line}
        fill="none"
        stroke="url(#login-stroke)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-all duration-700 ease-out"
      />
    </svg>
  );
}

interface Highlight {
  icon: LucideIcon;
  label: string;
  base: number;
  kind: "currency" | "count";
  unit?: string;
  /** Static period-over-period change (no random flicker). */
  delta: number;
  tone: string;
  ring: string;
}

const HIGHLIGHTS: Highlight[] = [
  { icon: TrendingUp, label: "Yatırımlar", base: 142_900_000, kind: "currency", delta: 2.4, tone: "text-neon-blue", ring: "border-neon-blue/30 bg-neon-blue/10" },
  { icon: FolderKanban, label: "Tamamlanan", base: 37, kind: "count", unit: "proje", delta: 0.8, tone: "text-neon-emerald", ring: "border-neon-emerald/30 bg-neon-emerald/10" },
  { icon: Handshake, label: "Ortaklıklar", base: 12, kind: "count", unit: "ortak", delta: 1.1, tone: "text-neon-violet", ring: "border-neon-violet/30 bg-neon-violet/10" },
  { icon: Rocket, label: "Startup", base: 24_600_000, kind: "currency", delta: 2.7, tone: "text-series-5", ring: "border-series-5/30 bg-series-5/10" },
];

// Second row — operasyonel metrikler (görüşme, inceleme, kullanıcılar…)
const HIGHLIGHTS_OPS: Highlight[] = [
  { icon: CalendarClock, label: "Görüşmeler", base: 8, kind: "count", unit: "bugün", delta: 0.9, tone: "text-neon-blue", ring: "border-neon-blue/30 bg-neon-blue/10" },
  { icon: ClipboardCheck, label: "İncelemeler", base: 14, kind: "count", unit: "bekliyor", delta: 1.2, tone: "text-neon-emerald", ring: "border-neon-emerald/30 bg-neon-emerald/10" },
  { icon: Users, label: "Kullanıcılar", base: 1284, kind: "count", unit: "aktif", delta: 1.6, tone: "text-neon-violet", ring: "border-neon-violet/30 bg-neon-violet/10" },
  { icon: BadgeCheck, label: "Onaylar", base: 6, kind: "count", unit: "bekliyor", delta: 0.5, tone: "text-series-5", ring: "border-series-5/30 bg-series-5/10" },
];

function HighlightCard({ item }: { item: Highlight }) {
  const Icon = item.icon;
  const [val, setVal] = useState(item.base);

  // Currency values drift gently within tight bounds so each card reads as
  // "live" on its own — no roaming highlight needed.
  useEffect(() => {
    if (item.kind !== "currency") return;
    const id = window.setInterval(() => {
      setVal((v) => {
        const next = v + (Math.random() - 0.45) * item.base * 0.0015;
        return Math.min(item.base * 1.03, Math.max(item.base * 0.97, next));
      });
    }, 2600);
    return () => window.clearInterval(id);
  }, [item]);

  const number =
    item.kind === "currency"
      ? `₺${compactTRY.format(val)}`
      : Math.round(val).toLocaleString("tr-TR");

  // Every card is identical in structure (equal & symmetric); only the icon
  // carries the accent colour, and each shows its own live dot.
  return (
    <div className="flex min-w-0 flex-1 flex-col rounded-2xl border border-line bg-white/[0.02] px-3.5 py-3.5">
      <div className="flex items-center justify-between">
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${item.ring}`}>
          <Icon size={15} className={item.tone} />
        </span>
        <span className="flex shrink-0 items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-good">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-good" />
          canlı
        </span>
      </div>

      {/* value + small muted unit, baseline-aligned, never wraps */}
      <p className="mt-3 flex items-baseline gap-1 overflow-hidden text-lg font-bold leading-none text-ink">
        <span className="nums tabular-nums">{number}</span>
        {item.unit && <span className="truncate text-[11px] font-medium text-muted">{item.unit}</span>}
      </p>

      <p className="mt-1.5 truncate text-[11px] text-muted">{item.label}</p>
    </div>
  );
}

export function Showcase({ screensaver = false }: { screensaver?: boolean } = {}) {
  const portfolio = useTicker(487_120_000);

  // Hero value shown in millions of USD, e.g. "496.89 ML DOLAR".
  const usdMillions = (portfolio / 1_000_000).toFixed(2);

  return (
    <div className={`relative flex-col justify-between overflow-hidden ${screensaver ? "flex h-full w-full p-8 md:p-12" : "hidden p-10 lg:flex xl:p-14"}`}>
      {/* animated background layers */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-neon-blue/25 blur-[120px] animate-drift-slow" />
        <div className="absolute -bottom-32 left-1/3 h-96 w-96 rounded-full bg-neon-violet/25 blur-[130px] animate-drift-slower" />
        <div className="absolute right-0 top-1/4 h-80 w-80 rounded-full bg-neon-emerald/20 blur-[120px] animate-float" />
        {/* moving grid */}
        <div
          className="absolute inset-0 opacity-[0.07] animate-grid-pan"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* top: brand */}
      <div className="relative animate-rise">
        <div className="flex items-center gap-4">
          <span className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-neon-blue to-neon-violet text-3xl font-bold text-white shadow-glow-blue">
            T
          </span>
          <p className="text-2xl font-bold tracking-tight text-ink">Timay Platform</p>
        </div>

        {/* Kayan piyasa şeridi (Timay Platform ile Timay Ortaklık Ağı arasında) */}
        <div className="mt-5">
          <MarketTicker />
        </div>
      </div>

      {/* middle: live headline */}
      <div className="relative" style={{ animation: "rise 0.7s cubic-bezier(0.22,1,0.36,1) 0.1s both" }}>
        <span className="chip border-neon-violet/30 bg-neon-violet/10 text-neon-violet">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-neon-violet" />
          Timay Ortaklık Ağı
        </span>
        <h2 className="mt-4 text-4xl font-bold leading-tight xl:text-5xl">
          <span className="bg-gradient-to-r from-neon-blue via-neon-emerald to-neon-violet bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient-pan">
            Stronger together.
          </span>
        </h2>
        <p className="mt-3 max-w-md text-sm text-muted">
          Proje, yatırım ve ortaklıkları tek çatı altında buluşturur; gücünü paylaşan büyür.
        </p>
        <div className="mt-5 flex items-end gap-2">
          <span className="text-4xl font-bold tracking-tight text-ink nums tabular-nums xl:text-5xl">
            {usdMillions}
            <span className="ml-2 text-xl font-semibold text-muted xl:text-2xl">ML DOLAR</span>
          </span>
          <span className="mb-1.5 flex items-center gap-0.5 text-sm font-semibold text-good">
            <ArrowUpRight size={16} /> %12,4
          </span>
        </div>
        <div className="mt-2">
          <LiveSparkline />
        </div>
      </div>

      {/* bottom: two rows of live rotating highlights */}
      <div className="relative space-y-3.5" style={{ animation: "rise 0.7s cubic-bezier(0.22,1,0.36,1) 0.2s both" }}>
        {/* operasyonel satır (görüşme · inceleme · kullanıcılar · onaylar) */}
        <div className="flex gap-3.5">
          {HIGHLIGHTS_OPS.map((h) => (
            <HighlightCard key={h.label} item={h} />
          ))}
        </div>
        {/* finansal satır */}
        <div className="flex gap-3.5">
          {HIGHLIGHTS.map((h) => (
            <HighlightCard key={h.label} item={h} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LoginScreen() {
  const { login, justLoggedOut } = useAuth();
  const { users, setCurrentUser } = useUsers();
  const [email, setEmail] = useState("rasyodatagrup@gmail.com");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [fails, setFails] = useState(0);
  const [lockUntil, setLockUntil] = useState(0);
  const timer = useRef<number | null>(null);

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // Deneme sınırı — 5 hatalı denemeden sonra 30 sn kilit (basit brute-force caydırıcı)
    if (lockUntil > Date.now()) {
      setErr(`Çok fazla hatalı deneme. ${Math.ceil((lockUntil - Date.now()) / 1000)} sn sonra tekrar deneyin.`);
      return;
    }
    const u = users.find((x) => x.active && x.email.trim().toLocaleLowerCase("tr") === email.trim().toLocaleLowerCase("tr"));
    // Şifre doğrulama: kullanıcının parolası tanımlıysa eşleşmeli (boşsa demo kullanıcı — atlanır)
    const ok = !!u && (!u.password || u.password === password);
    if (!ok) {
      const f = fails + 1;
      setFails(f);
      setErr(f >= 3 ? `E-posta veya şifre hatalı. (${f}/5 deneme)` : "E-posta veya şifre hatalı.");
      if (f >= 5) { setLockUntil(Date.now() + 30000); setErr("Çok fazla hatalı deneme. 30 sn sonra tekrar deneyin."); }
      return;
    }
    setErr(""); setFails(0); setBusy(true);
    setCurrentUser(u.id);
    timer.current = window.setTimeout(login, 850);
  };
  // Hızlı giriş için örnek hesaplar (aktif kullanıcılar)
  const hesaplar = users.filter((u) => u.active).slice(0, 6);

  return (
    <div className="relative min-h-screen overflow-hidden bg-base text-ink">
      {/* ambient background for the whole screen (mobile + behind form) */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-0 h-80 w-80 rounded-full bg-neon-blue/15 blur-[120px] animate-drift-slow" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-neon-violet/15 blur-[120px] animate-drift-slower" />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:grid-cols-2">
        {/* Left: animated showcase */}
        <Showcase />

        {/* Right: login form */}
        <div className="flex items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-sm animate-rise">
            {/* brand (mobile) */}
            <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-neon-blue to-neon-violet text-xl font-bold text-white shadow-glow-blue animate-float lg:hidden">
                T
              </span>
              <h1 className="mt-4 text-2xl font-bold lg:mt-0">Tekrar hoş geldiniz 👋</h1>
              <p className="mt-1 text-sm text-muted">
                {justLoggedOut
                  ? "Oturumunuz kapatıldı — devam etmek için giriş yapın."
                  : "Yatırım & Emlak panelinize giriş yapın."}
              </p>
            </div>

            {/* glass card */}
            <form
              onSubmit={submit}
              className="relative space-y-4 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-card backdrop-blur-xl sm:p-7"
            >
              {/* top accent line */}
              <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neon-blue/60 to-transparent" />

              {justLoggedOut && (
                <div className="flex items-center gap-2 rounded-xl border border-good/30 bg-good/10 px-3 py-2 text-xs text-good animate-fade-in">
                  <ShieldCheck size={15} />
                  Oturum güvenli şekilde sonlandırıldı.
                </div>
              )}

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted">E-posta</span>
                <div className="group relative">
                  <Mail size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted transition group-focus-within:text-neon-blue" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-line bg-base/60 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-neon-blue/60 focus:ring-2 focus:ring-neon-blue/25"
                    autoComplete="username"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted">Şifre</span>
                <div className="group relative">
                  <Lock size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted transition group-focus-within:text-neon-blue" />
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-line bg-base/60 py-2.5 pl-9 pr-10 text-sm outline-none transition focus:border-neon-blue/60 focus:ring-2 focus:ring-neon-blue/25"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted transition hover:text-ink"
                    aria-label={showPass ? "Şifreyi gizle" : "Şifreyi göster"}
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </label>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-muted">
                  <input type="checkbox" defaultChecked className="accent-neon-blue" />
                  Beni hatırla
                </label>
                <a href="#" className="text-neon-blue transition hover:text-neon-emerald hover:underline">
                  Şifremi unuttum
                </a>
              </div>

              {err && (
                <div className="flex items-center gap-2 rounded-xl border border-critical/30 bg-critical/10 px-3 py-2 text-xs text-critical animate-fade-in">
                  <Lock size={14} /> {err}
                </div>
              )}

              {/* animated gradient button with shine sweep */}
              <button
                type="submit"
                disabled={busy || lockUntil > Date.now()}
                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-neon-blue via-neon-violet to-neon-blue bg-[length:200%_auto] py-3 text-sm font-semibold text-white shadow-glow-blue transition-all duration-500 hover:bg-[position:100%_0] hover:shadow-glow-violet disabled:opacity-70"
              >
                {/* shine */}
                <span className="pointer-events-none absolute inset-y-0 -left-full w-1/3 skew-x-12 bg-white/25 blur-md animate-shimmer" />
                {busy ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <LogIn size={16} />
                )}
                {busy ? "Giriş yapılıyor…" : "Giriş Yap"}
              </button>

              <p className="pt-1 text-center text-[11px] text-faint">
                Bir hesap seç, <span className="text-muted">Giriş Yap</span>'a dokun — o rolle girersin.
              </p>

              {/* Hızlı giriş — rollere göre hesaplar (normal kullanıcı / yönetici / personel vb.) */}
              <div className="mt-2 rounded-xl border border-line bg-base/40 p-2">
                <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-faint">Hızlı giriş · rol seç</p>
                <div className="max-h-44 space-y-1 overflow-y-auto">
                  {hesaplar.map((u) => {
                    const sel = email.trim().toLocaleLowerCase("tr") === u.email.toLocaleLowerCase("tr");
                    return (
                      <button type="button" key={u.id} onClick={() => setEmail(u.email)}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg border px-2 py-1.5 text-left transition hover:border-neon-blue/40 ${sel ? "border-neon-blue/50 bg-neon-blue/5" : "border-line bg-panel"}`}>
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-medium text-ink">{u.name}</span>
                          <span className="block truncate text-[10px] text-muted">{u.email}</span>
                        </span>
                        <span className="shrink-0 rounded-full bg-neon-blue/10 px-2 py-0.5 text-[10px] font-semibold text-neon-blue">{ROLE_LABELS[u.role]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </form>

            <p className="mt-6 text-center text-[11px] text-faint lg:text-left">
              Proje ve İş Yönetimi · Timay Platform
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
