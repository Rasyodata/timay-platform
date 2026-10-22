import { useEffect, useMemo, useState } from "react";
import { Wallet, ChevronLeft, ChevronRight, Plus, Trash2, Printer, ArrowDownLeft, ArrowUpRight } from "lucide-react";

const STORAGE_KEY = "timay.kasa-defteri.v1";
const pad = (n: number) => String(n).padStart(2, "0");
const dstr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dmy = (iso: string) => (iso ? iso.split("-").reverse().join(".") : "");
const ONE = 86400000;
const TR_AY = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const TR_GUN = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
const tl = (n: number) => (n || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₺";

type Row = { id: string; aciklama: string; tutar: number; kaynak?: string };
type DayBook = { devir?: number; giren: Row[]; cikan: Row[] };
type Book = Record<string, DayBook>;

const loadBook = (): Book => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; } };
const rid = () => "k" + Math.random().toString(36).slice(2, 9);

export default function KasaDefteri() {
  const [book, setBook] = useState<Book>(loadBook);
  const [cur, setCur] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); });

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(book)); } catch { /* kota */ } }, [book]);

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
  const addRow = (side: "giren" | "cikan") => setDay({ [side]: [...day[side], { id: rid(), aciklama: "", tutar: 0 }] } as Partial<DayBook>);
  const updRow = (side: "giren" | "cikan", id: string, patch: Partial<Row>) => setDay({ [side]: day[side].map((r) => (r.id === id ? { ...r, ...patch } : r)) } as Partial<DayBook>);
  const delRow = (side: "giren" | "cikan", id: string) => setDay({ [side]: day[side].filter((r) => r.id !== id) } as Partial<DayBook>);
  const setDevirOverride = (v: string) => { const n = v.trim() === "" ? undefined : Number(v); setDay({ devir: isNaN(n as number) ? undefined : n }); };

  const nav = (d: number) => setCur((c) => c + d * ONE);
  const bugun = () => { const d = new Date(); d.setHours(0, 0, 0, 0); setCur(d.getTime()); };

  const inp = "w-full rounded border border-black/10 bg-white/70 px-2 py-1 text-[13px] text-ink outline-none focus:border-neon-blue";

  const Column = ({ side, title, color, Icon }: { side: "giren" | "cikan"; title: string; color: string; Icon: typeof ArrowDownLeft }) => {
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
        <div className="min-h-[300px] flex-1 divide-y divide-black/5 border-x border-black/10 bg-white/40">
          {rows.map((r) => (
            <div key={r.id} className="group flex items-center gap-1.5 px-2 py-1">
              <input value={r.aciklama} onChange={(e) => updRow(side, r.id, { aciklama: e.target.value })} placeholder="Açıklama" className={`${inp} flex-1`} />
              <input value={r.tutar || ""} onChange={(e) => updRow(side, r.id, { tutar: Number(e.target.value) || 0 })} placeholder="0,00" type="number" className={`${inp} w-28 text-right nums`} />
              <button onClick={() => delRow(side, r.id)} className="grid h-6 w-6 shrink-0 place-items-center rounded text-ink/30 opacity-0 transition hover:text-critical group-hover:opacity-100"><Trash2 size={13} /></button>
            </div>
          ))}
          {rows.length === 0 && <p className="py-6 text-center text-[12px] text-ink/40">Kayıt yok — "Satır" ile ekleyin</p>}
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
    <div className="mx-auto max-w-[1200px] space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-neon-blue/10 text-neon-blue"><Wallet size={20} /></span>
        <div>
          <h1 className="text-xl font-bold text-ink">Harcama / Kasa Defteri</h1>
          <p className="text-xs text-muted">Girenler · Çıkanlar · dünden devir · sayfa toplamları · yarına devir otomatik</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => window.print()} className="no-print flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm text-muted transition hover:bg-elevated hover:text-ink"><Printer size={15} /> Yazdır</button>
        </div>
      </div>

      {/* Tarih seçici */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={bugun} className="rounded-lg border border-line bg-panel px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-elevated">Bugün</button>
        <button onClick={() => nav(-1)} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted hover:bg-elevated"><ChevronLeft size={16} /></button>
        <button onClick={() => nav(1)} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted hover:bg-elevated"><ChevronRight size={16} /></button>
        <span className="ml-1 text-base font-bold text-ink">{curDate.getDate()} {TR_AY[curDate.getMonth()]} {curDate.getFullYear()} · {TR_GUN[(curDate.getDay() + 6) % 7]}</span>
      </div>

      {/* Defter — iki sütun */}
      <div className="overflow-hidden rounded-xl border border-black/10 shadow-[0_8px_24px_rgba(0,0,0,0.12)]" style={{ background: "#FBF7EC" }}>
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
          <Column side="giren" title="GİRENLER" color="#1E7A46" Icon={ArrowDownLeft} />
          <Column side="cikan" title="ÇIKANLAR" color="#C1292E" Icon={ArrowUpRight} />
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
      <p className="text-center text-[11px] text-faint">Yarına devir, {dmy(dstr(new Date(cur + ONE)))} gününe otomatik "dünden devir" olarak taşınır.</p>
    </div>
  );
}
