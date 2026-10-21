import { useState, useRef } from "react";
import {
  CheckSquare, Square, Droplet, Smile, Meh, Frown, Pill, ChevronLeft, ChevronRight,
  Plus, BookOpen, Send, FileText, X, Trash2, CheckCircle2,
} from "lucide-react";
import { useModules } from "@/context/ModulesContext";
import { RecordForm } from "@/components/projects/ProjectTableCard";
import TalepForm from "@/components/requests/TalepForm";
import type { DynamicRecord } from "@/types/modules";
import type { View } from "@/App";

const HAND = "'Patrick Hand', 'Comic Sans MS', ui-rounded, cursive";
const TR_AY = ["OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN", "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK"];
const TR_AY_K = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const TR_GUN_UZUN = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
const AY_GUN = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];
const ONE = 86400000;
const pad = (n: number) => String(n).padStart(2, "0");
const dstr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Kayıt tipi → renk + kısa etiket (defterde ne olduğunu göster)
const TIP: Record<string, { renk: string; kisa: string }> = {
  "Görev": { renk: "#1E7A46", kisa: "GÖREV" },
  "Etkinlik": { renk: "#0d9488", kisa: "ETKİNLİK" },
  "Not": { renk: "#CA8A04", kisa: "NOT" },
  "Tutanak": { renk: "#7C3AED", kisa: "TUTANAK" },
};

// Hızlı İşlemler — ilgili tabloya yerinde kayıt açar (sağ panelde; deftere sürüklenebilir)
const SEKMELER: { label: string; renk: string; addMod: string; defaults?: Record<string, unknown> }[] = [
  { label: "Yaz", renk: "#2563EB", addMod: "YAZ" },
  { label: "Görev", renk: "#2E8B74", addMod: "mod-T-0057" },
  { label: "Etkinlik", renk: "#0d9488", addMod: "mod-T-0060" },
  { label: "Görüşme", renk: "#0E7490", addMod: "mod-T-0060", defaults: { tur: "Görüşme" } },
  { label: "Not", renk: "#C96A86", addMod: "mod-T-0068" },
  { label: "Fikir", renk: "#CA8A04", addMod: "mod-T-0066" },
  { label: "Tutanak", renk: "#5B8DB8", addMod: "mod-T-0063" },
  { label: "İlaç", renk: "#9333EA", addMod: "mod-T-0057", defaults: { baslik: "İlaç — " } },
  { label: "Dosya", renk: "#D9B44A", addMod: "mod-T-0067" },
  { label: "Talep", renk: "#B5731A", addMod: "TALEP" },
];

