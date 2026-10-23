import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Printer, Plus, X, AlertCircle, FileText, CheckSquare, Bell, BellRing, Sun, Folder, Search, TrendingUp, BookOpen, Send, Trash2, CheckCircle2, MessageSquare, Check } from "lucide-react";
import { useModules } from "@/context/ModulesContext";
import { useUsers } from "@/context/UsersContext";
import { RecordForm } from "@/components/projects/ProjectTableCard";
import TalepForm from "@/components/requests/TalepForm";
import HatirlatmaModal from "@/components/agenda/HatirlatmaModal";
import MesajGonderModal from "@/components/messaging/MesajGonderModal";
import type { DynamicRecord, DynamicModule } from "@/types/modules";
import type { View } from "@/App";

const TR_AY = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const TR_GUN_UZUN = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
const TR_GUN = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];
const pad = (n: number) => String(n).padStart(2, "0");
const dstr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dmy = (iso: string) => (iso ? iso.split("-").reverse().join(".") : "");
const ONE = 86400000;

const RENK: Record<string, string> = { Mavi: "#0A4EA2", Yeşil: "#1E7A46", Turuncu: "#B5731A", Kırmızı: "#C1292E", Mor: "#4B3FB0", Gri: "#5A6B82" };
// Not renkleri (T-0068) → takvim noktası rengi
const NOT_RENK: Record<string, string> = { Sarı: "#CA8A04", Yeşil: "#16A34A", Mavi: "#2563EB", Pembe: "#DB2777", Mor: "#7C3AED", Gri: "#64748B" };
// Kayıt tipi → renk + kısa etiket (deftere ne olduğunu göster)
const TIP_META: Record<string, { renk: string; kisa: string }> = {
  "Ajanda": { renk: "#0A4EA2", kisa: "AJANDA" },
  "Etkinlik": { renk: "#0d9488", kisa: "ETKİNLİK" },
  "Görev": { renk: "#1E7A46", kisa: "GÖREV" },
  "Not": { renk: "#CA8A04", kisa: "NOT" },
  "Onay": { renk: "#B5731A", kisa: "ONAY" },
  "Talep": { renk: "#C1292E", kisa: "İSTEK" },
  "Tutanak": { renk: "#7C3AED", kisa: "TUTANAK" },
  "Kasa": { renk: "#0891B2", kisa: "KASA" },
};
// Takvim/defter kaynak çeltikleri — hangi türler gösterilsin
const KAYNAKLAR: { key: string; label: string; tips: string[] }[] = [
  { key: "Ajanda", label: "Ajanda", tips: ["Ajanda", "Etkinlik"] },
  { key: "Görevler", label: "Görevler", tips: ["Görev"] },
  { key: "Onaylar", label: "Onaylar", tips: ["Onay"] },
  { key: "İstekler", label: "İstekler", tips: ["Talep"] },
  { key: "Notlar", label: "Notlar", tips: ["Not"] },
  { key: "Toplantı", label: "Toplantı", tips: ["Tutanak"] },
  { key: "Kasa", label: "Kasa", tips: ["Kasa"] },
];
const TIP_TO_KAYNAK: Record<string, string> = Object.fromEntries(KAYNAKLAR.flatMap((k) => k.tips.map((t) => [t, k.key])));
const KASA_KEY = "timay.kasa-defteri.v3";
const kasaTl = (n: number) => (n || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₺";

export default function AjandaDashboard({ onNavigate, projeFilter }: { onNavigate: (v: View) => void; projeFilter?: string }) {
  const { getModule, addRecord, deleteRecord } = useModules();
  const { currentUser } = useUsers();
  const [kaynaklar, setKaynaklar] = useState<Set<string>>(() => new Set(KAYNAKLAR.map((k) => k.key)));
  const toggleKaynak = (k: string) => setKaynaklar((prev) => { const n = new Set(prev); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const [calView, setCalView] = useState<"gun" | "hafta" | "ay" | "liste">("gun");
  const [cur, setCur] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); });
  const [modal, setModal] = useState<{ mod: DynamicModule; rec: DynamicRecord | "new"; defaults?: Record<string, unknown> } | null>(null);
  const [talepModal, setTalepModal] = useState(false);
  const [hatirlatma, setHatirlatma] = useState<{ date?: string } | null>(null);
  const [msgModal, setMsgModal] = useState<{ baslik: string; icerik: string } | null>(null);
  const [q, setQ] = useState("");
  // Deftere hızlı not
  const [noteText, setNoteText] = useState("");
  // Sürükle-ekle: Hızlı İşlemler'den deftere/takvime
  const [dragKind, setDragKind] = useState<string | null>(null);
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
  const matchP = (r: DynamicRecord) => !pf || [r.baslik, r.ad, r.kategori, r.sprint, r.konum, r.toplanti, r.aciklama, r.proje].some((v) => String(v ?? "").toLocaleLowerCase("tr").includes(pf));
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

  // Deftere hızlı not yaz (T-0068) — seçili güne yazılır, defterde "NOT" olarak çıkar
  const saveNote = () => {
    const t = noteText.trim();
    if (!t || !notMod) return;
    addRecord("mod-T-0068", { baslik: t, renk: "Sarı", tarih: curStr, ...(pf ? { aciklama: String(projeFilter) } : {}) });
    setNoteText("");
  };
  // Kullanıcı kendi kaydını silebilir / onaya gönderebilir (onaya gönderince kaynak kaldırılır)
  const silDefter = (e: (typeof allEntries)[number]) => deleteRecord(e.mod.id, String(e.rec.id));
  const onayaGonder = (e: (typeof allEntries)[number]) => {
    addRecord("mod-T-0045", { konu: e.title, tarih: e.date || curStr, durum: "Bekliyor", aciklama: `${TIP_META[e.tip]?.kisa || e.tip} · ${e.title}` });
    deleteRecord(e.mod.id, String(e.rec.id));
  };

  // Hızlı İşlem türüne göre ekleme modalını aç (sürükle-bırak veya tıklama) — isteğe bağlı tarih/saat ile
  const addH = (t: string) => { const [h, m] = t.split(":").map(Number); return `${pad((h + 1) % 24)}:${pad(m || 0)}`; };
  const openKind = (kind: string, opts?: { saat?: string; date?: string }) => {
    const date = opts?.date || curStr; const saat = opts?.saat;
    if (kind === "gorev") setModal({ mod: ajMod!, rec: "new", defaults: { tarih: date, ...(saat ? { saat } : {}), ...pfBaslik } });
    else if (kind === "etkinlik") setModal({ mod: evMod!, rec: "new", defaults: { tarih: date, ...(saat ? { baslangic_saat: saat, bitis_saat: addH(saat) } : {}), ...pfBaslik } });
    else if (kind === "not" && notMod) setModal({ mod: notMod, rec: "new", defaults: { renk: "Sarı", tarih: date, ...pfBaslik } });
    else if (kind === "dosya" && dosMod) setModal({ mod: dosMod, rec: "new" });
    else if (kind === "talep") setTalepModal(true);
    else if (kind === "hatirlatma") setHatirlatma({ date });
    else if (kind === "tutanak") onNavigate("tutanak");
  };

  // Birleşik tarihli kayıtlar — her biri tip etiketli (Not/Görev/Onay/Talep…). Defter + Hafta/Ay/Liste bunu kullanır.
  const allEntries = [
    ...aj.filter((r) => r.tarih).map((r) => ({ key: "a" + r.id, rec: r, mod: ajMod!, date: String(r.tarih), time: String(r.saat || ""), title: String(r.baslik), tip: "Ajanda", color: TIP_META.Ajanda.renk })),
    ...ev.filter((r) => r.tarih).map((r) => ({ key: "e" + r.id, rec: r, mod: evMod!, date: String(r.tarih), time: String(r.baslangic_saat || ""), title: String(r.baslik), tip: "Etkinlik", color: RENK[String(r.renk)] || TIP_META.Etkinlik.renk })),
    ...notlar.filter((r) => r.tarih && r.arsiv !== true).map((r) => ({ key: "n" + r.id, rec: r, mod: notMod!, date: String(r.tarih), time: "", title: String(r.baslik), tip: "Not", color: NOT_RENK[String(r.renk)] || TIP_META.Not.renk })),
    ...tutanaklar.filter((r) => r.tarih).map((r) => ({ key: "t" + r.id, rec: r, mod: tutMod!, date: String(r.tarih), time: "", title: String(r.toplanti), tip: "Tutanak", color: TIP_META.Tutanak.renk })),
    ...gorevRecs.filter((r) => r.termin || r.baslangic).map((r) => ({ key: "g" + r.id, rec: r, mod: gorevMod!, date: String(r.termin || r.baslangic), time: "", title: String(r.baslik), tip: "Görev", color: TIP_META.Görev.renk })),
    ...onayRecs.filter((r) => r.tarih).map((r) => ({ key: "o" + r.id, rec: r, mod: onayMod!, date: String(r.tarih), time: "", title: String(r.konu), tip: "Onay", color: TIP_META.Onay.renk })),
    ...talepRecs.filter((r) => r.tarih).map((r) => ({ key: "q" + r.id, rec: r, mod: talepMod!, date: String(r.tarih), time: "", title: String(r.konu), tip: "Talep", color: TIP_META.Talep.renk })),
  ];
  // Kasa hareketleri (kullanıcının kasa defterinden) — çeltik seçiliyse eklenir
  const kasaEntries = kaynaklar.has("Kasa") ? (() => {
    try {
      const all = JSON.parse(localStorage.getItem(KASA_KEY) || "{}");
      const book = (all[currentUser.id] ?? {}) as Record<string, { entries?: Array<Record<string, unknown>> }>;
      return Object.entries(book).flatMap(([d, day]) => (day.entries ?? []).filter((r) => Number(r.tutar) > 0).map((r, i) => ({
        key: "k" + d + i, rec: {} as DynamicRecord, mod: undefined as unknown as DynamicModule, date: d, time: "",
        title: `${r.yon === "Giren" ? "Giren" : "Çıkan"} · ${String(r.aciklama || r.tur || "Kasa")} · ${kasaTl(Number(r.tutar))}`,
        tip: "Kasa", color: TIP_META.Kasa.renk,
      })));
    } catch { return []; }
  })() : [];
  const shownEntries = [...allEntries, ...kasaEntries].filter((e) => kaynaklar.has(TIP_TO_KAYNAK[e.tip] ?? e.tip));
  const onDate = (s: string) => shownEntries.filter((e) => e.date === s).sort((a, b) => a.time.localeCompare(b.time));
  const defterItems = onDate(curStr);
  const openEntry = (e: { mod: DynamicModule; rec: DynamicRecord; tip: string }) => { if (e.tip === "Kasa" || !e.mod) onNavigate("kasa-defteri"); else setModal({ mod: e.mod, rec: e.rec }); };
  const weekStart = (() => { const d = new Date(cur); const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow); d.setHours(0, 0, 0, 0); return d.getTime(); })();
  const weekDays = Array.from({ length: 7 }, (_, i) => new Date(weekStart + i * ONE));
  const monCells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)];
  while (monCells.length % 7 !== 0) monCells.push(null);

  // Ara — tüm kayıtlarda (hangi yıl olursa olsun) başlık/tarih araması
  const qn = q.trim().toLocaleLowerCase("tr");
  const hits = qn
    ? shownEntries
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

  // Hızlı İşlemler kartı — Gün görünümünde deftere, Hafta/Ay'da takvim hücresine sürüklenir
  const HizliIslemler = () => (
    <div className="card p-4">
      <h2 className="mb-1 flex items-center gap-1.5 text-sm font-bold text-ink"><Plus size={14} className="text-neon-blue" /> Hızlı İşlemler</h2>
      <p className="mb-2.5 text-[11px] text-muted">Tıkla ya da <b className="text-ink">{calView === "gun" ? "deftere" : "takvime"} sürükleyip bırak</b> — seçili güne eklenir ve deftere yazılır.</p>
      <div className="grid grid-cols-2 gap-1.5">
        {[
          { label: "Görev", icon: CheckSquare, kind: "gorev", bg: "#BBF7D0", bd: "#4ADE80" },
          { label: "Etkinlik", icon: Sun, kind: "etkinlik", bg: "#CCFBF1", bd: "#2DD4BF" },
          { label: "Not", icon: FileText, kind: "not", bg: "#FEF08A", bd: "#FACC15" },
          { label: "Hatırlatma", icon: BellRing, kind: "hatirlatma", bg: "#E9D5FF", bd: "#A78BFA" },
          { label: "Dosya", icon: Folder, kind: "dosya", bg: "#FDE68A", bd: "#F59E0B" },
          { label: "İstek", icon: AlertCircle, kind: "talep", bg: "#FECACA", bd: "#F87171" },
          { label: "Tutanak", icon: Bell, kind: "tutanak", bg: "#DDD6FE", bd: "#8B5CF6" },
        ].map((a) => (
          <button key={a.label} onClick={() => openKind(a.kind)}
            draggable={a.kind !== "tutanak"}
            onDragStart={() => setDragKind(a.kind)}
            onDragEnd={() => { setDragKind(null); setDropDay(null); }}
            className={`flex items-center gap-2 rounded-xl border border-line bg-base/40 px-2.5 py-2 text-left text-xs font-medium text-ink transition hover:-translate-y-0.5 hover:border-neon-blue/40 ${a.kind !== "tutanak" ? "cursor-grab active:cursor-grabbing" : ""} ${dragKind === a.kind ? "opacity-40" : ""}`}>
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ background: a.bd + "22", color: a.bd }}><a.icon size={14} /></span> {a.label}
          </button>
        ))}
      </div>
    </div>
  );

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
        <div className="flex items-center gap-2">
          <button onClick={() => setMsgModal({ baslik: `Ajanda (PDF) — ${dmy(curStr)}`, icerik: defterItems.length ? defterItems.map((e) => `${TIP_META[e.tip]?.kisa || e.tip}${e.time ? " " + e.time : ""} · ${e.title}`).join("\n") : "Bu güne düşen kayıt yok." })} title="Bu günün ajandasını (PDF) seçilen kullanıcıya mesaj olarak gönder" className="no-print flex items-center gap-1.5 rounded-lg border border-neon-blue/40 bg-neon-blue/10 px-3 py-2 text-sm font-medium text-neon-blue transition hover:bg-neon-blue/20"><MessageSquare size={15} /> Mesaj Gönder</button>
          <button onClick={() => window.print()} className="no-print grid h-9 w-9 place-items-center rounded-lg border border-line text-muted transition hover:bg-elevated hover:text-ink" title="Yazdır"><Printer size={16} /></button>
        </div>
      </div>

      {/* Görünüm seçici + kaynak çeltikleri — seçili türler takvim/defterde gösterilir */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-0.5 rounded-xl border border-line bg-base/40 p-0.5"><VBtn v="gun" label="Gün" /><VBtn v="hafta" label="Hafta" /><VBtn v="ay" label="Ay" /><VBtn v="liste" label="Ajanda" /></div>
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-base/40 px-2 py-1">
          {KAYNAKLAR.map((k) => { const on = kaynaklar.has(k.key); const m = TIP_META[k.tips[0]]; return (
            <button key={k.key} onClick={() => toggleKaynak(k.key)} title={on ? "Gizle" : "Göster"}
              className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[12px] font-semibold transition ${on ? "text-white" : "border-line bg-panel text-muted hover:text-ink"}`}
              style={on ? { background: m.renk, borderColor: m.renk } : undefined}>
              <span className={`grid h-3.5 w-3.5 place-items-center rounded border ${on ? "border-white/70 bg-white/20" : "border-line"}`}>{on ? <Check size={10} className="text-white" /> : null}</span>
              {k.label}
            </button>
          ); })}
        </div>
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

      {/* GÜN — büyük Defter (solda) + Hızlı İşlemler (sağda) */}
      {calView === "gun" && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          {/* Sol: Hızlı İşlemler */}
          <div className="space-y-4 lg:order-first"><HizliIslemler /></div>
          {/* Defter */}
          <section
            onDragOver={dragKind ? (e) => { e.preventDefault(); setDropDay(curStr); } : undefined}
            onDragLeave={() => setDropDay((p) => (p === curStr ? null : p))}
            onDrop={dragKind ? (e) => { e.preventDefault(); openKind(dragKind, { date: curStr }); setDragKind(null); setDropDay(null); } : undefined}
            className={`card min-w-0 p-6 transition ${dropDay === curStr && dragKind ? "ring-2 ring-neon-blue/50" : ""}`}
          >
            {/* Defter başlığı — büyük tarih + ay + gün + hava, sağda mini ay */}
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

            {/* Defter satırları — bu güne düşen tüm hareketler (tip etiketli) */}
            <div className="mt-4 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-ink"><BookOpen size={15} className="text-neon-blue" /> Günün Defteri <span className="text-[11px] font-normal text-muted">({defterItems.length} kayıt)</span></h2>
              <button onClick={openNew} className="flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs text-muted transition hover:bg-elevated hover:text-ink"><Plus size={12} /> Kayıt</button>
            </div>
            <div className="mt-3 space-y-1.5">
              {defterItems.map((e) => (
                <div key={e.key} className="group flex w-full items-center gap-3 rounded-lg border border-line bg-base/40 px-3 py-2.5 transition hover:border-neon-blue/40 hover:bg-elevated">
                  <button onClick={() => openEntry(e)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <span className="w-20 shrink-0 rounded px-1.5 py-0.5 text-center text-[9px] font-bold tracking-wide" style={{ background: `${e.color}1f`, color: e.color }}>{TIP_META[e.tip]?.kisa || e.tip}</span>
                    {e.time ? <span className="w-12 shrink-0 text-xs text-faint nums">{e.time}</span> : <span className="w-12 shrink-0" />}
                    <span className="flex-1 truncate text-[14px] text-ink">{e.title}</span>
                  </button>
                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                    <button onClick={() => setMsgModal({ baslik: `${TIP_META[e.tip]?.kisa || e.tip} · ${dmy(e.date)}`, icerik: e.title })} title="Mesaj olarak gönder" className="grid h-7 w-7 place-items-center rounded-lg text-faint transition hover:bg-neon-blue/10 hover:text-neon-blue"><MessageSquare size={15} /></button>
                    {e.tip !== "Kasa" && <button onClick={() => onayaGonder(e)} title="Onaya gönder" className="grid h-7 w-7 place-items-center rounded-lg text-faint transition hover:bg-neon-blue/10 hover:text-neon-blue"><CheckCircle2 size={15} /></button>}
                    {e.tip !== "Kasa" && <button onClick={() => silDefter(e)} title="Sil" className="grid h-7 w-7 place-items-center rounded-lg text-faint transition hover:bg-critical/10 hover:text-critical"><Trash2 size={15} /></button>}
                  </div>
                </div>
              ))}
              {defterItems.length === 0 && (
                <div className="rounded-lg border border-dashed border-line py-10 text-center">
                  <BookOpen size={22} className="mx-auto mb-2 text-faint" />
                  <p className="text-sm text-muted">Bu güne düşen kayıt yok.</p>
                  <p className="mt-0.5 text-[11px] text-faint">Hızlı İşlemler'den sürükleyip bırakın ya da aşağıya not yazın.</p>
                </div>
              )}
            </div>

            {/* Deftere hızlı not yaz */}
            <div className="mt-4 flex items-center gap-2 border-t border-line pt-4">
              <FileText size={15} className="shrink-0 text-neon-blue" />
              <input
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveNote(); }}
                placeholder="Deftere not yaz…"
                className="flex-1 rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink outline-none transition focus:border-neon-blue focus:ring-2 focus:ring-neon-blue/20"
              />
              <button onClick={saveNote} disabled={!noteText.trim()} className="flex items-center gap-1 rounded-lg bg-neon-blue px-3 py-2 text-sm font-medium text-white transition hover:bg-neon-blue/90 disabled:opacity-40"><Send size={14} /> Ekle</button>
            </div>
          </section>
        </div>
      )}

      {/* HAFTA / AY — Hızlı İşlemler (solda) + takvim (sağda) */}
      {(calView === "hafta" || calView === "ay") && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-4 lg:order-first"><HizliIslemler /></div>
          <section className="card min-w-0 p-6">
            {calView === "hafta" && (
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map((d, i) => { const s = dstr(d); const items = onDate(s); const isT = s === td;
                  return (<div key={i}
                    onDragOver={dragKind ? (e) => { e.preventDefault(); setDropDay(s); } : undefined}
                    onDragLeave={() => setDropDay((p) => (p === s ? null : p))}
                    onDrop={dragKind ? (e) => { e.preventDefault(); openKind(dragKind, { date: s }); setDragKind(null); setDropDay(null); } : undefined}
                    className={`min-h-[280px] rounded-lg border p-1.5 transition ${dropDay === s && dragKind ? "border-neon-blue ring-2 ring-neon-blue/40 bg-neon-blue/10" : isT ? "border-neon-blue bg-neon-blue/5" : "border-line bg-base/40"}`}>
                    <div className={`mb-2 text-center text-[11px] ${isT ? "font-bold text-neon-blue" : "text-muted"}`}>{TR_GUN[i]} {d.getDate()}</div>
                    <div className="space-y-1">{items.map((e) => <button key={e.key} onClick={() => openEntry(e)} className="block w-full rounded px-1.5 py-1 text-left text-[10px] font-medium" style={{ background: `${e.color}18`, color: e.color }}><span className="mb-0.5 flex items-center gap-1"><span className="rounded px-1 text-[7px] font-bold tracking-wide" style={{ background: e.color, color: "#fff" }}>{TIP_META[e.tip]?.kisa || e.tip}</span>{e.time ? <span className="opacity-70">{e.time}</span> : null}</span><span className="line-clamp-2">{e.title}</span></button>)}</div>
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
        </div>
      )}

      {/* AJANDA (liste) — tüm tarihli kayıtlar */}
      {calView === "liste" && (
        <section className="card p-4"><div className="space-y-3">
          {Object.entries(shownEntries.reduce<Record<string, typeof shownEntries>>((acc, e) => { (acc[e.date] = acc[e.date] || []).push(e); return acc; }, {})).sort().map(([date, items]) => (
            <div key={date} className="flex gap-3">
              <div className={`w-24 shrink-0 pt-1 text-xs font-semibold ${date === td ? "text-neon-blue" : "text-muted"}`}>{dmy(date)}</div>
              <div className="flex-1 space-y-1">{items.sort((a, b) => a.time.localeCompare(b.time)).map((e) => (
                <button key={e.key} onClick={() => openEntry(e)} className="flex w-full items-center gap-2 rounded-lg border border-line bg-base/40 px-3 py-2 text-left transition hover:border-neon-blue/40">
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

      {hatirlatma && <HatirlatmaModal defaultDate={hatirlatma.date} onClose={() => setHatirlatma(null)} />}
      {msgModal && <MesajGonderModal baslik={msgModal.baslik} icerik={msgModal.icerik} onClose={() => setMsgModal(null)} />}
    </div>
  );
}
