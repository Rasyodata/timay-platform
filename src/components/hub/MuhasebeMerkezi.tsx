import { useMemo, useState } from "react";
import {
  Package, ReceiptText, ShoppingCart, TrendingUp, Wallet, Activity,
  FilePlus, FileStack, BarChart3, LineChart, ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useModules } from "@/context/ModulesContext";
import { openTableReport, openReport } from "@/lib/tableReport";
import type { View } from "@/App";
import type { DynamicRecord } from "@/types/modules";

// Öğe aksiyonu: ya bir ekrana git (nav) ya tablo raporu aç (report) ya özel çek/senet raporu
type Item = { label: string; sub?: string } & (
  | { nav: View }
  | { report: string }
  | { cek: "eldeki-cek" | "eldeki-senet" | "verilen-cek" | "verilen-senet" }
);
interface Sekme { kayit: Item[]; evraklar: Item[]; raporlar: Item[]; analiz: Item[] }
interface Modul { key: string; label: string; icon: LucideIcon; renk: string; aciklama: string; sek: Sekme }

const MODULLER: Modul[] = [
  {
    key: "stok", label: "Stok", icon: Package, renk: "#0891B2", aciklama: "Ürün/hizmet kartları, stok hareketleri",
    sek: {
      kayit: [{ label: "Ürün / Hizmet Tanımla", sub: "T-0085", nav: "mod:mod-T-0085" }],
      evraklar: [{ label: "Ürün / Hizmet Kaydı", sub: "T-0085", nav: "mod:mod-T-0085" }],
      raporlar: [{ label: "Ürün / Hizmet Listesi", sub: "rapor", report: "mod-T-0085" }],
      analiz: [{ label: "Satışa Göre Ürün Analizi", sub: "T-0036", nav: "mod:mod-T-0036" }],
    },
  },
  {
    key: "masraf", label: "Masraflar", icon: ReceiptText, renk: "#B5731A", aciklama: "Masraf kartları, fişler, bütçe",
    sek: {
      kayit: [{ label: "Masraf Kartı Tanımla", sub: "T-0008", nav: "mod:mod-T-0008" }, { label: "Departman / Masraf Merkezi", sub: "T-0004", nav: "mod:mod-T-0004" }],
      evraklar: [{ label: "Masraf Fişi", sub: "T-0010", nav: "mod:mod-T-0010" }, { label: "Ödeme Emri", sub: "T-0026", nav: "mod:mod-T-0026" }],
      raporlar: [{ label: "Masraf Raporu", sub: "rapor", report: "mod-T-0010" }, { label: "Bütçe-Gerçekleşen", sub: "rapor", report: "mod-T-0048" }],
      analiz: [{ label: "Bütçe Kontrol", sub: "T-0048", nav: "mod:mod-T-0048" }],
    },
  },
  {
    key: "satinalma", label: "Satın Alma", icon: ShoppingCart, renk: "#4B3FB0", aciklama: "Tedarikçi, talep, ödeme",
    sek: {
      kayit: [{ label: "Tedarikçi (Cari) Tanımla", sub: "T-0077", nav: "mod:mod-T-0077" }, { label: "Ürün / Hizmet", sub: "T-0085", nav: "mod:mod-T-0085" }],
      evraklar: [{ label: "Satın Alma Talebi", sub: "T-0024", nav: "mod:mod-T-0024" }, { label: "Tedarikçi Ödeme Fişi", sub: "EVR-0002", nav: "mod:mod-EVR-0002" }],
      raporlar: [{ label: "Satın Alma Listesi", sub: "rapor", report: "mod-T-0024" }, { label: "Tedarikçi Cari Ekstre", sub: "rapor", report: "mod-T-0005" }],
      analiz: [{ label: "Cari Hareketler", sub: "T-0005", nav: "mod:mod-T-0005" }],
    },
  },
  {
    key: "satis", label: "Satış", icon: TrendingUp, renk: "#1E7A46", aciklama: "Müşteri, fatura, satış, fırsat",
    sek: {
      kayit: [{ label: "Müşteri (Cari) Tanımla", sub: "T-0077", nav: "mod:mod-T-0077" }, { label: "Ürün / Hizmet / Fiyat", sub: "T-0085", nav: "mod:mod-T-0085" }],
      evraklar: [{ label: "Fatura", sub: "EVR-0003", nav: "mod:mod-EVR-0003" }, { label: "Tahsilat Fişi", sub: "EVR-0001", nav: "mod:mod-EVR-0001" }, { label: "Satış Kaydı", sub: "T-0036", nav: "mod:mod-T-0036" }],
      raporlar: [{ label: "Satış Raporu", sub: "rapor", report: "mod-T-0036" }, { label: "Cari Ekstre", sub: "rapor", report: "mod-T-0005" }],
      analiz: [{ label: "Satış Fırsatları (Pipeline)", sub: "pipeline", nav: "pipeline" }, { label: "Hedef ve Kâr", sub: "T-0043", nav: "mod:mod-T-0043" }],
    },
  },
  {
    key: "finans", label: "Finans", icon: Wallet, renk: "#0A4EA2", aciklama: "Cari, kasa, banka, çek, senet",
    sek: {
      kayit: [
        { label: "Cari Tanımla", sub: "T-0077", nav: "mod:mod-T-0077" },
        { label: "Kasa Kartı Tanımla", sub: "T-0006 · Nakit Kasa", nav: "mod:mod-T-0006" },
        { label: "Banka Tanımla", sub: "T-0006 · Banka", nav: "mod:mod-T-0006" },
        { label: "Çek Kasası Tanımla", sub: "T-0006 · Alınan Çekler", nav: "mod:mod-T-0006" },
        { label: "Senet Kasası Tanımla", sub: "T-0006 · Alınan Senetler", nav: "mod:mod-T-0006" },
      ],
      evraklar: [
        { label: "Kasa Tahsilat Fişi", sub: "EVR-0001", nav: "mod:mod-EVR-0001" },
        { label: "Kasa Ödeme Fişi", sub: "EVR-0002", nav: "mod:mod-EVR-0002" },
        { label: "Banka Gelen Havale", sub: "T-0007 · Giriş", nav: "mod:mod-T-0007" },
        { label: "Banka Giden Havale", sub: "T-0007 · Çıkış", nav: "mod:mod-T-0007" },
        { label: "Çek Giriş / Çıkış", sub: "T-0007", nav: "mod:mod-T-0007" },
        { label: "Senet Giriş / Çıkış", sub: "T-0007", nav: "mod:mod-T-0007" },
        { label: "Kasa Defteri", sub: "günlük kasa", nav: "kasa-defteri" },
      ],
      raporlar: [
        { label: "Cari Ekstre", sub: "T-0005", report: "mod-T-0005" },
        { label: "Kasa Ekstre", sub: "T-0007", report: "mod-T-0007" },
        { label: "Eldeki Çekler", sub: "portföy", cek: "eldeki-cek" },
        { label: "Eldeki Senetler", sub: "portföy", cek: "eldeki-senet" },
        { label: "Verilen Çekler", sub: "borç", cek: "verilen-cek" },
        { label: "Verilen Senetler", sub: "borç", cek: "verilen-senet" },
      ],
      analiz: [{ label: "Nakit Akış", sub: "T-0009", nav: "mod:mod-T-0009" }, { label: "Kasa / Hesap Tanımları", sub: "T-0006", nav: "mod:mod-T-0006" }],
    },
  },
  {
    key: "nakit", label: "Nakit Akış", icon: Activity, renk: "#0d9488", aciklama: "Öngörü, ödeme sözü, tekrarlayan",
    sek: {
      kayit: [{ label: "Tahmini Bütçe Çıkış Kartı", sub: "T-0028", nav: "mod:mod-T-0028" }, { label: "Ödeme Sözü Kartı", sub: "T-0027", nav: "mod:mod-T-0027" }],
      evraklar: [{ label: "Tekrarlayan İşlemler", sub: "T-0015", nav: "tekrarlayan" }],
      raporlar: [{ label: "Nakit Akış Tablosu", sub: "T-0009", report: "mod-T-0009" }, { label: "Tahmini Çıkışlar", sub: "rapor", report: "mod-T-0028" }],
      analiz: [{ label: "Nakit Akış Merkezi", sub: "T-0009", nav: "mod:mod-T-0009" }],
    },
  },
];