export default function TimayPlanlayici({ onNavigate }: { onNavigate?: (v: View) => void }) {
  const { getModule, addRecord, deleteRecord } = useModules();
  const recs = (id: string) => (getModule(id)?.records ?? []) as DynamicRecord[];
  const [cur, setCur] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); });
  const [su, setSu] = useState(4);
  const [ruh, setRuh] = useState(0);
  const [meds, setMeds] = useState<string[]>(["Sabah ilacı", "Akşam ilacı"]);
  const [ilac, setIlac] = useState<Record<string, boolean>>({});
  const [ilacInput, setIlacInput] = useState("");
  const [addModal, setAddModal] = useState<{ modId: string; baslik: string; defaults?: Record<string, unknown>; rec?: DynamicRecord } | null>(null);
  const [noteText, setNoteText] = useState("");
  const [dragSek, setDragSek] = useState<string | null>(null);
  const noteRef = useRef<HTMLInputElement>(null);

  const curDate = new Date(cur);
  const curStr = dstr(curDate);
  const td = dstr(new Date());
  const y = curDate.getFullYear(), mo = curDate.getMonth();
  const firstDow = (new Date(y, mo, 1).getDay() + 6) % 7;
  const dim = new Date(y, mo + 1, 0).getDate();
  const miniCells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)];

  // GÜNÜN DEFTERİ — seçili güne düşen tüm hareketler (görev / etkinlik / not / tutanak)
  const dayDefter = [
    ...recs("mod-T-0057").filter((r) => String(r.tarih) === curStr).map((r) => ({ id: "g" + r.id, modId: "mod-T-0057", rec: r, tip: "Görev", title: String(r.baslik), time: String(r.saat || "") })),
    ...recs("mod-T-0060").filter((r) => String(r.tarih) === curStr).map((r) => ({ id: "e" + r.id, modId: "mod-T-0060", rec: r, tip: "Etkinlik", title: String(r.baslik), time: String(r.baslangic_saat || "") })),
    ...recs("mod-T-0068").filter((r) => r.arsiv !== true && String(r.tarih) === curStr).map((r) => ({ id: "n" + r.id, modId: "mod-T-0068", rec: r, tip: "Not", title: String(r.baslik || r.icerik || ""), time: "" })),
    ...recs("mod-T-0063").filter((r) => String(r.tarih) === curStr).map((r) => ({ id: "t" + r.id, modId: "mod-T-0063", rec: r, tip: "Tutanak", title: String(r.toplanti || ""), time: String(r.saat || "") })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  const nav = (d: number) => setCur((c) => c + d * ONE);
  const bugun = () => { const d = new Date(); d.setHours(0, 0, 0, 0); setCur(d.getTime()); };

  // Hızlı İşlem — ilgili tabloya kayıt aç (seçili güne). "Yaz" → deftere not yaz alanına odaklan
  const addSekme = (s: typeof SEKMELER[number]) => {
    if (s.addMod === "YAZ") { noteRef.current?.focus(); noteRef.current?.scrollIntoView({ block: "center" }); return; }
    const base = s.addMod === "mod-T-0068" ? { renk: "Sarı", tarih: curStr } : { tarih: curStr };
    setAddModal({ modId: s.addMod, baslik: s.label, defaults: { ...base, ...(s.defaults ?? {}) } });
  };
  // Deftere hızlı not (T-0068) — seçili güne yazılır, defterde "NOT" olarak çıkar
  const saveNote = () => { const t = noteText.trim(); if (!t) return; addRecord("mod-T-0068", { baslik: t, renk: "Sarı", tarih: curStr }); setNoteText(""); };
  // Kullanıcı kendi kaydını silebilir
  const silDefter = (it: (typeof dayDefter)[number]) => deleteRecord(it.modId, String(it.rec.id));
  // Onaya gönder — T-0045 onay kaydı oluştur, kaynağı defterden kaldır (Takvim/Ajanda/Tutanak'ta görünmez)
  const onayaGonder = (it: (typeof dayDefter)[number]) => {
    addRecord("mod-T-0045", { konu: it.title, tarih: curStr, durum: "Bekliyor", aciklama: `${TIP[it.tip].kisa} · ${it.title}` });
    deleteRecord(it.modId, String(it.rec.id));
  };

  const Card = ({ title, icon: Icon, renk, children }: { title: string; icon: typeof Droplet; renk: string; children: React.ReactNode }) => (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-white/70">
      <div className="flex items-center justify-between gap-2 px-3 py-1.5" style={{ background: renk }}>
        <span className="flex items-center gap-1.5 text-[12px] font-bold tracking-wide text-ink"><Icon size={13} /> {title}</span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );

  const ilacDone = meds.filter((v) => ilac[curStr + v]).length;
  const addIlac = () => { const t = ilacInput.trim(); if (!t) return; setMeds((p) => [...p, t]); setIlacInput(""); };

  // Defteri ikiye böl (iki sayfa)
  const mid = Math.ceil(dayDefter.length / 2);
  const leftCol = dayDefter.slice(0, mid), rightCol = dayDefter.slice(mid);
  const rowEl = (it: (typeof dayDefter)[number]) => { const m = TIP[it.tip]; return (
    <div key={it.id} className="group flex w-full items-center gap-2" style={{ height: 34 }}>
      <button onClick={() => setAddModal({ modId: it.modId, baslik: it.tip, rec: it.rec })} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <span className="w-16 shrink-0 rounded px-1 py-0.5 text-center text-[8px] font-bold tracking-wide" style={{ background: `${m.renk}1f`, color: m.renk }}>{m.kisa}</span>
        {it.time ? <span className="w-10 shrink-0 text-[11px] text-ink/45 nums">{it.time}</span> : <span className="w-10 shrink-0" />}
        <span className="flex-1 truncate text-[14px] text-ink/85">{it.title}</span>
      </button>
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
        <button onClick={() => onayaGonder(it)} title="Onaya gönder" className="grid h-6 w-6 place-items-center rounded text-ink/40 transition hover:bg-neon-blue/10 hover:text-neon-blue"><CheckCircle2 size={14} /></button>
        <button onClick={() => silDefter(it)} title="Sil" className="grid h-6 w-6 place-items-center rounded text-ink/40 transition hover:bg-critical/10 hover:text-critical"><Trash2 size={14} /></button>
      </div>
    </div>
  ); };

  return (
    <div className="mx-auto max-w-[1600px] p-3 md:p-5" style={{ fontFamily: HAND }}>
      {/* Tarih seçici */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button onClick={bugun} className="rounded-lg border border-line bg-panel px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-elevated" style={{ fontFamily: "inherit" }}>Bugün</button>
        <button onClick={() => nav(-1)} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted hover:bg-elevated"><ChevronLeft size={16} /></button>
        <button onClick={() => nav(1)} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted hover:bg-elevated"><ChevronRight size={16} /></button>
        <span className="ml-1 text-base font-bold text-ink">{curDate.getDate()} {TR_AY_K[mo]} {y} · {TR_GUN_UZUN[(curDate.getDay() + 6) % 7]}</span>
        <span className="rounded-md border border-line bg-base/60 px-1.5 py-0.5 font-mono text-[10px] text-muted" title="Ajanda Hareketleri T-0078 · kaynak: T-0057, T-0060, T-0056, T-0063, T-0068, T-0076, T-0049, T-0053">T-0078 · Ajanda Hareketleri</span>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        {/* Ana alan — büyük defter (çok not için) */}
        <div className="min-w-0 flex-1 space-y-3 rounded-xl p-5 shadow-[0_12px_34px_rgba(0,0,0,0.2)]" style={{ background: "#FBF7EC", border: "1px solid #E7DFC9" }}>
          {/* Başlık — büyük tarih + mini ay */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="font-serif text-6xl font-bold leading-[0.8] text-ink">{curDate.getDate()}</span>
              <div className="font-serif leading-tight">
                <p className="text-2xl font-bold text-ink">{TR_AY[mo]}</p>
                <p className="text-xl text-ink/80">{y}</p>
                <p className="text-sm text-ink/60">{TR_GUN_UZUN[(curDate.getDay() + 6) % 7]}</p>
              </div>
            </div>
            <div className="rounded-lg border border-black/10 bg-white/60 p-2">
              <p className="mb-1 text-center text-[11px] font-bold text-ink/80">{TR_AY_K[mo]} {y}</p>
              <div className="grid grid-cols-7 gap-x-1.5 gap-y-0.5 text-center text-[10px]">
                {AY_GUN.map((g) => <span key={g} className="font-semibold text-ink/50">{g}</span>)}
                {miniCells.map((d, i) => d === null ? <span key={i} /> : (
                  <button key={i} onClick={() => setCur(new Date(y, mo, d).getTime())} className={`${d === curDate.getDate() ? "mx-auto grid h-4 w-4 place-items-center rounded-full bg-neon-blue font-bold text-white" : dstr(new Date(y, mo, d)) === td ? "font-bold text-neon-blue" : "text-ink/70"}`}>{d}</button>
                ))}
              </div>
            </div>
          </div>

          {/* GÜNÜN DEFTERİ — çizgili, boş satırlı, büyük; sürükle-bırak ile eklenir */}
          <div
            onDragOver={dragSek ? (e) => e.preventDefault() : undefined}
            onDrop={dragSek ? (e) => { e.preventDefault(); const s = SEKMELER.find((x) => x.label === dragSek); if (s) addSekme(s); setDragSek(null); } : undefined}
            className={`overflow-hidden rounded-xl border bg-white/70 transition ${dragSek ? "border-neon-blue ring-2 ring-neon-blue/40" : "border-black/10"}`}
          >
            <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: "#CFE4F7" }}>
              <span className="flex items-center gap-1.5 text-[12px] font-bold tracking-wide text-ink"><BookOpen size={13} /> GÜNÜN DEFTERİ <span className="font-normal text-ink/50">({dayDefter.length})</span></span>
            </div>
            {/* Çizgili defter — iki sayfa (ikiye bölünmüş) */}
            <div className="grid gap-0 md:grid-cols-2">
              <div className="relative min-h-[520px] border-dashed border-black/10 px-3 py-1 md:border-r" style={{ backgroundImage: "repeating-linear-gradient(transparent 0 33px, #D7E3EF 33px 34px)" }}>
                {dayDefter.length === 0 && (
                  <p className="pt-2 text-center text-[12px] text-ink/35">Boş — sağdaki Hızlı İşlemler'den sürükleyip bırakın ya da aşağıya not yazın.</p>
                )}
                {leftCol.map(rowEl)}
              </div>
              <div className="relative min-h-[520px] px-3 py-1" style={{ backgroundImage: "repeating-linear-gradient(transparent 0 33px, #D7E3EF 33px 34px)" }}>
                {rightCol.map(rowEl)}
              </div>
            </div>
            {/* Deftere not yaz */}
            <div className="flex items-center gap-2 border-t border-black/10 bg-white/60 p-3">
              <FileText size={14} className="shrink-0 text-neon-blue" />
              <input ref={noteRef} value={noteText} onChange={(e) => setNoteText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveNote(); }}
                placeholder="Deftere not yaz…" className="flex-1 rounded-lg border border-black/15 bg-white/80 px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-neon-blue" style={{ fontFamily: "inherit" }} />
              <button onClick={saveNote} disabled={!noteText.trim()} className="flex items-center gap-1 rounded-lg bg-neon-blue px-2.5 py-1.5 text-[13px] font-semibold text-white transition hover:brightness-110 disabled:opacity-40"><Send size={13} /> Ekle</button>
            </div>
          </div>
        </div>

        {/* Sağ panel — Hızlı İşlemler (tıkla ya da deftere sürükle) */}
        <div className="w-full shrink-0 lg:w-56">
          <div className="rounded-xl border border-black/10 bg-white/70 p-3">
            <p className="mb-1 flex items-center gap-1.5 text-[12px] font-bold tracking-wide text-ink"><Plus size={13} className="text-neon-blue" /> HIZLI İŞLEMLER</p>
            <p className="mb-2.5 text-[11px] text-ink/50">Tıkla ya da <b className="text-ink/70">deftere sürükle bırak</b> — seçili güne eklenir.</p>
            <div className="grid grid-cols-2 gap-1.5">
              {SEKMELER.map((s) => (
                <button key={s.label}
                  draggable onDragStart={() => setDragSek(s.label)} onDragEnd={() => setDragSek(null)}
                  onClick={() => addSekme(s)}
                  className={`flex cursor-grab items-center gap-1.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-semibold text-white shadow-sm transition hover:-translate-y-0.5 active:cursor-grabbing ${dragSek === s.label ? "opacity-40" : ""}`}
                  style={{ background: s.renk }}>
                  <Plus size={13} className="shrink-0" /> {s.label}
                </button>
              ))}
            </div>
            {onNavigate && (
              <button onClick={() => onNavigate("ajandam")} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-white/60 px-2.5 py-2 text-[12px] font-semibold text-ink/70 transition hover:text-neon-blue" style={{ fontFamily: "inherit" }}>
                <BookOpen size={13} /> Takvim / Ajanda Defteri
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Alt: Su Takibi · Ruh Hali · İlaç Takibi */}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card title="SU TAKİBİ" icon={Droplet} renk="#CFE4F7">
          <div className="flex gap-1">{Array.from({ length: 8 }).map((_, i) => <button key={i} onClick={() => setSu(i + 1)} className="h-6 w-4 rounded-b-md border border-blue-300" style={{ background: i < su ? "#60A5FA" : "transparent" }} />)}</div>
          <p className="mt-1 text-[12px] text-ink/70">{su} / 8 bardak</p>
        </Card>
        <Card title="RUH HALİ" icon={Smile} renk="#E7E1F3">
          <div className="flex items-center justify-center gap-3">{[Smile, Meh, Frown].map((Ic, i) => <button key={i} onClick={() => setRuh(i)} className={i === ruh ? "text-good" : "text-ink/30"}><Ic size={26} /></button>)}</div>
          <p className="mt-1 text-center text-ink/70" style={{ fontFamily: "'Caveat', cursive", fontSize: 15 }}>{["Verimli bir gün", "Normal bir gün", "Zorlu bir gün"][ruh]}</p>
        </Card>
        <Card title="İLAÇ TAKİBİ" icon={Pill} renk="#EDE4FB">
          <div className="space-y-0.5">
            {meds.map((v) => { const k = curStr + v; const on = !!ilac[k]; return (
              <div key={v} className="group flex items-center gap-2 py-0.5">
                <button onClick={() => setIlac((p) => ({ ...p, [k]: !p[k] }))} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  {on ? <CheckSquare size={15} className="shrink-0 text-good" /> : <Square size={15} className="shrink-0 text-ink/30" />}
                  <span className={`truncate text-[13px] ${on ? "text-ink/40 line-through" : "text-ink/85"}`}>{v}</span>
                </button>
                <button onClick={() => setMeds((p) => p.filter((x) => x !== v))} className="shrink-0 text-ink/30 opacity-0 transition hover:text-critical group-hover:opacity-100"><X size={12} /></button>
              </div>
            ); })}
            {meds.length === 0 && <p className="py-1 text-[12px] text-ink/40">İlaç ekleyin.</p>}
          </div>
          <div className="mt-1.5 flex items-center gap-1">
            <input value={ilacInput} onChange={(e) => setIlacInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addIlac(); }}
              placeholder="İlaç ekle…" className="min-w-0 flex-1 rounded border border-black/15 bg-white/80 px-2 py-1 text-[12px] text-ink outline-none focus:border-neon-blue" style={{ fontFamily: "inherit" }} />
            <button onClick={addIlac} disabled={!ilacInput.trim()} className="grid h-7 w-7 shrink-0 place-items-center rounded text-white transition disabled:opacity-40" style={{ background: "#9333EA" }}><Plus size={14} /></button>
          </div>
          <p className="mt-1 text-[12px] text-ink/70">{ilacDone} / {meds.length} alındı</p>
        </Card>
      </div>

      {/* Hızlı ekleme / düzenleme modalı */}
      {addModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-10 font-sans backdrop-blur-sm" onClick={() => setAddModal(null)}>
          <div className="w-full max-w-2xl rounded-2xl border border-line bg-panel shadow-card animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <h3 className="text-sm font-semibold text-ink">{addModal.rec ? String(addModal.rec.baslik ?? addModal.rec.toplanti ?? addModal.baslik) : `${addModal.baslik} Ekle`}</h3>
              <button onClick={() => setAddModal(null)} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-elevated"><X size={16} /></button>
            </div>
            <div className="p-4">
              {addModal.modId === "TALEP"
                ? <TalepForm initial="new" onClose={() => setAddModal(null)} />
                : getModule(addModal.modId)
                  ? <RecordForm mod={getModule(addModal.modId)!} initial={addModal.rec} defaults={addModal.rec ? undefined : addModal.defaults} onClose={() => setAddModal(null)} />
                  : <p className="text-sm text-muted">Tablo bulunamadı.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
