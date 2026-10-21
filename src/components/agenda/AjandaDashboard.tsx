import { useState, useEffect, type DragEvent } from "react";
import { ChevronLeft, ChevronRight, Printer, Plus, X, Users, Utensils, Phone, AlertCircle, FileText, BarChart3, Scale, CheckSquare, Bell, Sun, Folder, Search, TrendingUp } from "lucide-react";
import { useModules } from "@/context/ModulesContext";
import { RecordForm } from "@/components/projects/ProjectTableCard";
import TalepForm from "@/components/requests/TalepForm";
import type { DynamicRecord, DynamicModule } from "@/types/modules";
import type { View } from "@/App";

const TR_AY = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const TR_GUN_UZUN = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
const TR_GUN = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];
const pad = (n: number) => String(n).padStart(2, "0");
const dstr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dmy = (iso: string) => (iso ? iso.split("-").reverse().join(".") : "");
const ONE = 86400000;
const parseT = (s: string) => { const m = String(s).match(/(\d{1,2}):(\d{2})/); return m ? parseInt(m[1]) + parseInt(m[2]) / 60 : NaN; };

// Zaman çizelgesi
const START_H = 8, END_H = 20, PXH = 66;

const RENK: Record<string, string> = { Mavi: "#0A4EA2", Yeşil: "#1E7A46", Turuncu: "#B5731A", Kırmızı: "#C1292E", Mor: "#4B3FB0", Gri: "#5A6B82" };
// Not renkleri (T-0068) → takvim noktası rengi
const NOT_RENK: Record<string, string> = { Sarı: "#CA8A04", Yeşil: "#16A34A", Mavi: "#2563EB", Pembe: "#DB2777", Mor: "#7C3AED", Gri: "#64748B" };
// Kayıt tipi → renk + kısa etiket (takvimde/ajandada ne olduğunu göster)
const TIP_META: Record<string, { renk: string; kisa: string }> = {
  "Ajanda": { renk: "#0A4EA2", kisa: "AJANDA" },
  "Etkinlik": { renk: "#0d9488", kisa: "ETKİNLİK" },
  "Görev": { renk: "#1E7A46", kisa: "GÖREV" },
  "Not": { renk: "#CA8A04", kisa: "NOT" },
  "Onay": { renk: "#B5731A", kisa: "ONAY" },
  "Talep": { renk: "#C1292E", kisa: "TALEP" },
  "Tutanak": { renk: "#7C3AED", kisa: "TUTANAK" },
};
const iconFor = (text: string) => {
  const t = text.toLowerCase();
  if (/toplant|ekip|sunum/.test(t)) return Users;
  if (/öğle|yemek/.test(t)) return Utensils;
  if (/telefon|çağrı|görüşme|ara/.test(t)) return Phone;
  if (/teknik|kontrol|güvenlik|test/.test(t)) return AlertCircle;
  if (/rapor|analiz|değerlend/.test(t)) return BarChart3;
  if (/hukuk|sözleşme|dava/.test(t)) return Scale;
  return FileText;
};

type Blk = { key: string; rec: DynamicRecord; mod: DynamicModule; s: number; e: number; title: string; sub: string; color: string };

