import { useEffect, useMemo, useState } from "react";
import { Wallet, ChevronLeft, ChevronRight, Plus, Trash2, Printer, Mail, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useUsers } from "@/context/UsersContext";
import { useModules } from "@/context/ModulesContext";

const STORAGE_KEY = "timay.kasa-defteri.v2";
const pad = (n: number) => String(n).padStart(2, "0");
const dstr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dmy = (iso: string) => (iso ? iso.split("-").reverse().join(".") : "");
const ONE = 86400000;
const TR_AY = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const TR_GUN = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
const tl = (n: number) => (n || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₺";

type Row = { id: string; tarih?: string; tur?: string; aciklama: string; tutar: number; hedefMod?: string; hedefBase?: Record<string, unknown>; propagated?: boolean };
type DayBook = { devir?: number; giren: Row[]; cikan: Row[] };
type Book = Record<string, DayBook>;
// Giren/çıkan satırlarında seçilebilir tür (nereden/nereye)
const GIREN_TUR = ["Kasa", "Banka", "Cari", "Dava", "Avukat", "Tahsilat", "Diğer"];
const CIKAN_TUR = ["Masraf", "Cari", "Personel", "Kasa", "Banka", "Vergi", "Tedarikçi", "Diğer"];
// Hızlı işlemler — tıkla ya da sütuna sürükle bırak; doğal tarafına (giren/çıkan) eklenir
type Quick = { label: string; side: "giren" | "cikan"; tur: string };
const QUICK: Quick[] = [
  { label: "Tahsilat", side: "giren", tur: "Tahsilat" },
  { label: "Ödeme", side: "cikan", tur: "Masraf" },
  { label: "Gider", side: "cikan", tur: "Masraf" },
  { label: "Avans", side: "cikan", tur: "Personel" },
  { label: "Cari Ödeme", side: "cikan", tur: "Cari" },
  { label: "Banka Para Çekme", side: "giren", tur: "Banka" },
  { label: "Banka Para Yatırma", side: "cikan", tur: "Banka" },
  { label: "Dava Ödeme", side: "cikan", tur: "Dava" },
  { label: "Dava Tahsilat", side: "giren", tur: "Dava" },
  { label: "Dava Masraf", side: "cikan", tur: "Dava" },
];

// Her kullanıcının kendi defteri → veri kullanıcı kimliğine göre saklanır
const loadAll = (): Record<string, Book> => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; } };
const rid = () => "k" + Math.random().toString(36).slice(2, 9);

