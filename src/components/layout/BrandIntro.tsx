import { useEffect, useState } from "react";
import { ArrowRight, Sparkles, X } from "lucide-react";

/** Timay Platform markalı animasyonlu giriş/tanıtım ekranı.
 *  Sol üstteki logo parıltısına basınca açılır; ESC / tıklama ile kapanır. */
export default function BrandIntro({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (open) {
      // bir sonraki frame'de animasyonu tetikle
      const t = setTimeout(() => setShow(true), 20);
      return () => clearTimeout(t);
    }
    setShow(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const stats = [
    { k: "6", v: "Yönetim Modülü" },
    { k: "A→Z", v: "Muhasebe Merkezi" },
    { k: "RBAC", v: "Yetki Kontrolü" },
    { k: "7/24", v: "Tek Platform" },
  ];

  return (
    <div
      onClick={onClose}
      className={`fixed inset-0 z-[120] flex items-center justify-center overflow-hidden bg-[#070B1A] transition-opacity duration-500 ${show ? "opacity-100" : "opacity-0"}`}
    >
      <style>{`
        @keyframes tmyRise { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes tmyPop { 0% { opacity:0; transform:scale(.4) rotate(-12deg); } 60% { transform:scale(1.12) rotate(4deg); } 100% { opacity:1; transform:scale(1) rotate(0); } }
        @keyframes tmyFloat { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-18px); } }
        @keyframes tmyGrow { from { transform:scaleX(0); } to { transform:scaleX(1); } }
        @keyframes tmyOrb { 0%,100% { transform:translate(0,0) scale(1); } 50% { transform:translate(30px,-24px) scale(1.15); } }
        @keyframes tmyRing { 0% { transform:scale(.6); opacity:.6; } 100% { transform:scale(2.4); opacity:0; } }
        @keyframes tmySpin { to { transform:rotate(360deg); } }
        .tmy-rise { animation: tmyRise .7s cubic-bezier(.2,.7,.2,1) both; }
        .tmy-pop { animation: tmyPop .9s cubic-bezier(.18,.8,.25,1) both; }
      `}</style>

      {/* Arka plan parıltı orb'ları */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-[#2E6BFF]/25 blur-3xl" style={{ animation: "tmyOrb 9s ease-in-out infinite" }} />
      <div className="pointer-events-none absolute -bottom-32 -right-16 h-[28rem] w-[28rem] rounded-full bg-[#7C3AED]/20 blur-3xl" style={{ animation: "tmyOrb 11s ease-in-out infinite reverse" }} />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-[#10B981]/15 blur-3xl" style={{ animation: "tmyOrb 13s ease-in-out infinite" }} />

      {/* Kapat */}
      <button onClick={onClose} className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white" title="Kapat (ESC)">
        <X size={18} />
      </button>

      <div onClick={(e) => e.stopPropagation()} className="relative flex max-w-2xl flex-col items-center px-6 text-center">
        {/* Logo rozeti + halka dalgaları */}
        <div className="relative mb-7" style={{ animation: "tmyFloat 5s ease-in-out infinite" }}>
          <span className="absolute inset-0 rounded-[26px] border-2 border-[#2E6BFF]/50" style={{ animation: "tmyRing 2.6s ease-out infinite" }} />
          <span className="absolute inset-0 rounded-[26px] border-2 border-[#7C3AED]/40" style={{ animation: "tmyRing 2.6s ease-out infinite 1.3s" }} />
          <span className="tmy-pop relative grid h-28 w-28 place-items-center rounded-[26px] bg-gradient-to-br from-[#2E6BFF] to-[#7C3AED] text-4xl font-black text-white shadow-[0_0_60px_rgba(46,107,255,.6)]">
            iP
            <Sparkles size={18} className="absolute -right-1 -top-1 text-amber-300" style={{ animation: "tmySpin 6s linear infinite" }} />
          </span>
        </div>

        <h1 className="tmy-rise bg-gradient-to-r from-white via-sky-200 to-violet-300 bg-clip-text text-5xl font-black tracking-tight text-transparent md:text-6xl" style={{ animationDelay: ".15s" }}>
          Timay Platform
        </h1>
        <p className="tmy-rise mt-3 text-lg font-medium text-slate-300 md:text-xl" style={{ animationDelay: ".3s" }}>
          Tek platform — tüm işletme. Proje, muhasebe, büro ve daha fazlası.
        </p>
        <div className="mt-4 h-1 w-40 origin-left rounded-full bg-gradient-to-r from-[#2E6BFF] to-[#7C3AED]" style={{ animation: "tmyGrow .8s ease-out .5s both" }} />

        {/* İstatistik çipleri */}
        <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s, i) => (
            <div key={s.v} className="tmy-rise rounded-2xl border border-white/10 bg-white/[.04] px-4 py-3 backdrop-blur" style={{ animationDelay: `${0.6 + i * 0.12}s` }}>
              <p className="bg-gradient-to-r from-sky-300 to-violet-300 bg-clip-text text-2xl font-black text-transparent">{s.k}</p>
              <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">{s.v}</p>
            </div>
          ))}
        </div>

        <button onClick={onClose} className="tmy-rise mt-10 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#2E6BFF] to-[#7C3AED] px-7 py-3 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(46,107,255,.45)] transition hover:scale-105" style={{ animationDelay: "1.1s" }}>
          Platforma Gir <ArrowRight size={16} />
        </button>
        <p className="tmy-rise mt-4 text-xs text-slate-500" style={{ animationDelay: "1.25s" }}>herhangi bir yere tıkla ya da ESC ile kapat</p>
      </div>
    </div>
  );
}
