import { useState } from "react";
import {
  CheckSquare, Square, Users, AlertCircle, ArrowRight, Clock3,
  Lightbulb, Droplet, Smile, Meh, Frown, CalendarCheck, ChevronLeft, ChevronRight,
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
  const { getModule, updateRecord, addRecord, deleteRecord } = useModules();
  const recs = (id: string) => (getModule(id)?.records ?? []) as DynamicRecord[];
  const [cur, setCur] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); });
  const [su, setSu] = useState(4);
  const [ruh, setRuh] = useState(0);
  const [lchk, setLchk] = useState<Record<string, boolean>>({});
  const [addModal, setAddModal] = useState<{ modId: string; baslik: string; defaults?: Record<string, unknown>; rec?: DynamicRecord } | null>(null);
  const [noteText, setNoteText] = useState("");
  const [dragSek, setDragSek] = useState<string | null>(null);
  const lt = (id: string) => setLchk((p) => ({ ...p, [id]: !p[id] }));

  const curDate = new Date(cur);
  const curStr = dstr(curDate);
  const nextStr = dstr(new Date(cur + ONE));
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

  // Öncelikli işler: T-0056 açık görevler, önceliğe göre
  const acikGorev = recs("mod-T-0056").filter((r) => String(r.durum) !== "Tamamlandı");
  const byOncelik = (re: RegExp) => acikGorev.filter((g) => re.test(String(g.oncelik))).slice(0, 4);
  const toggleT56 = (r: DynamicRecord) => updateRecord("mod-T-0056", String(r.id), { durum: String(r.durum) === "Tamamlandı" ? "Yapılacak" : "Tamamlandı" });
  // Tutanak: o güne ait
  const tutanak = recs("mod-T-0063").find((r) => String(r.tarih) === curStr);
  const kararlar = String(tutanak?.kararlar ?? "").split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 6);
  const aksiyonlar = String(tutanak?.aksiyonlar ?? "").split("\n").map((l) => l.split("|")[0].trim()).filter(Boolean).slice(0, 4);
  // Fikirler: T-0066
  const fikirler = recs("mod-T-0066").map((r) => String(r.fikir || r.baslik || "")).filter(Boolean).slice(0, 5);
  // Yarının hedefleri: ertesi gün T-0057
  const yarin = recs("mod-T-0057").filter((r) => String(r.tarih) === nextStr).slice(0, 4).map((r) => String(r.baslik));

  const nav = (d: number) => setCur((c) => c + d * ONE);
  const bugun = () => { const d = new Date(); d.setHours(0, 0, 0, 0); setCur(d.getTime()); };

  // Hızlı İşlem — ilgili tabloya kayıt aç (seçili güne)
  const addSekme = (s: typeof SEKMELER[number]) => {
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

  const Card = ({ title, icon: Icon, renk, extra, children, className }: { title: string; icon: typeof Users; renk: string; extra?: React.ReactNode; children: React.ReactNode; className?: string }) => (
    <div className={`overflow-hidden rounded-xl border border-black/10 bg-white/70 ${className ?? ""}`}>
      <div className="flex items-center justify-between gap-2 px-3 py-1.5" style={{ background: renk }}>
        <span className="flex items-center gap-1.5 text-[12px] font-bold tracking-wide text-ink"><Icon size={13} /> {title}</span>
        {extra}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
  const Chk = ({ checked, onToggle, label, strike }: { checked: boolean; onToggle: () => void; label: React.ReactNode; strike?: boolean }) => (
    <button onClick={onToggle} className="flex w-full items-center gap-2 py-0.5 text-left">
      {checked ? <CheckSquare size={15} className="shrink-0 text-good" /> : <Square size={15} className="shrink-0 text-ink/30" />}
      <span className={`text-[13px] ${checked && strike ? "text-ink/40 line-through" : "text-ink/85"}`}>{label}</span>
    </button>
  );
  const Bos = ({ msg }: { msg: string }) => <p className="py-2 text-center text-[12px] text-ink/40">{msg}</p>;

  // Her bölüm başlığına "+ Ekle" — ilgili tabloya kayıt açar (tarih = seçili gün)
  const AddBtn = ({ modId, defaults, tarih }: { modId: string; defaults?: Record<string, unknown>; tarih?: string }) => (
    <button onClick={() => setAddModal({ modId, baslik: "Kayıt", defaults: { tarih: tarih ?? curStr, ...(defaults ?? {}) } })}
      className="flex items-center gap-1 rounded-md bg-white/70 px-2 py-0.5 text-[10px] font-semibold text-ink/70 transition hover:text-neon-blue" style={{ fontFamily: "inherit" }}>
      <Plus size={11} /> Ekle
    </button>
  );

  const ONCELIK = [
    { key: "A", title: "ÖNCELİKLİ (A)", renk: "#FECACA", icon: AlertCircle, onc: "Yüksek", items: byOncelik(/kritik|yüksek|acil/i) },
    { key: "B", title: "ORTA (B)", renk: "#FDE68A", icon: ArrowRight, onc: "Orta", items: byOncelik(/orta|normal/i) },
    { key: "C", title: "DAHA SONRA (C)", renk: "#BBF7D0", icon: Clock3, onc: "Düşük", items: byOncelik(/düşük/i) },
  ];

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

      <div className="flex flex-col items-start gap-3 lg:flex-row">
        {/* Defter sayfaları */}
        <div className="grid min-w-0 flex-1 gap-0 rounded-xl shadow-[0_12px_34px_rgba(0,0,0,0.2)] lg:grid-cols-2" style={{ background: "#FBF7EC", border: "1px solid #E7DFC9" }}>
          {/* ── SOL SAYFA ── */}
          <div className="space-y-3 border-b border-dashed border-[#E3DCC6] p-5 lg:border-b-0 lg:border-r">
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
              <div className="relative max-w-[140px] -rotate-2 rounded-sm bg-[#FBD5DE] px-3 py-2 shadow-[1px_2px_6px_rgba(0,0,0,0.15)]">
                <p className="leading-snug text-ink/80" style={{ fontFamily: "'Caveat', cursive", fontSize: 16 }}>“Her büyük iş, küçük bir adımla başlar.”</p>
              </div>
            </div>

            {/* GÜNÜN DEFTERİ — saat cetveli yerine o güne düşen kayıtlar + deftere not yaz */}
            <div
              onDragOver={dragSek ? (e) => e.preventDefault() : undefined}
              onDrop={dragSek ? (e) => { e.preventDefault(); const s = SEKMELER.find((x) => x.label === dragSek); if (s) addSekme(s); setDragSek(null); } : undefined}
              className={`overflow-hidden rounded-xl border bg-white/70 transition ${dragSek ? "border-neon-blue ring-2 ring-neon-blue/40" : "border-black/10"}`}
            >
              <div className="flex items-center justify-between gap-2 px-3 py-1.5" style={{ background: "#CFE4F7" }}>
                <span className="flex items-center gap-1.5 text-[12px] font-bold tracking-wide text-ink"><BookOpen size={13} /> GÜNÜN DEFTERİ <span className="font-normal text-ink/50">({dayDefter.length})</span></span>
                <AddBtn modId="mod-T-0057" />
              </div>
              <div className="space-y-1 p-3">
                {dayDefter.map((it) => { const m = TIP[it.tip]; return (
                  <div key={it.id} className="group flex w-full items-center gap-2 rounded-lg border border-black/5 bg-white/60 px-2.5 py-2 transition hover:border-neon-blue/40">
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
                ); })}
                {dayDefter.length === 0 && (
                  <div className="rounded-lg border border-dashed border-black/10 py-6 text-center">
                    <BookOpen size={20} className="mx-auto mb-1.5 text-ink/30" />
                    <p className="text-[13px] text-ink/50">Bu güne düşen kayıt yok.</p>
                    <p className="mt-0.5 text-[11px] text-ink/35">Sağdaki Hızlı İşlemler'den sürükleyip bırakın ya da aşağıya not yazın.</p>
                  </div>
                )}
                {/* Deftere not yaz */}
                <div className="mt-2 flex items-center gap-2 border-t border-black/10 pt-2">
                  <FileText size={14} className="shrink-0 text-neon-blue" />
                  <input value={noteText} onChange={(e) => setNoteText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveNote(); }}
                    placeholder="Deftere not yaz…" className="flex-1 rounded-lg border border-black/15 bg-white/80 px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-neon-blue" style={{ fontFamily: "inherit" }} />
                  <button onClick={saveNote} disabled={!noteText.trim()} className="flex items-center gap-1 rounded-lg bg-neon-blue px-2.5 py-1.5 text-[13px] font-semibold text-white transition hover:brightness-110 disabled:opacity-40"><Send size={13} /> Ekle</button>
                </div>
              </div>
            </div>
          </div>

          {/* ── SAĞ SAYFA ── */}
          <div className="space-y-3 p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {ONCELIK.map((col) => (
                <Card key={col.key} title={col.title} icon={col.icon} renk={col.renk} extra={<AddBtn modId="mod-T-0056" defaults={{ oncelik: col.onc, durum: "Yapılacak" }} />}>
                  <div className="space-y-0.5">
                    {col.items.length ? col.items.map((g) => <Chk key={String(g.id)} checked={String(g.durum) === "Tamamlandı"} onToggle={() => toggleT56(g)} label={String(g.baslik)} strike />) : <Bos msg="—" />}
                  </div>
                </Card>
              ))}
            </div>

            <Card title="TOPLANTI NOTLARI" icon={Users} renk="#CFE4F7" extra={<div className="flex items-center gap-2">{tutanak ? <span className="text-[10px] text-ink/60">{String(tutanak.saat || "")} · {String(tutanak.toplanti)}</span> : null}<AddBtn modId="mod-T-0063" /></div>}>
              {tutanak ? (
                <div className="flex flex-wrap gap-3">
                  <ul className="min-w-[180px] flex-1 space-y-0.5 text-[13px] text-ink/85">{kararlar.map((x, i) => <li key={i} className="flex gap-1.5"><span className="text-ink/40">•</span>{x}</li>)}</ul>
                  {aksiyonlar.length > 0 && (
                    <div className="w-40 -rotate-1 rounded-sm bg-[#FBD5DE]/70 p-2">
                      <p className="mb-1 font-bold text-ink/80" style={{ fontFamily: "'Caveat', cursive", fontSize: 15 }}>Aksiyonlar:</p>
                      {aksiyonlar.map((x, i) => <Chk key={i} checked={!!lchk["ak" + curStr + i]} onToggle={() => lt("ak" + curStr + i)} label={x} />)}
                    </div>
                  )}
                </div>
              ) : <Bos msg="Bu güne ait toplantı tutanağı yok." />}
            </Card>

            <Card title="FİKİRLER / NOTLAR" icon={Lightbulb} renk="#FDE9B5" extra={<AddBtn modId="mod-T-0066" />}>
              <div className="flex flex-wrap items-center gap-3">
                <ul className="min-w-[200px] flex-1 space-y-0.5 text-[13px] text-ink/85">{fikirler.length ? fikirler.map((x, i) => <li key={i} className="flex gap-1.5"><span className="text-ink/40">•</span>{x}</li>) : <Bos msg="Fikir havuzu boş." />}</ul>
                <svg viewBox="0 0 230 130" className="h-28 w-56 shrink-0">
                  {[["115,65", "55,26"], ["115,65", "190,33"], ["115,65", "38,102"], ["115,65", "178,107"]].map(([a, b], i) => { const [x1, y1] = a.split(",").map(Number); const [x2, y2] = b.split(",").map(Number); return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#9CA3AF" strokeWidth="1" />; })}
                  <g fontSize="8" textAnchor="middle" fontFamily="Patrick Hand">
                    <ellipse cx="115" cy="65" rx="34" ry="16" fill="#FDE68A" stroke="#CA8A04" /><text x="115" y="68" fontWeight="bold">Yeni Proje</text>
                    <ellipse cx="55" cy="26" rx="30" ry="13" fill="#fff" stroke="#9CA3AF" /><text x="55" y="29">Web Paneli</text>
                    <ellipse cx="190" cy="33" rx="30" ry="14" fill="#fff" stroke="#9CA3AF" /><text x="190" y="31">Mobil</text><text x="190" y="40">Uygulama</text>
                    <ellipse cx="38" cy="102" rx="28" ry="14" fill="#fff" stroke="#9CA3AF" /><text x="38" y="100">Veri</text><text x="38" y="109">Analizi</text>
                    <ellipse cx="178" cy="107" rx="32" ry="15" fill="#fff" stroke="#9CA3AF" /><text x="178" y="105">API</text><text x="178" y="114">Entegrasyonu</text>
                  </g>
                </svg>
              </div>
            </Card>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Card title="SU TAKİBİ" icon={Droplet} renk="#CFE4F7">
                <div className="flex gap-1">{Array.from({ length: 8 }).map((_, i) => <button key={i} onClick={() => setSu(i + 1)} className="h-6 w-4 rounded-b-md border border-blue-300" style={{ background: i < su ? "#60A5FA" : "transparent" }} />)}</div>
                <p className="mt-1 text-[12px] text-ink/70">{su} / 8 bardak</p>
              </Card>
              <Card title="RUH HALİ" icon={Smile} renk="#E7E1F3">
                <div className="flex items-center justify-center gap-3">{[Smile, Meh, Frown].map((Ic, i) => <button key={i} onClick={() => setRuh(i)} className={i === ruh ? "text-good" : "text-ink/30"}><Ic size={26} /></button>)}</div>
                <p className="mt-1 text-center text-ink/70" style={{ fontFamily: "'Caveat', cursive", fontSize: 15 }}>{["Verimli bir gün", "Normal bir gün", "Zorlu bir gün"][ruh]}</p>
              </Card>
              <Card title="YARININ HEDEFLERİ" icon={CalendarCheck} renk="#CFE4F7" extra={<AddBtn modId="mod-T-0057" tarih={nextStr} />}>
                <div className="space-y-0.5">{yarin.length ? yarin.map((x, i) => <Chk key={i} checked={!!lchk["yr" + nextStr + i]} onToggle={() => lt("yr" + nextStr + i)} label={x} />) : <Bos msg="Yarına planlı iş yok." />}</div>
              </Card>
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