export default function AjandaDashboard({ onNavigate, projeFilter }: { onNavigate: (v: View) => void; projeFilter?: string }) {
  const { getModule, updateRecord } = useModules();
  const [calView, setCalView] = useState<"gun" | "hafta" | "ay" | "liste">("gun");
  const [cur, setCur] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); });
  const [modal, setModal] = useState<{ mod: DynamicModule; rec: DynamicRecord | "new"; defaults?: Record<string, unknown> } | null>(null);
  const [talepModal, setTalepModal] = useState(false);
  const [q, setQ] = useState("");
  // Sürükle-ekle: Hızlı İşlemler'den takvime
  const [dragKind, setDragKind] = useState<string | null>(null);
  const [dropH, setDropH] = useState<number | null>(null);
  const [dropDay, setDropDay] = useState<string | null>(null);
  const [piyasa, setPiyasa] = useState<{ kod: string; ad: string; deger: string; yuzde: number }[]>([]);

  // CNN Türk tarzı piyasa özeti (Dolar · Euro · Altın gr · Gümüş gr · BIST 100)
  useEffect(() => {
    let ok = true;
    fetch("/api/piyasa")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => { if (ok && Array.isArray(d)) setPiyasa(d); })
      .catch(() => {});
    return () => { ok = false; };
  }, []);

  const ajMod = getModule("mod-T-0057");
  const evMod = getModule("mod-T-0060");
  const notMod = getModule("mod-T-0068");
  const tutMod = getModule("mod-T-0063");
  const dosMod = getModule("mod-T-0067");
  const gorevMod = getModule("mod-T-0056");
  const onayMod = getModule("mod-T-0045");
  const talepMod = getModule("mod-T-0076");
  // Projeye özel filtre: kayıt içeriğinde proje adı geçenler
  const pf = (projeFilter ?? "").trim().toLocaleLowerCase("tr");
  const matchP = (r: DynamicRecord) => !pf || [r.baslik, r.ad, r.kategori, r.sprint, r.konum, r.toplanti, r.aciklama].some((v) => String(v ?? "").toLocaleLowerCase("tr").includes(pf));
  const aj = ((ajMod?.records ?? []) as DynamicRecord[]).filter(matchP);
  const ev = ((evMod?.records ?? []) as DynamicRecord[]).filter(matchP);
  const notlar = ((notMod?.records ?? []) as DynamicRecord[]).filter(matchP);
  const tutanaklar = ((tutMod?.records ?? []) as DynamicRecord[]).filter(matchP);
  const gorevRecs = ((gorevMod?.records ?? []) as DynamicRecord[]).filter(matchP);
  const onayRecs = ((onayMod?.records ?? []) as DynamicRecord[]).filter(matchP);
  const talepRecs = ((talepMod?.records ?? []) as DynamicRecord[]).filter(matchP);
  const curDate = new Date(cur);
  const curStr = dstr(curDate);
  const td = dstr(new Date());

  // Zaman çizelgesi blokları = günün etkinlikleri (T-0060, saatli).
  const blocks: Blk[] = ev
    .filter((r) => String(r.tarih) === curStr && r.baslangic_saat)
    .map((r) => {
      const s = parseT(String(r.baslangic_saat));
      const e2 = parseT(String(r.bitis_saat));
      return { key: "e" + r.id, rec: r, mod: evMod!, s, e: isNaN(e2) ? s + 1 : e2, title: String(r.baslik), sub: String(r.konum || r.tur || ""), color: RENK[String(r.renk)] || "#0A4EA2" };
    })
    .filter((b) => !isNaN(b.s)).sort((a, b) => a.s - b.s);

  // Bugünün görevleri = günün ajanda maddeleri (checkbox: durum ↔ Tamamlandı)
  const gorevler = aj.filter((r) => String(r.tarih) === curStr).sort((a, b) => String(a.saat || "").localeCompare(String(b.saat || "")));
  const done = gorevler.filter((r) => String(r.durum) === "Tamamlandı").length;
  const pct = gorevler.length ? Math.round((done / gorevler.length) * 100) : 0;
  const toggle = (r: DynamicRecord) => updateRecord("mod-T-0057", String(r.id), { durum: String(r.durum) === "Tamamlandı" ? "Yapılacak" : "Tamamlandı" });

  // Mini ay takvimi
  const my = curDate.getFullYear(), mm = curDate.getMonth();
  const firstDow = (new Date(my, mm, 1).getDay() + 6) % 7;
  const dim = new Date(my, mm + 1, 0).getDate();
  const miniCells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)];

  const nav = (dir: number) => setCur((c) => c + dir * (calView === "hafta" ? 7 : 1) * ONE);
  const goToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); setCur(d.getTime()); };
  const topTitle = `${TR_AY[mm]} ${my}`;

  const VBtn = ({ v, label }: { v: typeof calView; label: string }) => (
    <button onClick={() => setCalView(v)} className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${calView === v ? "bg-panel text-ink shadow-sm" : "text-muted hover:text-ink"}`}>{label}</button>
  );
  const pfBaslik = pf ? { baslik: `${projeFilter} · ` } : {};
  const openNew = () => setModal({ mod: ajMod!, rec: "new", defaults: { tarih: curStr, ...pfBaslik } });

  // Hızlı İşlem türüne göre ekleme modalını aç (sürükle-bırak veya tıklama) — isteğe bağlı tarih/saat ile
  const addH = (t: string) => { const [h, m] = t.split(":").map(Number); return `${pad((h + 1) % 24)}:${pad(m || 0)}`; };
  const openKind = (kind: string, opts?: { saat?: string; date?: string }) => {
    const date = opts?.date || curStr; const saat = opts?.saat;
    if (kind === "gorev") setModal({ mod: ajMod!, rec: "new", defaults: { tarih: date, ...(saat ? { saat } : {}), ...pfBaslik } });
    else if (kind === "etkinlik") setModal({ mod: evMod!, rec: "new", defaults: { tarih: date, ...(saat ? { baslangic_saat: saat, bitis_saat: addH(saat) } : {}), ...pfBaslik } });
    else if (kind === "not" && notMod) setModal({ mod: notMod, rec: "new", defaults: { renk: "Sarı", tarih: date, ...pfBaslik } });
    else if (kind === "dosya" && dosMod) setModal({ mod: dosMod, rec: "new" });
    else if (kind === "talep") setTalepModal(true);
    else if (kind === "tutanak") onNavigate("tutanak");
  };
  // Zaman çizelgesine (Gün) bırakınca saati hesapla
  const onTimelineDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!dragKind) return;
    const rect = e.currentTarget.getBoundingClientRect();
    let h = START_H + (e.clientY - rect.top) / PXH;
    h = Math.max(START_H, Math.min(END_H, Math.round(h * 2) / 2));
    openKind(dragKind, { saat: `${pad(Math.floor(h))}:${pad((h % 1) * 60)}` });
    setDragKind(null); setDropH(null);
  };

  // Hafta/Ay/Liste için birleşik tarihli kayıtlar — her biri tip etiketli (Not/Görev/Onay/Talep…)
  const allEntries = [
    ...aj.filter((r) => r.tarih).map((r) => ({ key: "a" + r.id, rec: r, mod: ajMod!, date: String(r.tarih), time: String(r.saat || ""), title: String(r.baslik), tip: "Ajanda", color: TIP_META.Ajanda.renk })),
    ...ev.filter((r) => r.tarih).map((r) => ({ key: "e" + r.id, rec: r, mod: evMod!, date: String(r.tarih), time: String(r.baslangic_saat || ""), title: String(r.baslik), tip: "Etkinlik", color: RENK[String(r.renk)] || TIP_META.Etkinlik.renk })),
    ...notlar.filter((r) => r.tarih && r.arsiv !== true).map((r) => ({ key: "n" + r.id, rec: r, mod: notMod!, date: String(r.tarih), time: "", title: String(r.baslik), tip: "Not", color: NOT_RENK[String(r.renk)] || TIP_META.Not.renk })),
    ...tutanaklar.filter((r) => r.tarih).map((r) => ({ key: "t" + r.id, rec: r, mod: tutMod!, date: String(r.tarih), time: "", title: String(r.toplanti), tip: "Tutanak", color: TIP_META.Tutanak.renk })),
    ...gorevRecs.filter((r) => r.termin || r.baslangic).map((r) => ({ key: "g" + r.id, rec: r, mod: gorevMod!, date: String(r.termin || r.baslangic), time: "", title: String(r.baslik), tip: "Görev", color: TIP_META.Görev.renk })),
    ...onayRecs.filter((r) => r.tarih).map((r) => ({ key: "o" + r.id, rec: r, mod: onayMod!, date: String(r.tarih), time: "", title: String(r.konu), tip: "Onay", color: TIP_META.Onay.renk })),
    ...talepRecs.filter((r) => r.tarih).map((r) => ({ key: "q" + r.id, rec: r, mod: talepMod!, date: String(r.tarih), time: "", title: String(r.konu), tip: "Talep", color: TIP_META.Talep.renk })),
  ];
  const onDate = (s: string) => allEntries.filter((e) => e.date === s).sort((a, b) => a.time.localeCompare(b.time));
  const weekStart = (() => { const d = new Date(cur); const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow); d.setHours(0, 0, 0, 0); return d.getTime(); })();
  const weekDays = Array.from({ length: 7 }, (_, i) => new Date(weekStart + i * ONE));
  const monCells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)];
  while (monCells.length % 7 !== 0) monCells.push(null);

  // Ara — tüm kayıtlarda (hangi yıl olursa olsun) başlık/tarih araması
  const qn = q.trim().toLocaleLowerCase("tr");
  const hits = qn
    ? allEntries
        .filter((e) => e.title.toLocaleLowerCase("tr").includes(qn) || dmy(e.date).includes(qn))
        .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
        .slice(0, 40)
    : [];
  const goHit = (h: (typeof allEntries)[number]) => {
    const d = new Date(h.date + "T00:00:00");
    d.setHours(0, 0, 0, 0);
    setCur(d.getTime());
    setCalView("gun");
    setQ("");
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-4 md:p-6">
      {/* Üst bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={goToday} className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-elevated">Bugün</button>
          <button onClick={() => nav(-1)} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted transition hover:bg-elevated"><ChevronLeft size={16} /></button>
          <button onClick={() => nav(1)} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted transition hover:bg-elevated"><ChevronRight size={16} /></button>
          <h1 className="ml-1 text-xl font-bold text-ink">{topTitle}</h1>
          <span className="rounded-md border border-line bg-base/60 px-1.5 py-0.5 font-mono text-[10px] text-muted" title="Ajanda Hareketleri T-0078 · kaynak: T-0057 Ajanda, T-0060 Etkinlik, T-0056 Görev, T-0063 Tutanak, T-0068 Not, T-0076 Talep, T-0049 Randevu, T-0053 İzin">T-0078 · Ajanda Hareketleri</span>
          {projeFilter && <span className="rounded-full bg-neon-blue/10 px-2 py-0.5 text-[11px] font-medium text-neon-blue">Proje: {projeFilter}</span>}
          {/* Ajandada ara — tüm yıllar */}
          <div className="relative ml-2">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ajandada ara… (tüm yıllar)"
              className="w-56 rounded-lg border border-line bg-panel py-1.5 pl-9 pr-8 text-sm text-ink outline-none transition focus:w-72 focus:border-neon-blue focus:ring-2 focus:ring-neon-blue/20"
            />
            {q && (
              <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-faint transition hover:text-ink"><X size={14} /></button>
            )}
            {q && (
              <div className="absolute left-0 top-full z-40 mt-1 max-h-80 w-80 overflow-y-auto rounded-xl border border-line bg-panel p-1 shadow-card animate-fade-in">
                <p className="px-2 py-1.5 text-[11px] text-faint">{hits.length} sonuç</p>
                {hits.map((h) => (
                  <button key={h.key} onClick={() => goHit(h)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-elevated">
                    <span className="w-16 shrink-0 rounded px-1 py-0.5 text-center text-[8px] font-bold tracking-wide" style={{ background: `${h.color}1f`, color: h.color }}>{TIP_META[h.tip]?.kisa || h.tip}</span>
                    <span className="w-20 shrink-0 text-[11px] text-muted nums">{dmy(h.date)}</span>
                    {h.time ? <span className="w-10 shrink-0 text-[11px] text-faint nums">{h.time}</span> : <span className="w-10 shrink-0" />}
                    <span className="flex-1 truncate text-sm text-ink">{h.title}</span>
                  </button>
                ))}
                {hits.length === 0 && <p className="px-2 py-4 text-center text-xs text-faint">Eşleşen kayıt yok.</p>}
              </div>
            )}
          </div>
        </div>
        <button onClick={() => window.print()} className="no-print grid h-9 w-9 place-items-center rounded-lg border border-line text-muted transition hover:bg-elevated hover:text-ink" title="Yazdır"><Printer size={16} /></button>
      </div>

      {/* Görünüm seçici — piyasa şeridinin üstünde, her görünümde */}
      <div className="flex items-center">
        <div className="flex items-center gap-0.5 rounded-xl border border-line bg-base/40 p-0.5"><VBtn v="gun" label="Gün" /><VBtn v="hafta" label="Hafta" /><VBtn v="ay" label="Ay" /><VBtn v="liste" label="Ajanda" /></div>
      </div>

      {/* Piyasa özeti (CNN Türk tarzı) — Dolar · Euro · Altın · Gümüş · BIST 100 */}
      {piyasa.length > 0 && (
        <div className="flex items-center gap-2 overflow-hidden rounded-lg border border-line bg-base/50 py-1.5">
          <span className="ml-2 flex shrink-0 items-center gap-1 rounded-md bg-good/10 px-2 py-0.5 text-[10px] font-semibold text-good" title="Piyasa: canlı">
            <TrendingUp size={11} /> PİYASA · CANLI
          </span>
          <div className="group relative min-w-0 flex-1 overflow-hidden">
            <div className="flex w-max animate-marquee items-center gap-8 whitespace-nowrap pr-8 group-hover:[animation-play-state:paused]" style={{ animationDirection: "reverse", animationDuration: "40s" }}>
              {[...piyasa, ...piyasa, ...piyasa].map((p, j) => {
                const up = p.yuzde >= 0;
                return (
                  <span key={"p" + j} className="flex shrink-0 items-center gap-1.5 text-[12px]">
                    <span className="font-mono font-semibold text-ink">{p.ad}</span>
                    <span className="font-mono text-ink nums">{p.deger}</span>
                    <span className={`font-mono nums ${up ? "text-good" : "text-critical"}`}>{up ? "▲" : "▼"} %{Math.abs(p.yuzde).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className="text-faint">·</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {calView !== "liste" && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Sol: Gün (planner) / Hafta / Ay takvimi */}
          <section className="card min-w-0 p-6">
            {calView === "gun" && (<>
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
              <div className="flex items-start gap-5">
                <span className="font-serif text-7xl font-bold leading-[0.85] text-ink">{curDate.getDate()}</span>
                <div>
                  <p className="font-serif text-2xl font-semibold leading-tight text-ink">{TR_AY[mm]}</p>
                  <p className="font-serif text-2xl font-semibold leading-tight text-ink">{my}</p>
                  <p className="mt-2 text-sm text-muted">{TR_GUN_UZUN[(curDate.getDay() + 6) % 7]}</p>
                </div>
                <div className="ml-3 flex items-center gap-2">
                  <Sun size={26} className="text-warning" />
                  <div><p className="text-base font-semibold text-ink">16°C</p><p className="text-[11px] text-muted">Kayseri</p></div>
                </div>
              </div>
              {/* mini ay */}
              <div className="rounded-xl border border-line p-2">
                <p className="mb-1 text-center text-xs font-semibold text-ink">{TR_AY[mm]} {my}</p>
                <div className="grid grid-cols-7 gap-0.5">
                  {TR_GUN.map((g) => <div key={g} className="text-center text-[9px] text-faint">{g}</div>)}
                  {miniCells.map((d, i) => d === null ? <div key={i} /> : (
                    <button key={i} onClick={() => setCur(new Date(my, mm, d).getTime())} className={`grid h-5 w-5 place-items-center rounded-full text-[10px] transition ${dstr(new Date(my, mm, d)) === curStr ? "bg-neon-blue font-bold text-white" : dstr(new Date(my, mm, d)) === td ? "font-bold text-neon-blue" : "text-muted hover:bg-elevated"}`}>{d}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Zaman çizelgesi */}
            <div className="relative mt-4" style={{ height: (END_H - START_H) * PXH }}
              onDragOver={dragKind ? (e) => { e.preventDefault(); const rect = e.currentTarget.getBoundingClientRect(); let h = START_H + (e.clientY - rect.top) / PXH; h = Math.max(START_H, Math.min(END_H, Math.round(h * 2) / 2)); setDropH(h); } : undefined}
              onDragLeave={() => setDropH(null)}
              onDrop={dragKind ? onTimelineDrop : undefined}>
              {/* Sürükle-bırak saat göstergesi */}
              {dragKind && dropH != null && (
                <div className="pointer-events-none absolute left-11 right-2 z-20 flex items-center gap-2" style={{ top: (dropH - START_H) * PXH }}>
                  <span className="rounded bg-neon-blue px-1.5 py-0.5 text-[10px] font-bold text-white shadow">{pad(Math.floor(dropH))}:{pad((dropH % 1) * 60)}</span>
                  <div className="h-0.5 flex-1 rounded bg-neon-blue" />
                </div>
              )}
              {Array.from({ length: END_H - START_H + 1 }, (_, i) => START_H + i).map((h) => (
                <div key={h} className="absolute left-0 right-0 flex items-start gap-2" style={{ top: (h - START_H) * PXH }}>
                  <span className="w-11 shrink-0 text-[11px] text-faint">{pad(h)}:00</span>
                  <div className="h-px flex-1 bg-line/70" />
                </div>
              ))}
              {blocks.map((b) => {
                const Icon = iconFor(b.title + " " + b.sub);
                const top = (b.s - START_H) * PXH + 2;
                const height = Math.max(46, (b.e - b.s) * PXH - 4);
                return (
                  <button key={b.key} onClick={() => setModal({ mod: b.mod, rec: b.rec })} className="absolute left-14 right-2 overflow-hidden rounded-lg border-l-4 px-2.5 py-1.5 text-left shadow-sm transition hover:shadow"
                    style={{ top, height, borderLeftColor: b.color, background: `${b.color}12` }}>
                    <div className="flex items-center gap-1.5 text-[11px] font-medium leading-tight" style={{ color: b.color }}><Icon size={12} className="shrink-0" /> {pad(Math.floor(b.s))}:{pad(Math.round((b.s % 1) * 60))} – {pad(Math.floor(b.e))}:{pad(Math.round((b.e % 1) * 60))}</div>
                    <p className="truncate text-sm font-semibold leading-tight text-ink">{b.title}</p>
                    {b.sub && height > 52 ? <p className="truncate text-[11px] leading-tight text-muted">{b.sub}</p> : null}
                  </button>
                );
              })}
              {blocks.length === 0 && <p className="absolute inset-x-0 top-1/2 text-center text-sm text-muted">Bu gün için planlı etkinlik yok.</p>}
            </div>
            </>)}

            {calView === "hafta" && (
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map((d, i) => { const s = dstr(d); const items = onDate(s); const isT = s === td;
                  return (<div key={i}
                    onDragOver={dragKind ? (e) => { e.preventDefault(); setDropDay(s); } : undefined}
                    onDragLeave={() => setDropDay((p) => (p === s ? null : p))}
                    onDrop={dragKind ? (e) => { e.preventDefault(); openKind(dragKind, { date: s }); setDragKind(null); setDropDay(null); } : undefined}
                    className={`min-h-[280px] rounded-lg border p-1.5 transition ${dropDay === s && dragKind ? "border-neon-blue ring-2 ring-neon-blue/40 bg-neon-blue/10" : isT ? "border-neon-blue bg-neon-blue/5" : "border-line bg-base/40"}`}>
                    <div className={`mb-2 text-center text-[11px] ${isT ? "font-bold text-neon-blue" : "text-muted"}`}>{TR_GUN[i]} {d.getDate()}</div>
                    <div className="space-y-1">{items.map((e) => <button key={e.key} onClick={() => setModal({ mod: e.mod, rec: e.rec })} className="block w-full rounded px-1.5 py-1 text-left text-[10px] font-medium" style={{ background: `${e.color}18`, color: e.color }}><span className="mb-0.5 flex items-center gap-1"><span className="rounded px-1 text-[7px] font-bold tracking-wide" style={{ background: e.color, color: "#fff" }}>{TIP_META[e.tip]?.kisa || e.tip}</span>{e.time ? <span className="opacity-70">{e.time}</span> : null}</span><span className="line-clamp-2">{e.title}</span></button>)}</div>
                  </div>); })}
              </div>
            )}

            {calView === "ay" && (
              <div className="grid grid-cols-7 gap-1">
                {TR_GUN.map((g) => <div key={g} className="py-1 text-center text-[11px] font-medium text-muted">{g}</div>)}
                {monCells.map((d, i) => { if (d === null) return <div key={i} className="min-h-[76px] rounded-lg bg-base/30" />;
                  const s = `${my}-${pad(mm + 1)}-${pad(d)}`; const items = onDate(s); const isT = s === td;
                  return (<div key={i} onClick={() => { setCur(new Date(my, mm, d).getTime()); setCalView("gun"); }}
                    onDragOver={dragKind ? (e) => { e.preventDefault(); setDropDay(s); } : undefined}
                    onDragLeave={() => setDropDay((p) => (p === s ? null : p))}
                    onDrop={dragKind ? (e) => { e.preventDefault(); openKind(dragKind, { date: s }); setDragKind(null); setDropDay(null); } : undefined}
                    className={`min-h-[76px] cursor-pointer rounded-lg border p-1 transition hover:border-neon-blue/50 ${dropDay === s && dragKind ? "border-neon-blue ring-2 ring-neon-blue/40 bg-neon-blue/10" : isT ? "border-neon-blue bg-neon-blue/5" : "border-line bg-base/40"}`}>
                    <div className={`mb-1 text-right text-[11px] ${isT ? "font-bold text-neon-blue" : "text-muted"}`}>{d}</div>
                    <div className="space-y-0.5">{items.slice(0, 3).map((e) => <div key={e.key} className="flex items-center gap-1 truncate rounded px-1 text-[9px] font-medium" style={{ background: `${e.color}18`, color: e.color }} title={`${TIP_META[e.tip]?.kisa || e.tip}: ${e.title}`}><span className="h-1.5 w-1.5 shrink-0 rounded-sm" style={{ background: e.color }} /><span className="truncate">{e.title}</span></div>)}{items.length > 3 && <p className="px-1 text-[9px] text-faint">+{items.length - 3}</p>}</div>
                  </div>); })}
              </div>
            )}
          </section>

          {/* Sağ: Görevler + Notlar + Dosyalar (her görünümde sabit) */}
          <div className="space-y-4">
            <div className="card p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-bold text-ink">Bugünün Görevleri</h2>
                <button onClick={openNew} className="flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs text-muted transition hover:bg-elevated hover:text-ink"><Plus size={12} /> Ekle</button>
              </div>
              <p className="text-[11px] text-muted">{done}/{gorevler.length} tamamlandı</p>
              <div className="mt-1.5 mb-3 h-1.5 overflow-hidden rounded-full bg-elevated"><div className="h-full rounded-full bg-good" style={{ width: `${pct}%` }} /></div>
              <div className="space-y-1">
                {gorevler.map((r) => {
                  const d = String(r.durum) === "Tamamlandı";
                  return (
                    <div key={r.id} className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition hover:bg-elevated">
                      <button onClick={() => toggle(r)} className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${d ? "border-good bg-good text-white" : "border-line"}`}>{d && <CheckSquare size={10} />}</button>
                      <button onClick={() => setModal({ mod: ajMod!, rec: r })} className={`flex-1 truncate text-left text-sm ${d ? "text-faint line-through" : "text-ink"}`}>{String(r.baslik)}</button>
                      <span className="text-[11px] text-faint nums">{String(r.saat || "")}</span>
                    </div>
                  );
                })}
                {gorevler.length === 0 && <p className="py-3 text-center text-xs text-faint">Bugün için görev yok.</p>}
              </div>
            </div>

            {/* Günün Kayıtları — bu güne düşen not / görev / onay / talep / etkinlik / tutanak (tip etiketli) */}
            <div className="card p-4">
              <h2 className="mb-2.5 flex items-center gap-1.5 text-sm font-bold text-ink"><Bell size={14} className="text-neon-blue" /> Günün Kayıtları <span className="text-[11px] font-normal text-muted">({onDate(curStr).length})</span></h2>
              <div className="space-y-1">
                {onDate(curStr).map((e) => (
                  <button key={e.key} onClick={() => setModal({ mod: e.mod, rec: e.rec })} className="flex w-full items-center gap-2 rounded-lg border border-line bg-base/40 px-2.5 py-1.5 text-left transition hover:border-neon-blue/40">
                    <span className="w-14 shrink-0 rounded px-1 py-0.5 text-center text-[8px] font-bold tracking-wide" style={{ background: `${e.color}1f`, color: e.color }}>{TIP_META[e.tip]?.kisa || e.tip}</span>
                    {e.time ? <span className="shrink-0 text-[10px] text-faint nums">{e.time}</span> : null}
                    <span className="flex-1 truncate text-[13px] text-ink">{e.title}</span>
                  </button>
                ))}
                {onDate(curStr).length === 0 && <p className="py-3 text-center text-xs text-faint">Bu güne düşen kayıt yok.</p>}
              </div>
            </div>

            {/* Hızlı İşlemler — not / görev / etkinlik / dosya / talep ekle (tıkla ya da takvime sürükle) */}
            <div className="card p-4">
              <h2 className="mb-1 flex items-center gap-1.5 text-sm font-bold text-ink"><Plus size={14} className="text-neon-blue" /> Hızlı İşlemler</h2>
              <p className="mb-2.5 text-[11px] text-muted">Tıkla ya da <b className="text-ink">takvime sürükleyip bırak</b> — bırakılan gün/saate eklenir.</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Görev Ekle", icon: CheckSquare, kind: "gorev" },
                  { label: "Etkinlik Ekle", icon: Sun, kind: "etkinlik" },
                  { label: "Not Ekle", icon: FileText, kind: "not" },
                  { label: "Dosya Ekle", icon: Folder, kind: "dosya" },
                  { label: "Talep Ekle", icon: AlertCircle, kind: "talep" },
                  { label: "Tutanak", icon: Bell, kind: "tutanak" },
                ].map((a) => (
                  <button key={a.label} onClick={() => openKind(a.kind)}
                    draggable={a.kind !== "tutanak"}
                    onDragStart={() => setDragKind(a.kind)}
                    onDragEnd={() => { setDragKind(null); setDropH(null); setDropDay(null); }}
                    className={`flex items-center gap-2 rounded-xl border border-line bg-base/40 px-3 py-2.5 text-left text-sm font-medium text-ink transition hover:-translate-y-0.5 hover:border-neon-blue/40 hover:text-neon-blue ${a.kind !== "tutanak" ? "cursor-grab active:cursor-grabbing" : ""} ${dragKind === a.kind ? "opacity-40" : ""}`}>
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-neon-blue/10 text-neon-blue"><a.icon size={15} /></span>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {calView === "liste" && (
        <section className="card p-4"><div className="space-y-3">
          {Object.entries(allEntries.reduce<Record<string, typeof allEntries>>((acc, e) => { (acc[e.date] = acc[e.date] || []).push(e); return acc; }, {})).sort().map(([date, items]) => (
            <div key={date} className="flex gap-3">
              <div className={`w-24 shrink-0 pt-1 text-xs font-semibold ${date === td ? "text-neon-blue" : "text-muted"}`}>{dmy(date)}</div>
              <div className="flex-1 space-y-1">{items.sort((a, b) => a.time.localeCompare(b.time)).map((e) => (
                <button key={e.key} onClick={() => setModal({ mod: e.mod, rec: e.rec })} className="flex w-full items-center gap-2 rounded-lg border border-line bg-base/40 px-3 py-2 text-left transition hover:border-neon-blue/40">
                  <span className="w-16 shrink-0 rounded px-1 py-0.5 text-center text-[9px] font-bold tracking-wide" style={{ background: `${e.color}1f`, color: e.color }}>{TIP_META[e.tip]?.kisa || e.tip}</span>{e.time ? <span className="w-12 text-xs text-muted nums">{e.time}</span> : <span className="w-12" />}<span className="flex-1 truncate text-sm text-ink">{e.title}</span>
                </button>))}</div>
            </div>))}
        </div></section>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-10 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="w-full max-w-2xl rounded-2xl border border-line bg-panel shadow-card animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <h3 className="text-sm font-semibold text-ink">{modal.rec === "new" ? "Yeni Kayıt" : String((modal.rec as DynamicRecord).baslik ?? "Kayıt")}</h3>
              <button onClick={() => setModal(null)} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-elevated"><X size={16} /></button>
            </div>
            <div className="p-4"><RecordForm mod={modal.mod} initial={modal.rec === "new" ? undefined : modal.rec} defaults={modal.rec === "new" ? modal.defaults : undefined} onClose={() => setModal(null)} /></div>
          </div>
        </div>
      )}

      {talepModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-10 backdrop-blur-sm" onClick={() => setTalepModal(false)}>
          <div className="w-full max-w-2xl rounded-2xl border border-line bg-panel shadow-card animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <h3 className="text-sm font-semibold text-ink">Yeni Talep / Form</h3>
              <button onClick={() => setTalepModal(false)} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-elevated"><X size={16} /></button>
            </div>
            <div className="p-4"><TalepForm initial="new" onClose={() => setTalepModal(false)} /></div>
          </div>
        </div>
      )}
    </div>
  );
}
