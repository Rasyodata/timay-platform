import { useMemo, useState } from "react";
import { MessageSquare, Send, Search, Circle } from "lucide-react";
import { useUsers } from "@/context/UsersContext";
import { useModules } from "@/context/ModulesContext";

const MOD = "mod-T-0087";
const pad = (n: number) => String(n).padStart(2, "0");
const now = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const saat = (t: string) => (t || "").slice(11, 16);
const gun = (t: string) => { const d = (t || "").slice(0, 10); return d ? d.split("-").reverse().join(".") : ""; };

interface Msg { id: string; tarih: string; gonderen: string; alici: string; mesaj: string; okundu?: boolean }

export default function MesajlasmaPanel() {
  const { currentUser, users } = useUsers();
  const { getModule, addRecord, updateRecord } = useModules();
  const me = currentUser.name;
  const msgs = (getModule(MOD)?.records ?? []) as unknown as Msg[];
  const kisiler = users.filter((u) => u.name !== me && u.active);
  const [sel, setSel] = useState<string>(kisiler[0]?.name ?? "");
  const [q, setQ] = useState("");
  const [text, setText] = useState("");

  // Seçili kişiyle olan sohbet
  const konusma = useMemo(
    () => msgs.filter((m) => (m.gonderen === me && m.alici === sel) || (m.gonderen === sel && m.alici === me))
      .sort((a, b) => String(a.tarih).localeCompare(String(b.tarih))),
    [msgs, me, sel],
  );
  // Kişi başına okunmamış (bana gelen) sayısı
  const unread = (ad: string) => msgs.filter((m) => m.gonderen === ad && m.alici === me && !m.okundu).length;
  const sonMesaj = (ad: string) => {
    const list = msgs.filter((m) => (m.gonderen === me && m.alici === ad) || (m.gonderen === ad && m.alici === me));
    return list.sort((a, b) => String(b.tarih).localeCompare(String(a.tarih)))[0];
  };

  const gonder = () => {
    const t = text.trim();
    if (!t || !sel) return;
    addRecord(MOD, { tarih: now(), gonderen: me, alici: sel, mesaj: t, okundu: false });
    setText("");
  };
  const acKisi = (ad: string) => {
    setSel(ad);
    // Bu kişiden bana gelen okunmamışları okundu yap
    msgs.filter((m) => m.gonderen === ad && m.alici === me && !m.okundu).forEach((m) => updateRecord(MOD, m.id, { okundu: true }));
  };

  const filtKisiler = q.trim() ? kisiler.filter((u) => u.name.toLocaleLowerCase("tr").includes(q.toLocaleLowerCase("tr"))) : kisiler;

  return (
    <div className="mx-auto max-w-[1200px] p-4 md:p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-neon-blue/10 text-neon-blue"><MessageSquare size={20} /></span>
        <div>
          <h1 className="text-xl font-bold text-ink">Mesajlar</h1>
          <p className="text-xs text-muted">Platform içi mesajlaşma · kullanıcılar birbirine mesaj atar · kayıtlar denetim için tutulur</p>
        </div>
      </div>

      <div className="grid h-[70vh] grid-cols-1 overflow-hidden rounded-2xl border border-line bg-panel md:grid-cols-[260px_1fr]">
        {/* Kişiler */}
        <div className="flex flex-col border-r border-line">
          <div className="relative border-b border-line p-2">
            <Search size={14} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Kişi ara…" className="w-full rounded-lg border border-line bg-base/50 py-1.5 pl-8 pr-2 text-sm text-ink outline-none focus:border-neon-blue/40" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtKisiler.length === 0 && <p className="p-4 text-center text-xs text-faint">Başka kullanıcı yok.</p>}
            {filtKisiler.map((u) => { const son = sonMesaj(u.name); const n = unread(u.name); return (
              <button key={u.id} onClick={() => acKisi(u.name)} className={`flex w-full items-center gap-2.5 border-b border-line/60 px-3 py-2.5 text-left transition hover:bg-elevated ${sel === u.name ? "bg-neon-blue/5" : ""}`}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-neon-blue/10 text-sm font-bold text-neon-blue">{u.name.slice(0, 2).toLocaleUpperCase("tr")}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-1"><span className="truncate text-sm font-medium text-ink">{u.name}</span>{son && <span className="shrink-0 text-[10px] text-faint">{saat(son.tarih)}</span>}</span>
                  <span className="block truncate text-[11px] text-muted">{son ? `${son.gonderen === me ? "Siz: " : ""}${son.mesaj}` : "—"}</span>
                </span>
                {n > 0 && <span className="grid h-5 min-w-[20px] shrink-0 place-items-center rounded-full bg-neon-blue px-1 text-[10px] font-bold text-white">{n}</span>}
              </button>
            ); })}
          </div>
        </div>

        {/* Sohbet */}
        <div className="flex flex-col">
          {sel ? (
            <>
              <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-neon-blue/10 text-xs font-bold text-neon-blue">{sel.slice(0, 2).toLocaleUpperCase("tr")}</span>
                <span className="text-sm font-semibold text-ink">{sel}</span>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto bg-base/30 p-4">
                {konusma.length === 0 && <p className="mt-10 text-center text-sm text-faint">Henüz mesaj yok — ilk mesajı siz yazın.</p>}
                {konusma.map((m, i) => { const mine = m.gonderen === me; const prev = konusma[i - 1];
                  const yeniGun = !prev || gun(prev.tarih) !== gun(m.tarih);
                  return (
                    <div key={m.id}>
                      {yeniGun && <div className="my-2 text-center"><span className="rounded-full bg-elevated px-2 py-0.5 text-[10px] text-muted">{gun(m.tarih)}</span></div>}
                      <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-3 py-1.5 text-sm ${mine ? "rounded-br-sm bg-neon-blue text-white" : "rounded-bl-sm bg-panel text-ink shadow-sm"}`}>
                          <p className="whitespace-pre-wrap break-words">{m.mesaj}</p>
                          <p className={`mt-0.5 text-right text-[9px] ${mine ? "text-white/60" : "text-faint"}`}>{saat(m.tarih)}{mine && m.okundu ? " ✓✓" : mine ? " ✓" : ""}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 border-t border-line p-3">
                <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); gonder(); } }}
                  placeholder={`${sel} kişisine mesaj yaz…`} className="flex-1 rounded-full border border-line bg-base/50 px-4 py-2 text-sm text-ink outline-none focus:border-neon-blue/50" />
                <button onClick={gonder} disabled={!text.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-neon-blue text-white transition hover:bg-neon-blue/90 disabled:opacity-40"><Send size={16} /></button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center text-muted">
              <Circle size={28} className="mb-2 text-faint" /><p className="text-sm">Soldan bir kişi seçin.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
