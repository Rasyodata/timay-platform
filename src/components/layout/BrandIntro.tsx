import { useEffect, useMemo, useRef, useState } from "react";
import type { SyntheticEvent } from "react";
import { Radio, Clock } from "lucide-react";
import LoginScreen from "@/components/auth/LoginScreen";
import { useUsers } from "@/context/UsersContext";

/** "Ekranı Kapat" — Timay Platform ekran koruyucu / canlı komuta merkezi.
 *  Giriş sayfasının tamamını (sol canlı showcase + sağ karşılama paneli)
 *  gösterir; üstte canlı saat ve çevrimiçi ekip. Tıkla / fare / ESC → kapanır.
 *  Giriş ekranı yalnızca görseldir — etkileşimler kapatma olarak yakalanır. */
export default function BrandIntro({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { users } = useUsers();
  const [now, setNow] = useState(() => new Date());
  const readyRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    readyRef.current = false;
    const grace = setTimeout(() => { readyRef.current = true; }, 1200);
    const clock = setInterval(() => setNow(new Date()), 1000);
    const onKey = (e: KeyboardEvent) => { e.preventDefault(); onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { clearTimeout(grace); clearInterval(clock); window.removeEventListener("keydown", onKey); };
  }, [open, onClose]);

  const online = useMemo(() => users.filter((u) => u.active), [users]);

  if (!open) return null;

  // Giriş ekranı etkileşimlerini kapatma olarak yakala (gerçek giriş yapılmaz).
  const dismiss = (e: SyntheticEvent) => { e.preventDefault(); e.stopPropagation(); onClose(); };
  const onMove = () => { if (readyRef.current) onClose(); };

  const saat = now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const tarih = now.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div
      className="fixed inset-0 z-[120] overflow-hidden bg-base animate-[ekFade_.4s_ease]"
      onClickCapture={dismiss}
      onMouseDownCapture={dismiss}
      onMouseMove={onMove}
    >
      <style>{`@keyframes ekFade { from { opacity:0 } to { opacity:1 } }`}</style>

      {/* Giriş sayfasının tamamı — ekran koruyucu olarak */}
      <div className="pointer-events-none h-full w-full">
        <LoginScreen />
      </div>

      {/* Canlı komuta rozeti + saat + çevrimiçi ekip (üst bar, dekoratif) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-2 rounded-full border border-neon-blue/30 bg-neon-blue/10 px-3 py-1.5 text-xs font-semibold text-neon-blue backdrop-blur">
          <Radio size={14} className="animate-pulse" /> CANLI KOMUTA MERKEZİ
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-line bg-panel/70 px-3 py-1.5 backdrop-blur sm:flex">
            <span className="flex -space-x-2">
              {online.slice(0, 5).map((u) => (
                <span key={u.id} className="grid h-6 w-6 place-items-center rounded-full border-2 border-base bg-gradient-to-br from-neon-blue to-neon-violet text-[10px] font-bold text-white">{u.name.charAt(0)}</span>
              ))}
            </span>
            <span className="flex items-center gap-1.5 text-xs font-medium text-ink">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-good" />{online.length} kişi çevrimiçi
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-line bg-panel/70 px-3 py-1.5 backdrop-blur">
            <Clock size={15} className="text-muted" />
            <div className="text-right">
              <p className="nums text-sm font-bold leading-none text-ink tabular-nums">{saat}</p>
              <p className="text-[10px] capitalize leading-tight text-muted">{tarih}</p>
            </div>
          </div>
        </div>
      </div>

      <p className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-[11px] text-muted">
        Ekran koruyucu · ekrana dokun · fareyi oynat · ESC ile devam et
      </p>
    </div>
  );
}