export default function KasaDefteri() {
  const { currentUser } = useUsers();
  const { addRecord } = useModules();
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
  const day: DayBook = book[curStr] ?? { giren: [], cikan: [] };

  // Dünden devir = bugünden önceki tüm giriş-çıkışların bakiyesi (manuel override varsa o)
  const cumulativeBefore = useMemo(() => {
    let bal = 0;
    for (const [d, b] of Object.entries(book)) {
      if (d >= curStr) continue;
      bal += (b.giren ?? []).reduce((s, r) => s + (Number(r.tutar) || 0), 0);
      bal -= (b.cikan ?? []).reduce((s, r) => s + (Number(r.tutar) || 0), 0);
    }
    return bal;
  }, [book, curStr]);
  const dundenDevir = day.devir ?? cumulativeBefore;
  const girenTop = day.giren.reduce((s, r) => s + (Number(r.tutar) || 0), 0);
  const cikanTop = day.cikan.reduce((s, r) => s + (Number(r.tutar) || 0), 0);
  const yarinaDevir = dundenDevir + girenTop - cikanTop;

  const setDay = (patch: Partial<DayBook>) => setBook((b) => { const base: DayBook = b[curStr] ?? { giren: [], cikan: [] }; return { ...b, [curStr]: { ...base, ...patch } }; });
  const addRow = (side: "giren" | "cikan") => setDay({ [side]: [...day[side], { id: rid(), tarih: curStr, tur: "", aciklama: "", tutar: 0 }] } as Partial<DayBook>);
  const updRow = (side: "giren" | "cikan", id: string, patch: Partial<Row>) => setDay({ [side]: day[side].map((r) => (r.id === id ? { ...r, ...patch } : r)) } as Partial<DayBook>);
  const delRow = (side: "giren" | "cikan", id: string) => setDay({ [side]: day[side].filter((r) => r.id !== id) } as Partial<DayBook>);
  const setDevirOverride = (v: string) => { const n = v.trim() === "" ? undefined : Number(v); setDay({ devir: isNaN(n as number) ? undefined : n }); };

  // Hızlı işlem → hangi tabloya işlenecek (tutar girilip alandan çıkınca)
  const hedefFor = (label: string): { mod: string; base: Record<string, unknown> } | null => {
    switch (label) {
      case "Tahsilat": return { mod: "mod-T-0007", base: { islem_turu: "Giriş (+)", onay_durumu: "Onaylandı" } };
      case "Ödeme": return { mod: "mod-T-0007", base: { islem_turu: "Çıkış (−)" } };
      case "Gider": return { mod: "mod-T-0010", base: { onay_durumu: "Bekliyor" } };
      case "Avans": return { mod: "mod-T-0010", base: { onay_durumu: "Bekliyor" } };
      case "Cari Ödeme": return { mod: "mod-T-0005", base: { islem_turu: "Ödeme" } };
      case "Banka Para Çekme": return { mod: "mod-T-0007", base: { islem_turu: "Giriş (+)", kasa: "Banka" } };
      case "Banka Para Yatırma": return { mod: "mod-T-0007", base: { islem_turu: "Çıkış (−)", kasa: "Banka" } };
      case "Dava Ödeme": return { mod: "mod-T-0084", base: { tur: "Masraf (−)", kalem: "Diğer" } };
      case "Dava Tahsilat": return { mod: "mod-T-0084", base: { tur: "Tahsilat (+)", kalem: "Vekâlet Ücreti" } };
      case "Dava Masraf": return { mod: "mod-T-0084", base: { tur: "Masraf (−)", kalem: "Dosya Masrafı" } };
      default: return null;
    }
  };
  const addQuick = (q: Quick, side: "giren" | "cikan") => {
    const h = hedefFor(q.label);
    setDay({ [side]: [...day[side], { id: rid(), tarih: curStr, tur: q.tur, aciklama: q.label, tutar: 0, hedefMod: h?.mod, hedefBase: h?.base }] } as Partial<DayBook>);
  };
  // Tutar girilip alandan çıkınca ilgili tabloya işle (bir kez)
  const propagate = (side: "giren" | "cikan", r: Row) => {
    if (!r.hedefMod || r.propagated || !(Number(r.tutar) > 0)) return;
    const data: Record<string, unknown> = { ...(r.hedefBase ?? {}), tarih: r.tarih || curStr, tutar: Number(r.tutar), aciklama: r.aciklama };
    if (r.hedefMod === "mod-T-0005") { if (side === "giren") data.alacak = Number(r.tutar); else data.borc = Number(r.tutar); data.kayit_tarihi = r.tarih || curStr; }
    addRecord(r.hedefMod, data);
    updRow(side, r.id, { propagated: true });
    setNote(`"${r.aciklama}" ${tl(Number(r.tutar))} ilgili tabloya işlendi ✓`);
    window.setTimeout(() => setNote(""), 2800);
  };

  const nav = (d: number) => setCur((c) => c + d * ONE);
  const bugun = () => { const d = new Date(); d.setHours(0, 0, 0, 0); setCur(d.getTime()); };

  // Yazdır/Gönder için düz metin dökümü
  const defterText = () => {
    const ls = (arr: Row[], lbl: string) => (arr.length ? `\n${lbl}:\n` + arr.map((r) => `  ${dmy(r.tarih || curStr)} · ${r.tur || "-"} · ${r.aciklama || "-"} · ${tl(r.tutar)}`).join("\n") : "");
    return [
      `${currentUser.name} — KASA DEFTERİ (${dmy(curStr)})`,
      `Dünden Devir: ${tl(dundenDevir)}`,
      ls(day.giren, "GİRENLER"), `Girenler Toplamı: ${tl(girenTop)}`,
      ls(day.cikan, "ÇIKANLAR"), `Çıkanlar Toplamı: ${tl(cikanTop)}`,
      `YARINA DEVİR: ${tl(yarinaDevir)}`,
    ].filter(Boolean).join("\n");
  };
  const yazdir = () => { const w = window.open("", "_blank", "width=820,height=1000"); if (!w) return; w.document.write(`<pre style="font-family:Georgia,serif;font-size:12pt;white-space:pre-wrap;line-height:1.6;padding:40px">${defterText().replace(/</g, "&lt;")}</pre>`); w.document.close(); w.focus(); w.print(); };
  const gonder = () => { window.location.href = `mailto:?subject=${encodeURIComponent(`Kasa Defteri — ${currentUser.name} — ${dmy(curStr)}`)}&body=${encodeURIComponent(defterText())}`; };

  const inp = "w-full rounded border border-black/10 bg-white/70 px-2 py-1 text-[13px] text-ink outline-none focus:border-neon-blue";

  const Column = ({ side, title, color, Icon, turOpts }: { side: "giren" | "cikan"; title: string; color: string; Icon: typeof ArrowDownLeft; turOpts: string[] }) => {
    const rows = day[side];
    const toplam = side === "giren" ? girenTop : cikanTop;
    return (
      <div className="flex min-w-0 flex-col">
        <div className="flex items-center justify-between gap-2 rounded-t-lg px-3 py-2" style={{ background: color + "22" }}>
          <span className="flex items-center gap-1.5 text-sm font-bold" style={{ color }}><Icon size={15} /> {title}</span>
          <button onClick={() => addRow(side)} className="flex items-center gap-1 rounded-md border border-black/10 bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-ink/70 transition hover:text-neon-blue"><Plus size={12} /> Satır</button>
        </div>
        {/* Dünden devir sadece sol (girenler) sütununda */}
        {side === "giren" && (
          <div className="flex items-center gap-2 border-b border-black/10 bg-amber-50 px-3 py-1.5">
            <span className="flex-1 text-[12px] font-semibold text-amber-800">Dünden Devir</span>
            <input value={day.devir ?? ""} onChange={(e) => setDevirOverride(e.target.value)} placeholder={String(cumulativeBefore.toFixed(2))} type="number"
              className="w-28 rounded border border-amber-300 bg-white/80 px-2 py-0.5 text-right text-[13px] font-semibold text-amber-900 outline-none nums" title="Boş bırak = otomatik (önceki bakiye); elle gir = devri değiştir" />
          </div>
        )}
        {/* Başlık satırı */}
        <div className="flex items-center gap-1.5 border-x border-b border-black/10 bg-black/[0.03] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink/45">
          <span className="w-24 shrink-0">Tarih</span><span className="w-24 shrink-0">Tür</span><span className="flex-1">Açıklama</span><span className="w-24 shrink-0 text-right">Tutar</span><span className="w-6 shrink-0" />
        </div>
        <div
          onDragOver={dragAct ? (e) => e.preventDefault() : undefined}
          onDrop={dragAct ? (e) => { e.preventDefault(); addQuick(dragAct, side); setDragAct(null); } : undefined}
          className={`min-h-[280px] flex-1 divide-y divide-black/5 border-x border-black/10 bg-white/40 transition ${dragAct ? "ring-2 ring-inset ring-neon-blue/40" : ""}`}>
          {rows.map((r) => (
            <div key={r.id} className="group flex items-center gap-1.5 px-2 py-1">
              <input value={r.tarih || curStr} onChange={(e) => updRow(side, r.id, { tarih: e.target.value })} type="date" className={`${inp} w-24 shrink-0 text-[11px]`} />
              <select value={r.tur || ""} onChange={(e) => updRow(side, r.id, { tur: e.target.value })} className={`${inp} w-24 shrink-0`}>
                <option value="">—</option>
                {turOpts.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              <input value={r.aciklama} onChange={(e) => updRow(side, r.id, { aciklama: e.target.value })} placeholder="Açıklama" className={`${inp} flex-1`} />
              <input value={r.tutar || ""} onChange={(e) => updRow(side, r.id, { tutar: Number(e.target.value) || 0 })} onBlur={() => propagate(side, r)} placeholder="0,00" type="number"
                className={`${inp} w-24 shrink-0 text-right nums ${r.hedefMod && !r.propagated ? "border-amber-300" : ""}`} title={r.hedefMod ? (r.propagated ? "İlgili tabloya işlendi ✓" : "Tutarı gir → ilgili tabloya işlenir") : undefined} />
              <button onClick={() => delRow(side, r.id)} className="grid h-6 w-6 shrink-0 place-items-center rounded text-ink/30 opacity-0 transition hover:text-critical group-hover:opacity-100"><Trash2 size={13} /></button>
            </div>
          ))}
          {rows.length === 0 && <p className="py-6 text-center text-[12px] text-ink/40">{dragAct ? "Buraya bırak" : "Kayıt yok — \"Satır\" ya da sağdan sürükle"}</p>}
        </div>
        {/* Sayfa toplamı (alt) */}
        <div className="flex items-center justify-between rounded-b-lg border border-black/10 px-3 py-2" style={{ background: color + "18" }}>
          <span className="text-[12px] font-semibold text-ink/70">Sayfa {title} Toplamı</span>
          <span className="nums text-sm font-bold" style={{ color }}>{tl(toplam)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-[1440px] space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-neon-blue/10 text-neon-blue"><Wallet size={20} /></span>
        <div>
          <h1 className="text-xl font-bold text-ink">{currentUser.name} · Kasa Defteri</h1>
          <p className="text-xs text-muted">Kişisel kasa defteriniz · Girenler · Çıkanlar · dünden devir · sayfa toplamları · yarına devir otomatik</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={yazdir} className="no-print flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm text-muted transition hover:bg-elevated hover:text-ink"><Printer size={15} /> Yazdır</button>
          <button onClick={gonder} className="no-print flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm text-muted transition hover:bg-elevated hover:text-ink"><Mail size={15} /> Gönder</button>
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
      {/* Defter — iki sütun */}
      <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-black/10 shadow-[0_8px_24px_rgba(0,0,0,0.12)]" style={{ background: "#FBF7EC" }}>
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
          <Column side="giren" title="GİRENLER" color="#1E7A46" Icon={ArrowDownLeft} turOpts={GIREN_TUR} />
          <Column side="cikan" title="ÇIKANLAR" color="#C1292E" Icon={ArrowUpRight} turOpts={CIKAN_TUR} />
        </div>

        {/* Alt: genel toplam + yarına devir (sağ alt) */}
        <div className="grid grid-cols-1 gap-3 border-t border-black/10 bg-white/50 p-4 sm:grid-cols-3">
          <div className="rounded-lg bg-good/10 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/60">Dünden Devir + Girenler</p>
            <p className="nums mt-0.5 text-lg font-bold text-good">{tl(dundenDevir + girenTop)}</p>
            <p className="text-[11px] text-ink/50">Devir {tl(dundenDevir)} + Giren {tl(girenTop)}</p>
          </div>
          <div className="rounded-lg bg-critical/10 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/60">Toplam Çıkanlar</p>
            <p className="nums mt-0.5 text-lg font-bold text-critical">{tl(cikanTop)}</p>
            <p className="text-[11px] text-ink/50">{day.cikan.length} kayıt</p>
          </div>
          <div className="rounded-lg border-2 border-neon-blue/40 bg-neon-blue/10 p-3 text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neon-blue">Yarına Devir (otomatik)</p>
            <p className="nums mt-0.5 text-2xl font-bold text-neon-blue">{tl(yarinaDevir)}</p>
            <p className="text-[11px] text-ink/50">Devir + Giren − Çıkan</p>
          </div>
        </div>
      </div>

      {/* Sağ: Hızlı İşlemler — tıkla ya da sütuna sürükle bırak */}
      <div className="w-full shrink-0 lg:w-56">
        <div className="rounded-xl border border-black/10 bg-white/70 p-3">
          <p className="mb-1 flex items-center gap-1.5 text-[12px] font-bold tracking-wide text-ink"><Plus size={13} className="text-neon-blue" /> HIZLI İŞLEMLER</p>
          <p className="mb-2.5 text-[11px] text-ink/50">Tıkla ya da <b className="text-ink/70">sütuna sürükle</b> — tutarı girince ilgili tabloya da işlenir.</p>
          <div className="grid grid-cols-1 gap-1.5">
            {QUICK.map((q) => (
              <button key={q.label}
                draggable onDragStart={() => setDragAct(q)} onDragEnd={() => setDragAct(null)}
                onClick={() => addQuick(q, q.side)}
                className={`flex cursor-grab items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-left text-[12px] font-semibold transition hover:-translate-y-0.5 active:cursor-grabbing ${q.side === "giren" ? "border-good/40 bg-good/5 text-good" : "border-critical/40 bg-critical/5 text-critical"} ${dragAct?.label === q.label ? "opacity-40" : ""}`}
                title={`${q.side === "giren" ? "Girenler" : "Çıkanlar"} · ${q.tur}`}>
                {q.side === "giren" ? <ArrowDownLeft size={12} className="shrink-0" /> : <ArrowUpRight size={12} className="shrink-0" />} {q.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      </div>

      <p className="text-center text-[11px] text-faint">Yarına devir, {dmy(dstr(new Date(cur + ONE)))} gününe otomatik "dünden devir" olarak taşınır.</p>
    </div>
  );
}
