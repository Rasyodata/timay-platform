import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Wallet, ChevronLeft, ChevronRight, Plus, Trash2, Printer, Mail, ArrowDownLeft, ArrowUpRight, Search, MessageSquare } from "lucide-react";
import { useUsers } from "@/context/UsersContext";
import { useModules } from "@/context/ModulesContext";
import { openReport } from "@/lib/tableReport";
import { useDefterHareketi } from "@/hooks/useDefterHareketi";
import MesajGonderModal from "@/components/messaging/MesajGonderModal";

// Kasa türü → Defter Hareketleri "İlgili Tür"
const turToIlgiliTur = (tur: string): string =>
  /Cari|Tedarikçi|Tahsilat/.test(tur) ? "Cari"
  : tur === "Dava" ? "Dava"
  : /Masraf|Vergi/.test(tur) ? "Masraf"
  : tur === "Personel" ? "Kullanıcı"
  : tur === "Avukat" ? "Avukat"
  : /Kasa|Banka/.test(tur) ? "Kasa/Banka"
  : "Cari";

const STORAGE_KEY = "timay.kasa-defteri.v3";
const pad = (n: number) => String(n).padStart(2, "0");
const dstr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dmy = (iso: string) => (iso ? iso.split("-").reverse().join(".") : "");
const ONE = 86400000;
const TR_AY = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const TR_GUN = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
const tl = (n: number) => (n || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₺";

type Yon = "Giren" | "Çıkan";
type Row = { id: string; tarih?: string; yon: Yon; tur?: string; ilgili?: string; aciklama: string; tutar: number; hedefMod?: string; hedefBase?: Record<string, unknown>; propagated?: boolean };
type DayBook = { devir?: number; entries: Row[] };
type Book = Record<string, DayBook>;

const TUR_LISTE = ["Cari", "Kasa", "Banka", "Dava", "Avukat", "Personel", "Masraf", "Tahsilat", "Vergi", "Tedarikçi", "Diğer"];
// Hızlı işlemler — tıkla ya da tabloya sürükle; yön + tür hazır gelir
type Quick = { label: string; yon: Yon; tur: string };
const QUICK: Quick[] = [
  { label: "Tahsilat", yon: "Giren", tur: "Tahsilat" },
  { label: "Ödeme", yon: "Çıkan", tur: "Masraf" },
  { label: "Gider", yon: "Çıkan", tur: "Masraf" },
  { label: "Avans", yon: "Çıkan", tur: "Personel" },
  { label: "Cari Ödeme", yon: "Çıkan", tur: "Cari" },
  { label: "Cari Tahsilat", yon: "Giren", tur: "Cari" },
  { label: "Banka Para Çekme", yon: "Giren", tur: "Banka" },
  { label: "Banka Para Yatırma", yon: "Çıkan", tur: "Banka" },
  { label: "Dava Tahsilat", yon: "Giren", tur: "Dava" },
  { label: "Dava Ödeme", yon: "Çıkan", tur: "Dava" },
  { label: "Dava Masraf", yon: "Çıkan", tur: "Dava" },
];

const loadAll = (): Record<string, Book> => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; } };
const rid = () => "k" + Math.random().toString(36).slice(2, 9);

// Türe göre "Alan" seçicisinin etiketi
const alanLabel = (tur: string): string =>
  /Masraf|Vergi/.test(tur) ? "Masraf ara…"
  : tur === "Dava" ? "Dava seç…"
  : /Cari|Tedarikçi|Tahsilat/.test(tur) ? "Cari seç…"
  : tur === "Avukat" ? "Avukat seç…"
  : tur === "Personel" ? "Personel seç…"
  : /Kasa|Banka/.test(tur) ? "Kasa / Banka seç…"
  : "Alan…";

const lc = (s: string) => s.toLocaleLowerCase("tr");

