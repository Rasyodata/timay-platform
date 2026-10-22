import { useEffect, useMemo, useState } from "react";
import { MessageSquare, Send, Search, Circle, StickyNote, Bell } from "lucide-react";
import { useUsers } from "@/context/UsersContext";
import { useModules } from "@/context/ModulesContext";

const MOD = "mod-T-0087";
const PRESENCE_KEY = "timay.presence.v1";
const ONLINE_MS = 120000;
const pad = (n: number) => String(n).padStart(2, "0");
const nowStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const saat = (t: string) => (t || "").slice(11, 16);
const gun = (t: string) => { const d = (t || "").slice(0, 10); return d ? d.split("-").reverse().join(".") : ""; };

// Ad Soyad → baş harfler (Tuğba Yörük → TY, Kadir Fırat → KF)
export const initials = (ad: string) => (ad || "").trim().split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toLocaleUpperCase("tr") || "?";

type MsgTur = "Mesaj" | "Not" | "Hatırlatma";
interface Msg { id: string; tarih: string; gonderen: string; alici: string; mesaj: string; okundu?: boolean }

function Avatar({ ad, size = 36, online }: { ad: string; size?: number; online?: boolean }) {
  return (
    <span className="relative inline-grid shrink-0 place-items-center rounded-full bg-neon-blue/10 font-bold text-neon-blue" style={{ height: size, width: size, fontSize: size * 0.36 }}>
      {initials(ad)}
      {online !== undefined && <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-panel ${online ? "bg-good" : "bg-ink/25"}`} />}
    </span>
  );
}

export default function MesajlasmaPanel() {
  const { currentUser, users } = useUsers();
  const { getModule, addRecord, updateRecord } = useModules();
  const me = currentUser.name;
  const msgs = (getModule(MOD)?.records ?? []) as unknown as Msg[];
  const kisiler = users.filter((u) => u.name !== me && u.active);
  const [sel, setSel] = useState<string>(kisiler[0]?.name ?? "");
  const [q, setQ] = useState("");
  const [text, setText] = useState("");
  const [tur, setTur] = useState<MsgTur>("Mesaj");
  const [tick, setTick] = useState(0);

  // Varlık (presence): kendi damgamı düzenli güncelle; 2 dk içinde görülen = çevrimiçi
  useEffect(() => {
    const beat = () => { try { const p = JSON.parse(localStorage.getItem(PRESENCE_KEY) || "{}"); p[me] = Date.now(); localStorage.setItem(PRESENCE_KEY, JSON.stringify(p)); } catch { /* yoksay */ } setTick((t) => t + 1); };
    beat();
    const id = window.setInterval(beat, 30000);
    return () => window.clearInterval(id);
  }, [me]);
  const presence: Record<string, number> = useMemo(() => { try { return JSON.parse(localStorage.getItem(PRESENCE_KEY) || "{}"); } catch { return {}; } }, [tick]);
  const isOnline = (ad: string) => ad === me || (presence[ad] ? Date.now() - presence[ad] < ONLINE_MS : false);
  const online = users.filter((u) => u.active && isOnline(u.name));
  const offline = users.filter((u) => u.active && !isOnline(u.name));

  const konusma = useMemo(
    () => msgs.filter((m) => (m.gonderen === me && m.alici === sel) || (m.gonderen === sel && m.alici === me))
      .sort((a, b) => String(a.tarih).localeCompare(String(b.tarih))),
    [msgs, me, sel],
  );
  const unread = (ad: string) => msgs.filter((m) => m.gonderen === ad && m.alici === me && !m.okundu).length;
  const sonMesaj = (ad: string) => msgs.filter((m) => (m.gonderen === me && m.alici === ad) || (m.gonderen === ad && m.alici === me)).sort((a, b) => String(b.tarih).localeCompare(String(a.tarih)))[0];

  const gonder = () => {
    const t = text.trim();
    if (!t || !sel) return;
    const etiket = tur === "Not" ? `📝 Not: ${t}` : tur === "Hatırlatma" ? `🔔 Hatırlatma: ${t}` : t;
    addRecord(MOD, { tarih: nowStr(), gonderen: me, alici: sel, mesaj: etiket, okundu: false });
    // Not / Hatırlatma → alıcının paneline (ajanda/notlar) işlenir
    if (tur === "Not") addRecord("mod-T-0068", { baslik: t, icerik: `${me} → ${sel}: ${t}`, renk: "Mavi", tarih: today(), sorumlu: sel });
    if (tur === "Hatırlatma") addRecord("mod-T-0057", { baslik: `🔔 ${t}`, kategori: "Hatırlatma", tarih: today(), durum: "Yapılacak", sorumlu: sel, not: `${me} tarafından gönderildi` });
    setText(""); setTur("Mesaj");
  };
  const acKisi = (ad: string) => {
    setSel(ad);
    msgs.filter((m) => m.gonderen === ad && m.alici === me && !m.okundu).forEach((m) => updateRecord(MOD, m.id, { okundu: true }));
  };

  const filtKisiler = q.trim() ? kisiler.filter((u) => u.name.toLocaleLowerCase("tr").includes(q.toLocaleLowerCase("tr"))) : kisiler;
  const turMeta: Record<MsgTur, { ph: string; hint: string }> = {
    Mesaj: { ph: "mesaj yaz…", hint: "" },
    Not: { ph: "not yaz… (alıcının notlarına & ajandasına düşer)", hint: "Not alıcının paneline işlenir" },
    Hatırlatma: { ph: "hatırlatma yaz… (alıcının ajandasına düşer)", hint: "Hatırlatma alıcının ajandasına düşer" },
  };

  return (
    <div className="mx-auto max-w-[1200px] p-4 md:p-6">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-neon-blue/10 text-neon-blue"><MessageSquare size={20} /></span>
        <div>
          <h1 className="text-xl font-bold text-ink">Mesaj Yönetimi</h1>
          <p className="text-xs text-muted">Platform içi mesajlaşma · not & hatırlatma gönder · kayıtlar denetim için tutulur</p>
        </div>
      </div>

      {/* Çevrimiçi / Çevrimdışı kullanıcı barı */}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line bg-panel px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-good"><span className="h-2 w-2 rounded-full bg-good" /> Çevrimiçi ({online.length})</span>
          <div className="flex flex-wrap gap-1">
            {online.map((u) => (
              <button key={u.id} onClick={() => u.name !== me && acKisi(u.name)} title={u.name} className="flex items-center gap-1 rounded-full border border-good/30 bg-good/5 py-0.5 pl-0.5 pr-2 transition hover:border-good/60">
                <Avatar ad={u.name} size={22} /><span className="text-[11px] text-ink">{u.name === me ? "Siz" : u.name}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted"><span className="h-2 w-2 rounded-full bg-ink/25" /> Çevrimdışı ({offline.length})</span>
          <div className="flex flex-wrap gap-1">
            {offline.slice(0, 12).map((u) => (
              <button key={u.id} onClick={() => acKisi(u.name)} title={u.name} className="flex items-center gap-1 rounded-full border border-line py-0.5 pl-0.5 pr-2 opacity-70 transition hover:opacity-100">
                <Avatar ad={u.name} size={22} /><span className="text-[11px] text-muted">{u.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid h-[64vh] grid-cols-1 overflow-hidden rounded-2xl border border-line bg-panel md:grid-cols-[260px_1fr]">
        {/* Kişiler */}
        <div className="flex flex-col border-r border-line">
          <div className="relative border-b border-line p-2">
            <Search size={14} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Kullanıcı ara…" className="w-full rounded-lg border border-line bg-base/50 py-1.5 pl-8 pr-2 text-sm text-ink outline-none focus:border-neon-blue/40" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtKisiler.length === 0 && <p className="p-4 text-center text-xs text-faint">Başka kullanıcı yok.</p>}
            {filtKisiler.map((u) => { const son = sonMesaj(u.name); const n = unread(u.name); return (
              <button key={u.id} onClick={() => acKisi(u.name)} className={`flex w-full items-center gap-2.5 border-b border-line/60 px-3 py-2.5 text-left transition hover:bg-elevated ${sel === u.name ? "bg-neon-blue/5" : ""}`}>
                <Avatar ad={u.name} size={36} online={isOnline(u.name)} />
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
                <Avatar ad={sel} size={32} online={isOnline(sel)} />
                <span className="text-sm font-semibold text-ink">{sel}</span>
                <span className={`text-[11px] ${isOnline(sel) ? "text-good" : "text-faint"}`}>{isOnline(sel) ? "çevrimiçi" : "çevrimdışı"}</span>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto bg-base/30 p-4">
                {konusma.length === 0 && <p className="mt-10 text-center text-sm text-faint">Henüz mesaj yok — ilk mesajı siz yazın.</p>}
                {konusma.map((m, i) => { const mine = m.gonderen === me; const prev = konusma[i - 1]; const yeniGun = !prev || gun(prev.tarih) !== gun(m.tarih);
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
              {turMeta[tur].hint && <p className="px-3 pt-2 text-[11px] text-neon-blue">ⓘ {turMeta[tur].hint}</p>}
              <div className="flex items-center gap-2 border-t border-line p-3">
                <select value={tur} onChange={(e) => setTur(e.target.value as MsgTur)} className="shrink-0 rounded-lg border border-line bg-base/50 px-2 py-2 text-xs text-ink outline-none focus:border-neon-blue/50">
                  <option value="Mesaj">💬 Mesaj</option><option value="Not">📝 Not</option><option value="Hatırlatma">🔔 Hatırlatma</option>
                </select>
                <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); gonder(); } }}
                  placeholder={`${sel} kişisine ${turMeta[tur].ph}`} className="flex-1 rounded-full border border-line bg-base/50 px-4 py-2 text-sm text-ink outline-none focus:border-neon-blue/50" />
                <button onClick={gonder} disabled={!text.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-neon-blue text-white transition hover:bg-neon-blue/90 disabled:opacity-40">{tur === "Not" ? <StickyNote size={16} /> : tur === "Hatırlatma" ? <Bell size={16} /> : <Send size={16} />}</button>
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
