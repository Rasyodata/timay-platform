import { useEffect, useMemo, useRef, useState } from "react";
import { X, Radio, Clock } from "lucide-react";
import { Showcase } from "@/components/auth/LoginScreen";
import { useAudit } from "@/context/AuditContext";
import { useUsers } from "@/context/UsersContext";

/** "Ekranı Kapat" — Timay Platform canlı komuta merkezi / ekran koruyucu.
 *  Giriş ekranının canlı paneli (piyasa + istatistik) + canlı saat, çevrimiçi
 *  ekip ve gerçek aksiyon akışı. Tıkla / ESC / fare oynat ile kapanır. */
export default function BrandIntro({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { entries } = useAudit();
  const { users } = useUsers();
  const [now, setNow] = useState(() => new Date());
  const readyRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    readyRef.current = false;
    const grace = setTimeout(() => { readyRef.current = true; }, 1200);
    const clock = setInterval(() => setNow(new Date()), 1000);
    const close = () => onClose();
    const onKey = (e: KeyboardEvent) => { e.preventDefault(); close(); };
    const onMove = () => { if (readyRef.current) close(); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousemove", onMove);
    return () => {
      clearTimeout(grace); clearInterval(clock);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousemove", onMove);
    };
  }, [open, onClose]);

  const online = useMemo(() => users.filter((u) => u.active), [users]);
  const feed = useMemo(() => {
    const list = [...entries].slice(0, 14);
    return list.length ? list : [{ id: "x", at: now.toISOString(), actor: "Timay", action: "Platform hazır", target: "", category: "modul" } as (typeof entries)[number]];
  }, [entries]);

  if (!open) return null;

  const saat = now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const tarih = now.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div onClick={onClose} className="fixed inset-0 z-[120] flex flex-col overflow-hidden bg-[#070B1A] animate-[fadeIn_.4s_ease]">
      <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes tmyMarquee { from { transform:translateX(0) } to { transform:translateX(-50%) } }
      `}</style>

      {/* Üst bar: marka + canlı saat + çevrimiçi ekip */}
      <div className="relative z-10 flex shrink-0 items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-2 rounded-full border border-neon-blue/30 bg-neon-blue/10 px-3 py-1.5 text-xs font-semibold text-neon-blue">
          <Radio size={14} className="animate-pulse" /> CANLI KOMUTA MERKEZİ
        </div>
        <div className="flex items-center gap-4">
          {/* çevrimiçi ekip */}
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 sm:flex">
            <span className="flex -space-x-2">
              {online.slice(0, 5).map((u) => (
                <span key={u.id} title={u.name} className="grid h-6 w-6 place-items-center rounded-full border-2 border-[#070B1A] bg-gradient-to-br from-neon-blue to-neon-violet text-[10px] font-bold text-white">
                  {u.name.charAt(0)}
                </span>
              ))}
            </span>
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              {online.length} kişi çevrimiçi
            </span>
          </div>
          {/* saat */}
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-right">
            <Clock size={15} className="text-slate-400" />
            <div>
              <p className="nums text-sm font-bold leading-none text-white tabular-nums">{saat}</p>
              <p className="text-[10px] capitalize leading-tight text-slate-400">{tarih}</p>
            </div>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white" title="Kapat (ESC)">
            <X size={17} />
          </button>
        </div>
      </div>

      {/* Ana panel — giriş ekranının canlı showcase'i */}
      <div className="relative min-h-0 flex-1" onClick={(e) => e.stopPropagation()}>
        <Showcase screensaver />
      </div>

      {/* Alt: canlı aksiyon akışı (audit) */}
      <div className="relative z-10 shrink-0 border-t border-white/10 bg-black/30 py-2.5 backdrop-blur">
        <div className="flex items-center gap-3 px-6">
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Canlı Aksiyon
          </span>
          <div className="relative flex-1 overflow-hidden">
            <div className="flex w-max gap-8 whitespace-nowrap" style={{ animation: "tmyMarquee 40s linear infinite" }}>
              {[...feed, ...feed].map((e, i) => (
                <span key={e.id + "-" + i} className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="h-1 w-1 rounded-full bg-neon-blue" />
                  <span className="font-semibold text-white">{e.actor}</span>
                  <span className="text-slate-400">{e.action}</span>
                  {e.target && <span className="text-slate-500">· {e.target}</span>}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="relative z-10 shrink-0 pb-3 text-center text-[11px] text-slate-500">herhangi bir yere tıkla · fareyi oynat · ESC ile ekranı aç</p>
    </div>
  );
}