/** Muhasebe tarzı tutar girişi — odakta düz yazılır, odaktan çıkınca binlik ayraçlı (1.234,56) gösterilir. */
function TutarInput({ value, onChange, onBlur, className, placeholder }: { value: number; onChange: (n: number) => void; onBlur?: () => void; className?: string; placeholder?: string }) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState("");
  const fmt = (n: number) => (n || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const parse = (s: string) => { const c = s.replace(/\s/g, "").replace(/\./g, "").replace(",", "."); const n = parseFloat(c); return isNaN(n) ? 0 : n; };
  const display = focused ? draft : (value ? fmt(value) : "");
  return (
    <input type="text" inputMode="decimal" value={display} placeholder={placeholder} className={className}
      onFocus={() => { setFocused(true); setDraft(value ? String(value).replace(".", ",") : ""); }}
      onChange={(e) => { setDraft(e.target.value); onChange(parse(e.target.value)); }}
      onBlur={() => { setFocused(false); onBlur?.(); }} />
  );
}

/** Aranabilir açılır seçici — çok kayıt olunca yaz-filtrele; dropdown portal ile taşmadan açılır. */
function SearchSelect({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const openDrop = () => { if (ref.current) setRect(ref.current.getBoundingClientRect()); setQ(""); setOpen(true); };
  const close = () => { setOpen(false); setQ(""); };
  const filtered = q.trim() ? options.filter((o) => lc(o).includes(lc(q))) : options;
  const inpCls = "w-full rounded border border-black/10 bg-white/60 px-1.5 py-0.5 text-[11px] text-ink outline-none focus:border-neon-blue";
  return (
    <>
      <input
        ref={ref}
        className={inpCls}
        value={open ? q : value}
        placeholder={placeholder}
        onFocus={openDrop}
        onChange={(e) => { if (!open) openDrop(); setQ(e.target.value); }}
        onBlur={() => window.setTimeout(close, 160)}
      />
      {open && rect && createPortal(
        <div style={{ position: "fixed", top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, 220), zIndex: 9999 }}
          className="max-h-60 overflow-auto rounded-lg border border-black/10 bg-white shadow-2xl">
          {options.length > 7 && (
            <div className="sticky top-0 flex items-center gap-1 border-b border-black/5 bg-white/95 px-2 py-1 text-[11px] text-ink/40"><Search size={11} /> {q.trim() ? `${filtered.length} sonuç` : `${options.length} kayıt — yazarak arayın`}</div>
          )}
          {value && (
            <button type="button" onMouseDown={(e) => { e.preventDefault(); onChange(""); close(); }} className="block w-full px-3 py-1.5 text-left text-[12px] text-ink/40 hover:bg-black/5">— temizle —</button>
          )}
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-[12px] text-ink/40">Eşleşen yok</div>
          ) : filtered.map((o) => (
            <button key={o} type="button"
              onMouseDown={(e) => { e.preventDefault(); onChange(o); close(); }}
              className={`block w-full px-3 py-1.5 text-left text-[13px] hover:bg-neon-blue/10 ${o === value ? "bg-neon-blue/5 font-semibold text-neon-blue" : "text-ink"}`}>
              {o}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

export default function KasaDefteri() {
  const { currentUser, users } = useUsers();
  const { addRecord, getModule } = useModules();
  const logHareket = useDefterHareketi();
  const davalar = (getModule("mod-T-0016")?.records ?? []) as Array<Record<string, unknown>>;
  const avukatlar = (getModule("mod-T-0017")?.records ?? []) as Array<Record<string, unknown>>;
  const kasalar = (getModule("mod-T-0006")?.records ?? []) as Array<Record<string, unknown>>;
  const masrafKartlari = (getModule("mod-T-0008")?.records ?? []) as Array<Record<string, unknown>>;

  const [allData, setAllData] = useState<Record<string, Book>>(loadAll);
  const [cur, setCur] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); });
  const [dragAct, setDragAct] = useState<Quick | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(allData)); } catch { /* kota */ } }, [allData]);

  const uid = currentUser.id;
  const book: Book = allData[uid] ?? {};
  const setBook = (fn: (b: Book) => Book) => setAllData((d) => ({ ...d, [uid]: fn(d[uid] ?? {}) }));

  const curDate = new Date(cur);
  const curStr = dstr(curDate);
  const day: DayBook = book[curStr] ?? { entries: [] };
  const entries = day.entries ?? [];

  // Dünden devir = bugünden önceki tüm giren-çıkan bakiyesi (manuel override varsa o)
  const cumulativeBefore = useMemo(() => {
    let bal = 0;
    for (const [d, b] of Object.entries(book)) {
      if (d >= curStr) continue;
      for (const e of b.entries ?? []) bal += (e.yon === "Giren" ? 1 : -1) * (Number(e.tutar) || 0);
    }
    return bal;
  }, [book, curStr]);
  const dundenDevir = day.devir ?? cumulativeBefore;
  const girenTop = entries.filter((e) => e.yon === "Giren").reduce((s, e) => s + (Number(e.tutar) || 0), 0);
  const cikanTop = entries.filter((e) => e.yon === "Çıkan").reduce((s, e) => s + (Number(e.tutar) || 0), 0);
  const yarinaDevir = dundenDevir + girenTop - cikanTop;
  // Yürüyen bakiye
  let run = dundenDevir;
  const withBal = entries.map((e) => { run += (e.yon === "Giren" ? 1 : -1) * (Number(e.tutar) || 0); return { e, bakiye: run }; });

  const setDay = (patch: Partial<DayBook>) => setBook((b) => { const base: DayBook = b[curStr] ?? { entries: [] }; return { ...b, [curStr]: { ...base, ...patch } }; });
  const addEntry = (e: Partial<Row>) => setDay({ entries: [...entries, { id: rid(), tarih: curStr, yon: "Giren", tur: "", ilgili: "", aciklama: "", tutar: 0, ...e }] });
  const updEntry = (id: string, patch: Partial<Row>) => setDay({ entries: entries.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  const delEntry = (id: string) => setDay({ entries: entries.filter((r) => r.id !== id) });
  const setDevirOverride = (v: string) => { const n = v.trim() === "" ? undefined : Number(v); setDay({ devir: isNaN(n as number) ? undefined : n }); };

  // Türe göre "İlgili" seçenekleri
  const ilgiliOpts = (tur: string): string[] => {
    if (/Cari|Tedarikçi|Tahsilat/.test(tur)) return users.map((u) => u.name);
    if (tur === "Dava") return davalar.map((d) => `${d.dosya_no} · ${d.dosya_konusu}`);
    if (tur === "Avukat") return avukatlar.map((a) => String(a.avukat)).filter(Boolean);
    if (tur === "Personel") return users.filter((u) => u.active).map((u) => u.name);
    if (/Kasa|Banka/.test(tur)) return kasalar.map((k) => String(k.ad)).filter(Boolean);
    if (/Masraf|Vergi/.test(tur)) return masrafKartlari.map((m) => String(m.ad)).filter(Boolean);
    return [];
  };

  // Türe göre hangi finans tablosuna işlenecek (elle eklenen/değiştirilen satırlar için)
  const hedefForTur = (tur: string, yon: Yon): { mod: string; base: Record<string, unknown> } | null => {
    switch (tur) {
      case "Cari": case "Tedarikçi": return { mod: "mod-T-0005", base: {} };
      case "Tahsilat": return { mod: "mod-T-0007", base: { islem_turu: "Giriş (+)", onay_durumu: "Onaylandı" } };
      case "Kasa": return { mod: "mod-T-0007", base: { islem_turu: yon === "Giren" ? "Giriş (+)" : "Çıkış (−)" } };
      case "Banka": return { mod: "mod-T-0007", base: { islem_turu: yon === "Giren" ? "Giriş (+)" : "Çıkış (−)", kasa: "Banka" } };
      case "Masraf": case "Vergi": case "Personel": case "Avukat": return { mod: "mod-T-0010", base: { onay_durumu: "Taslak" } };
      case "Dava": return { mod: "mod-T-0084", base: { tur: yon === "Giren" ? "Tahsilat (+)" : "Masraf (−)", kalem: yon === "Giren" ? "Vekâlet Ücreti" : "Dosya Masrafı" } };
      default: return null;
    }
  };

  // Hızlı işlem → hangi tabloya işlenecek
  const hedefFor = (label: string): { mod: string; base: Record<string, unknown> } | null => {
    switch (label) {
      case "Tahsilat": return { mod: "mod-T-0007", base: { islem_turu: "Giriş (+)", onay_durumu: "Onaylandı" } };
      case "Ödeme": return { mod: "mod-T-0007", base: { islem_turu: "Çıkış (−)" } };
      case "Gider": return { mod: "mod-T-0010", base: { onay_durumu: "Bekliyor" } };
      case "Avans": return { mod: "mod-T-0010", base: { onay_durumu: "Bekliyor" } };
      case "Cari Ödeme": case "Cari Tahsilat": return { mod: "mod-T-0005", base: {} };
      case "Banka Para Çekme": return { mod: "mod-T-0007", base: { islem_turu: "Giriş (+)", kasa: "Banka" } };
      case "Banka Para Yatırma": return { mod: "mod-T-0007", base: { islem_turu: "Çıkış (−)", kasa: "Banka" } };
      case "Dava Ödeme": return { mod: "mod-T-0084", base: { tur: "Masraf (−)", kalem: "Diğer" } };
      case "Dava Tahsilat": return { mod: "mod-T-0084", base: { tur: "Tahsilat (+)", kalem: "Vekâlet Ücreti" } };
      case "Dava Masraf": return { mod: "mod-T-0084", base: { tur: "Masraf (−)", kalem: "Dosya Masrafı" } };
      default: return null;
    }
  };
  const addQuick = (q: Quick) => { const h = hedefFor(q.label); addEntry({ yon: q.yon, tur: q.tur, aciklama: q.label, hedefMod: h?.mod, hedefBase: h?.base }); };
  // Tutar girilip alandan çıkınca ilgili tabloya işle (bir kez)
  const propagate = (r: Row) => {
    if (r.propagated || !(Number(r.tutar) > 0)) return;
    // Hızlı işlemle gelen hedef yoksa türe göre türet (elle eklenen satırlar)
    const hedefMod = r.hedefMod ?? hedefForTur(r.tur || "", r.yon)?.mod;
    const hedefBase = r.hedefMod ? (r.hedefBase ?? {}) : (hedefForTur(r.tur || "", r.yon)?.base ?? {});
    if (!hedefMod) return;
    const data: Record<string, unknown> = { ...hedefBase, tarih: r.tarih || curStr, tutar: Number(r.tutar), aciklama: r.aciklama };
    if (hedefMod === "mod-T-0005") { if (r.yon === "Giren") data.alacak = Number(r.tutar); else data.borc = Number(r.tutar); data.kayit_tarihi = r.tarih || curStr; }
    const ilg = r.ilgili || "";
    if (ilg) {
      if (hedefMod === "mod-T-0007") data.cari = ilg;
      else if (hedefMod === "mod-T-0010") { if (/Personel|Avukat/.test(r.tur || "")) data.personel = ilg; else data.masraf_karti = ilg; }
      else if (hedefMod === "mod-T-0005") data.cari_kod = ilg;
      else if (hedefMod === "mod-T-0084") data.dosya_no = ilg.split(" · ")[0];
    }
    addRecord(hedefMod, data);
    // Defterler arası bağlantı: ilgili varlığın defterine de düşsün (örn. cari/dava/proje/masraf)
    if (ilg) {
      logHareket({
        tarih: r.tarih || curStr, kaynak: "Kasa Defteri",
        hareket: `${r.yon} · ${r.aciklama || r.tur}`,
        ilgili_tur: turToIlgiliTur(r.tur || ""), ilgili: ilg,
        tutar: Number(r.tutar), aciklama: `${currentUser.name} kasası · ${r.aciklama || r.tur}`,
        ref: `kasa-${r.id}`,
      });
    }
    updEntry(r.id, { propagated: true, hedefMod });
    setNote(`"${r.aciklama || r.tur}" ${tl(Number(r.tutar))} finans + ilgili deftere işlendi ✓`);
    window.setTimeout(() => setNote(""), 2800);
  };

  const nav = (d: number) => setCur((c) => c + d * ONE);
  const bugun = () => { const d = new Date(); d.setHours(0, 0, 0, 0); setCur(d.getTime()); };

  const defterText = () => {
    const satir = withBal.map(({ e, bakiye }) => `${dmy(e.tarih || curStr)} · ${e.yon} · ${e.tur || "-"}${e.ilgili ? ` (${e.ilgili})` : ""} · ${e.aciklama || "-"} · ${e.yon === "Giren" ? "+" : "−"}${tl(e.tutar)} · Bakiye ${tl(bakiye)}`).join("\n");
    return [`${currentUser.name} — KASA DEFTERİ (${dmy(curStr)})`, `Dünden Devir: ${tl(dundenDevir)}`, "", satir, "", `Girenler: ${tl(girenTop)} · Çıkanlar: ${tl(cikanTop)} · Yarına Devir: ${tl(yarinaDevir)}`].join("\n");
  };
  const yazdir = () => {
    openReport({
      title: "Kasa Raporu",
      code: `${currentUser.name.toLocaleUpperCase("tr-TR")} · ${dmy(curStr)}`,
      subtitle: `${currentUser.name} — ${curDate.getDate()} ${TR_AY[curDate.getMonth()]} ${curDate.getFullYear()} ${TR_GUN[(curDate.getDay() + 6) % 7]} · ${entries.length} hareket`,
      summary: [
        { label: "Dünden Devir", value: tl(dundenDevir), tone: dundenDevir < 0 ? "neg" : "accent" },
        { label: "Girenler", value: tl(girenTop), tone: "pos" },
        { label: "Çıkanlar", value: tl(cikanTop), tone: "neg" },
        { label: "Yarına Devir", value: tl(yarinaDevir), tone: yarinaDevir < 0 ? "neg" : "accent" },
      ],
      columns: [
        { label: "Tarih" }, { label: "Yön" }, { label: "Tür" }, { label: "Alan" }, { label: "Açıklama" },
        { label: "Giren", align: "right" }, { label: "Çıkan", align: "right" }, { label: "Bakiye", align: "right" },
      ],
      rows: withBal.map(({ e, bakiye }) => [
        { text: dmy(e.tarih || curStr) },
        { text: e.yon, tone: e.yon === "Giren" ? "pos" : "neg" },
        { text: e.tur || "—" },
        { text: e.ilgili || "—", tone: e.ilgili ? undefined : "muted" },
        { text: e.aciklama || "—" },
        { text: e.yon === "Giren" ? tl(e.tutar) : "—", align: "right", tone: e.yon === "Giren" ? "pos" : "muted" },
        { text: e.yon === "Çıkan" ? tl(e.tutar) : "—", align: "right", tone: e.yon === "Çıkan" ? "neg" : "muted" },
        { text: tl(bakiye), align: "right", tone: "strong" },
      ]),
      footRows: [[
        { text: `Dünden Devir ${tl(dundenDevir)} · Sayfa Toplamları`, colSpan: 5, align: "right" },
        { text: tl(girenTop), align: "right", tone: "pos" },
        { text: tl(cikanTop), align: "right", tone: "neg" },
        { text: `Yarına ${tl(yarinaDevir)}`, align: "right", tone: "accent" },
      ]],
      footNote: `Kasa Raporu · ${currentUser.name} · ${dmy(curStr)} tarihli defter · Timay Platform`,
    });
  };
  const gonder = () => { window.location.href = `mailto:?subject=${encodeURIComponent(`Kasa Defteri — ${currentUser.name} — ${dmy(curStr)}`)}&body=${encodeURIComponent(defterText())}`; };
  const [msgOpen, setMsgOpen] = useState(false);

  const inp = "w-full rounded border border-black/10 bg-white/60 px-1.5 py-0.5 text-[11px] text-ink outline-none focus:border-neon-blue";
  const th = "px-2 py-1 text-left text-[9px] font-semibold uppercase tracking-wide text-ink/45";
  // Çizgili defter zemini (ajanda sayfası gibi) — satır yüksekliğiyle hizalı yatay çizgiler
  const ruled = { backgroundImage: "repeating-linear-gradient(transparent, transparent 28px, rgba(30,64,120,0.09) 28px, rgba(30,64,120,0.09) 29px)" };

  return (
    <div className="mx-auto max-w-[1440px] space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-ink"><Wallet size={22} className="text-neon-blue" /> {currentUser.name} · Kasa Defteri <span className="rounded-md border border-line bg-base/60 px-1.5 py-0.5 font-mono text-[11px] font-normal text-muted">KASA</span></h1>
          <p className="mt-1 text-sm text-muted">Kişisel kasa defteriniz · tek sayfa · yürüyen bakiye · yarına devir otomatik</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={yazdir} className="no-print flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm text-muted transition hover:bg-elevated hover:text-ink"><Printer size={15} /> Yazdır</button>
          <button onClick={gonder} className="no-print flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm text-muted transition hover:bg-elevated hover:text-ink"><Mail size={15} /> Gönder</button>
          <button onClick={() => setMsgOpen(true)} className="no-print flex items-center gap-1.5 rounded-lg border border-neon-blue/40 bg-neon-blue/10 px-3 py-1.5 text-sm font-medium text-neon-blue transition hover:bg-neon-blue/20"><MessageSquare size={15} /> Mesaj Gönder</button>
        </div>
      </div>

      {/* Tarih seçici */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={bugun} className="rounded-lg border border-line bg-panel px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-elevated">Bugün</button>
        <button onClick={() => nav(-1)} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted hover:bg-elevated"><ChevronLeft size={16} /></button>
        <button onClick={() => nav(1)} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted hover:bg-elevated"><ChevronRight size={16} /></button>
        <span className="ml-1 text-base font-bold text-ink">{curDate.getDate()} {TR_AY[curDate.getMonth()]} {curDate.getFullYear()} · {TR_GUN[(curDate.getDay() + 6) % 7]}</span>
      </div>

      {note && <div className="rounded-lg border border-good/30 bg-good/10 px-3 py-2 text-sm text-good animate-fade-in">{note}</div>}

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Tek sayfa defter */}
        <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-black/10 shadow-[0_8px_24px_rgba(0,0,0,0.12)]" style={{ background: "#FBF7EC" }}>
          <div className="flex items-center justify-between gap-2 border-b border-black/10 bg-black/[0.03] px-3 py-2">
            <div className="flex items-center gap-2 text-[12px]">
              <span className="font-semibold text-amber-800">Dünden Devir</span>
              <input value={day.devir ?? ""} onChange={(e) => setDevirOverride(e.target.value)} placeholder={String(cumulativeBefore.toFixed(2))} type="number"
                className="w-28 rounded border border-amber-300 bg-white/80 px-2 py-0.5 text-right text-[13px] font-semibold text-amber-900 outline-none nums" title="Boş = otomatik (önceki bakiye); elle gir = değiştir" />
            </div>
            <button onClick={() => addEntry({})} className="flex items-center gap-1 rounded-md border border-black/10 bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-ink/70 transition hover:text-neon-blue"><Plus size={12} /> Satır Ekle</button>
          </div>
          <div onDragOver={dragAct ? (e) => e.preventDefault() : undefined} onDrop={dragAct ? (e) => { e.preventDefault(); addQuick(dragAct); setDragAct(null); } : undefined}
            style={ruled}
            className={`relative overflow-x-auto transition ${dragAct ? "ring-2 ring-inset ring-neon-blue/40" : ""}`}>
            {/* defter sol kenar kırmızı marj çizgisi */}
            <div className="pointer-events-none absolute inset-y-0 left-[84px] z-0 w-px bg-red-400/30" />
            <table className="relative z-10 w-full border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-black/10 bg-black/[0.02]">
                  <th className={`${th} w-[92px]`}>Tarih</th><th className={`${th} w-20`}>Yön</th><th className={`${th} w-24`}>Tür</th><th className={`${th} w-36`}>Alan</th>
                  <th className={th}>Açıklama</th><th className={`${th} w-24 text-right`}>Giren</th><th className={`${th} w-24 text-right`}>Çıkan</th><th className={`${th} w-28 text-right`}>Bakiye</th><th className="w-6" />
                </tr>
              </thead>
              <tbody>
                {withBal.map(({ e: r, bakiye }) => { const iOpts = ilgiliOpts(r.tur || ""); return (
                  <tr key={r.id} className="group border-b border-sky-900/10 align-middle">
                    <td className="px-1 py-1"><input value={r.tarih || curStr} onChange={(ev) => updEntry(r.id, { tarih: ev.target.value })} type="date" className={`${inp} text-[10px]`} /></td>
                    <td className="px-1 py-1">
                      <select value={r.yon} onChange={(ev) => { const y = ev.target.value as Yon; const h = hedefForTur(r.tur || "", y); updEntry(r.id, { yon: y, ...(h ? { hedefBase: h.base } : {}) }); }} className={`${inp} ${r.yon === "Giren" ? "text-good" : "text-critical"} font-semibold`}>
                        <option value="Giren">Giren</option><option value="Çıkan">Çıkan</option>
                      </select>
                    </td>
                    <td className="px-1 py-1">
                      <select value={r.tur || ""} onChange={(ev) => { const h = hedefForTur(ev.target.value, r.yon); updEntry(r.id, { tur: ev.target.value, ilgili: "", propagated: false, hedefMod: h?.mod, hedefBase: h?.base }); }} className={inp}>
                        <option value="">Tür…</option>{TUR_LISTE.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </td>
                    <td className="px-1 py-1">
                      {iOpts.length > 0 ? (
                        <SearchSelect value={r.ilgili || ""} onChange={(v) => updEntry(r.id, { ilgili: v })} options={iOpts} placeholder={alanLabel(r.tur || "")} />
                      ) : <span className="block px-2 text-[11px] text-ink/30">—</span>}
                    </td>
                    <td className="px-1 py-1"><input value={r.aciklama} onChange={(ev) => updEntry(r.id, { aciklama: ev.target.value })} placeholder="Açıklama" className={inp} /></td>
                    <td className="px-1 py-1">
                      {r.yon === "Giren"
                        ? <div className="flex items-center gap-0.5"><TutarInput value={r.tutar || 0} onChange={(n) => updEntry(r.id, { tutar: n })} onBlur={() => propagate(r)} placeholder="0,00" className={`${inp} text-right nums text-good ${r.hedefMod && !r.propagated ? "border-amber-300" : ""}`} /><span className="shrink-0 text-[10px] font-semibold text-good/70">₺</span></div>
                        : <span className="block px-2 text-right text-[11px] text-ink/25">—</span>}
                    </td>
                    <td className="px-1 py-1">
                      {r.yon === "Çıkan"
                        ? <div className="flex items-center gap-0.5"><TutarInput value={r.tutar || 0} onChange={(n) => updEntry(r.id, { tutar: n })} onBlur={() => propagate(r)} placeholder="0,00" className={`${inp} text-right nums text-critical ${r.hedefMod && !r.propagated ? "border-amber-300" : ""}`} /><span className="shrink-0 text-[10px] font-semibold text-critical/70">₺</span></div>
                        : <span className="block px-2 text-right text-[11px] text-ink/25">—</span>}
                    </td>
                    <td className="px-2 py-1 text-right nums text-[11px] font-semibold text-ink">{tl(bakiye)}</td>
                    <td className="px-1 py-1"><button onClick={() => delEntry(r.id)} className="grid h-6 w-6 place-items-center rounded text-ink/30 opacity-0 transition hover:text-critical group-hover:opacity-100"><Trash2 size={13} /></button></td>
                  </tr>
                ); })}
                {entries.length === 0 && (
                  <tr><td colSpan={9} className="py-8 text-center text-[13px] text-ink/40">{dragAct ? "Buraya bırak" : "Kayıt yok — \"Satır Ekle\" ya da sağdaki Hızlı İşlemler'den sürükleyin"}</td></tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-black/10 bg-black/[0.03] text-[11px] font-semibold">
                  <td colSpan={5} className="px-2 py-1.5 text-right text-ink/60">Dünden Devir {tl(dundenDevir)} · Sayfa Toplamları →</td>
                  <td className="px-2 py-1.5 text-right nums text-good">{tl(girenTop)}</td>
                  <td className="px-2 py-1.5 text-right nums text-critical">{tl(cikanTop)}</td>
                  <td className="px-2 py-1.5 text-right nums text-neon-blue">{tl(yarinaDevir)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          {/* Yarına devir vurgusu */}
          <div className="flex items-center justify-between border-t border-black/10 bg-neon-blue/5 px-4 py-3">
            <span className="text-[12px] text-ink/60">Yarına devir, {dmy(dstr(new Date(cur + ONE)))} gününe otomatik "dünden devir" olarak taşınır.</span>
            <span className="flex items-baseline gap-2"><span className="text-[11px] font-semibold uppercase tracking-wide text-neon-blue">Yarına Devir</span><span className="nums text-xl font-bold text-neon-blue">{tl(yarinaDevir)}</span></span>
          </div>
        </div>

        {/* Sağ: Hızlı İşlemler */}
        <div className="w-full shrink-0 lg:order-first lg:w-56">
          <div className="rounded-xl border border-black/10 bg-white/70 p-3">
            <p className="mb-1 flex items-center gap-1.5 text-[12px] font-bold tracking-wide text-ink"><Plus size={13} className="text-neon-blue" /> HIZLI İŞLEMLER</p>
            <p className="mb-2.5 text-[11px] text-ink/50">Tıkla ya da <b className="text-ink/70">tabloya sürükle</b> — tutar girince ilgili tabloya da işlenir.</p>
            <div className="grid grid-cols-1 gap-1.5">
              {QUICK.map((q) => (
                <button key={q.label}
                  draggable onDragStart={() => setDragAct(q)} onDragEnd={() => setDragAct(null)}
                  onClick={() => addQuick(q)}
                  className={`flex cursor-grab items-center gap-2 rounded-xl border border-black/10 bg-white/60 px-2.5 py-2 text-left text-xs font-medium text-ink transition hover:-translate-y-0.5 hover:border-neon-blue/40 active:cursor-grabbing ${dragAct?.label === q.label ? "opacity-40" : ""}`}
                  title={`${q.yon} · ${q.tur}`}>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ background: q.yon === "Giren" ? "#1E7A4622" : "#C1292E22", color: q.yon === "Giren" ? "#1E7A46" : "#C1292E" }}>{q.yon === "Giren" ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}</span> {q.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      {msgOpen && <MesajGonderModal baslik={`Kasa Raporu (PDF) — ${currentUser.name} — ${dmy(curStr)}`} icerik={defterText()} onClose={() => setMsgOpen(false)} />}
    </div>
  );
}
