import { useState } from "react";
import { X, Send, MessageSquare } from "lucide-react";
import { useUsers } from "@/context/UsersContext";
import { useModules } from "@/context/ModulesContext";
import { initials } from "@/components/messaging/MesajlasmaPanel";

const pad = (n: number) => String(n).padStart(2, "0");
const nowStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };

/** İçeriği (not / defter kaydı / rapor) seçilen kullanıcıya platform mesajı olarak gönderir. */
export default function MesajGonderModal({ baslik, icerik, onClose }: { baslik?: string; icerik: string; onClose: () => void }) {
  const { currentUser, users } = useUsers();
  const { addRecord } = useModules();
  const kisiler = users.filter((u) => u.name !== currentUser.name && u.active);
  const yoneticiler = kisiler.filter((u) => u.role === "owner" || u.role === "manager");
  const [alici, setAlici] = useState<string>(yoneticiler[0]?.name ?? kisiler[0]?.name ?? "");
  const [ek, setEk] = useState("");
  const [ok, setOk] = useState(false);

  const gonder = () => {
    if (!alici) return;
    const govde = `${ek.trim() ? ek.trim() + "\n\n" : ""}${baslik ? `📄 ${baslik}\n` : ""}${icerik}`;
    addRecord("mod-T-0087", { tarih: nowStr(), gonderen: currentUser.name, alici, mesaj: govde, okundu: false });
    setOk(true); window.setTimeout(onClose, 900);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-10 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-line bg-panel shadow-card animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ink"><MessageSquare size={15} className="text-neon-blue" /> Mesaj Olarak Gönder</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-elevated"><X size={16} /></button>
        </div>
        {ok ? (
          <div className="p-8 text-center text-sm font-medium text-good">✓ {alici} kişisine gönderildi</div>
        ) : (
          <div className="space-y-3 p-4">
            <label className="block"><span className="mb-1 block text-xs text-muted">Alıcı</span>
              <select value={alici} onChange={(e) => setAlici(e.target.value)} className="w-full rounded-lg border border-line bg-base/60 px-3 py-2 text-sm text-ink outline-none focus:border-neon-blue/50">
                {kisiler.length === 0 && <option value="">Kullanıcı yok</option>}
                {yoneticiler.length > 0 && <optgroup label="Yöneticiler">{yoneticiler.map((u) => <option key={u.id} value={u.name}>{u.name} ({initials(u.name)})</option>)}</optgroup>}
                <optgroup label="Tüm Kullanıcılar">{kisiler.map((u) => <option key={u.id} value={u.name}>{u.name} ({initials(u.name)})</option>)}</optgroup>
              </select></label>
            <label className="block"><span className="mb-1 block text-xs text-muted">Ek Not (opsiyonel)</span>
              <input value={ek} onChange={(e) => setEk(e.target.value)} placeholder="Mesajın başına eklenecek not…" className="w-full rounded-lg border border-line bg-base/60 px-3 py-2 text-sm text-ink outline-none focus:border-neon-blue/50" /></label>
            <div className="rounded-lg border border-line bg-base/40 p-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">Gönderilecek içerik</p>
              {baslik && <p className="text-[12px] font-semibold text-ink">{baslik}</p>}
              <p className="whitespace-pre-wrap break-words text-[12px] text-muted line-clamp-4">{icerik}</p>
            </div>
            <button onClick={gonder} disabled={!alici} className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-neon-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-neon-blue/90 disabled:opacity-40"><Send size={14} /> Gönder</button>
          </div>
        )}
      </div>
    </div>
  );
}