const SECTIONS: { key: keyof Sekme; label: string; icon: LucideIcon }[] = [
  { key: "kayit", label: "Kayıt (Tanımlar)", icon: FilePlus },
  { key: "evraklar", label: "Evraklar", icon: FileStack },
  { key: "raporlar", label: "Raporlar", icon: BarChart3 },
  { key: "analiz", label: "Analiz", icon: LineChart },
];

const tl = (n: unknown) => (Number(n) || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₺";
const dmy = (iso: string) => (iso ? String(iso).split("-").reverse().join(".") : "—");

export default function MuhasebeMerkezi({ onNavigate }: { onNavigate: (v: View) => void }) {
  const { getModule } = useModules();
  const [sel, setSel] = useState("finans");
  const modul = useMemo(() => MODULLER.find((m) => m.key === sel) ?? MODULLER[0], [sel]);

  // Çek/Senet portföy raporu — T-0007 kasa hareketlerinden süzülür
  const cekSenetReport = (kind: "eldeki-cek" | "eldeki-senet" | "verilen-cek" | "verilen-senet") => {
    const recs = (getModule("mod-T-0007")?.records ?? []) as DynamicRecord[];
    const isCek = /cek|çek/i.test(kind);
    const isVerilen = /verilen/i.test(kind);
    const ara = isCek ? /çek|cek/i : /senet/i;
    const rows = recs.filter((r) => ara.test(String(r.kasa ?? "")) && (isVerilen ? /çıkış|cikis|-/i.test(String(r.islem_turu ?? "")) : !/çıkış|cikis|-/i.test(String(r.islem_turu ?? ""))));
    const toplam = rows.reduce((s, r) => s + (Number(r.tutar) || 0), 0);
    const baslik = kind === "eldeki-cek" ? "Eldeki Çekler" : kind === "eldeki-senet" ? "Eldeki Senetler" : kind === "verilen-cek" ? "Verilen Çekler" : "Verilen Senetler";
    openReport({
      title: `${baslik} Raporu`, code: "FİNANS", subtitle: `${rows.length} kayıt`,
      summary: [{ label: "Adet", value: String(rows.length), tone: "accent" }, { label: "Toplam", value: tl(toplam), tone: isVerilen ? "neg" : "pos" }],
      columns: [{ label: "Tarih" }, { label: "Kasa" }, { label: "Cari" }, { label: "Açıklama" }, { label: "Tutar", align: "right" }],
      rows: rows.map((r) => [
        { text: dmy(String(r.tarih ?? "")) }, { text: String(r.kasa ?? "—") }, { text: String(r.cari ?? "—") },
        { text: String(r.aciklama ?? "—"), tone: "muted" as const }, { text: tl(r.tutar), align: "right" as const, tone: isVerilen ? "neg" as const : "pos" as const },
      ]),
      footNote: `${baslik} · Timay Platform`,
    });
  };

  const go = (it: Item) => {
    if ("nav" in it) return onNavigate(it.nav);
    if ("report" in it) { const m = getModule(it.report); if (m) openTableReport(m, undefined, `${m.name} Raporu`); return; }
    if ("cek" in it) return cekSenetReport(it.cek);
  };

  return (
    <div className="mx-auto max-w-[1500px] p-4 md:p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-neon-blue/10 text-neon-blue"><Wallet size={20} /></span>
        <div>
          <h1 className="text-2xl font-bold text-ink">Muhasebe / Finans Merkezi</h1>
          <p className="mt-0.5 text-sm text-muted">Bir şirketin muhasebesi A'dan Z'ye · Stok · Masraflar · Satın Alma · Satış · Finans · Nakit Akış</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* SOL — modül listesi (hızlı seçim) */}
        <div className="w-full shrink-0 lg:w-56">
          <div className="sticky top-4 space-y-1.5 rounded-xl border border-line bg-panel p-2">
            {MODULLER.map((m) => { const on = m.key === sel; return (
              <button key={m.key} onClick={() => setSel(m.key)} className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-semibold transition ${on ? "text-white" : "text-ink hover:bg-elevated"}`} style={on ? { background: m.renk } : undefined}>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={on ? { background: "rgba(255,255,255,0.2)", color: "#fff" } : { background: m.renk + "1f", color: m.renk }}><m.icon size={15} /></span>
                <span className="min-w-0 flex-1 truncate">{m.label}</span>
                {on && <ChevronRight size={14} className="shrink-0" />}
              </button>
            ); })}
          </div>
        </div>

        {/* SAĞ — seçili modülün bölümleri (Kayıt / Evraklar / Raporlar / Analiz) */}
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor: modul.renk + "55", background: modul.renk + "0d" }}>
            <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: modul.renk + "1f", color: modul.renk }}><modul.icon size={17} /></span>
            <div><p className="text-sm font-bold text-ink">{modul.label}</p><p className="text-[11px] text-muted">{modul.aciklama}</p></div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {SECTIONS.map((s) => { const items = modul.sek[s.key]; return (
              <div key={s.key} className="rounded-xl border border-line bg-panel p-3">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted"><s.icon size={13} className="text-neon-blue" /> {s.label}</p>
                <div className="space-y-1.5">
                  {items.length === 0 && <p className="text-[11px] text-faint">—</p>}
                  {items.map((it, i) => (
                    <button key={i} onClick={() => go(it)} className="flex w-full items-center gap-2 rounded-lg border border-line bg-base/40 px-2.5 py-2 text-left transition hover:-translate-y-0.5 hover:border-neon-blue/40">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md" style={{ background: modul.renk + "1f", color: modul.renk }}>{"report" in it || "cek" in it ? <BarChart3 size={12} /> : <ChevronRight size={12} />}</span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-medium text-ink">{it.label}</span>{it.sub && <span className="block truncate text-[10px] text-faint">{it.sub}</span>}</span>
                    </button>
                  ))}
                </div>
              </div>
            ); })}
          </div>
        </div>
      </div>
    </div>
  );
}
