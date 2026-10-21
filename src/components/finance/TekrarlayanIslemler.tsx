import { useState } from "react";
import { ChevronLeft, Repeat, Play, Pause, Pencil, Plus, X, Trash2, Zap } from "lucide-react";
import { useModules } from "@/context/ModulesContext";
import { fmtNum } from "@/lib/format";
import { RecordForm } from "@/components/projects/ProjectTableCard";
import type { DynamicRecord } from "@/types/modules";
import type { View } from "@/App";

const MOD = "mod-T-0015";
const money = (v: unknown) => `${fmtNum(Number(v) || 0)} ₺`;
const dmy = (iso: string) => (iso ? iso.split("-").reverse().join(".") : "—");
const today = () => new Date().toISOString().slice(0, 10);

function addPeriod(iso: string, periyot: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (periyot === "Günlük") dt.setDate(dt.getDate() + 1);
  else if (periyot === "Haftalık") dt.setDate(dt.getDate() + 7);
  else if (periyot === "Aylık") dt.setMonth(dt.getMonth() + 1);
  else if (periyot === "3 Aylık") dt.setMonth(dt.getMonth() + 3);
  else if (periyot === "Yıllık") dt.setFullYear(dt.getFullYear() + 1);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}

const TIP_ACCENT: Record<string, string> = {
  Tahsilat: "#1E7A46", Ödeme: "#C1292E", Fatura: "#0A4EA2", Masraf: "#B5731A", "Cari Hareket": "#4B3FB0",
};

export default function TekrarlayanIslemler({ onNavigate }: { onNavigate: (v: View) => void }) {
  const { getModule, addRecord, updateRecord, deleteRecord } = useModules();
  const mod = getModule(MOD);
  const [modal, setModal] = useState<DynamicRecord | "new" | null>(null);
  const [note, setNote] = useState("");

  if (!mod) return <div className="card p-5 text-sm text-muted">Tekrarlayan İşlemler tablosu bulunamadı.</div>;
  const rules = mod.records as DynamicRecord[];
  const td = today();
  const isDue = (r: DynamicRecord) => String(r.durum) === "Aktif" && String(r.sonraki_tarih) <= td && (!r.bitis || String(r.sonraki_tarih) <= String(r.bitis));
  const dueCount = rules.filter(isDue).length;

  // Hedef tablo eşleşmesi: her işlem tipi ilgili evrak/tabloya kayıt üretir.
  const TARGETS: Record<string, { modId: string; build: (r: DynamicRecord, no: string, d: string) => Record<string, unknown> }> = {
    Tahsilat: { modId: "mod-EVR-0001", build: (r, no, d) => ({ evrak_no: no, tarih: d, cari: r.cari, tutar: r.tutar, tahsilat_tipi: "Havale/EFT", durum: "Hazırlandı", aciklama: `Tekrarlayan: ${r.baslik}` }) },
    Ödeme: { modId: "mod-EVR-0002", build: (r, no, d) => ({ evrak_no: no, tarih: d, hareket_tipi: "Cari", cari: r.cari, tutar: r.tutar, yontem: "Havale/EFT", durum: "Hazırlandı", aciklama: `Tekrarlayan: ${r.baslik}` }) },
    Fatura: { modId: "mod-EVR-0003", build: (r, no, d) => ({ evrak_no: no, tarih: d, cari: r.cari, fatura_tipi: "Satış", toplam: r.tutar, durum: "Taslak" }) },
    Masraf: { modId: "mod-T-0010", build: (r, no, d) => ({ masraf_no: no, tarih: d, tutar: r.tutar, onay_durumu: "Taslak", aciklama: `Tekrarlayan: ${r.baslik}` }) },
    "Cari Hareket": { modId: "mod-T-0005", build: (r, no, d) => ({ hareket_id: no, cari_kod: r.cari, islem_turu: "Fatura", borc: r.tutar, onay_durumu: "Onaylandı", kayit_tarihi: d }) },
  };

  const genDocNo = (modId: string, offset: number) => {
    const m = getModule(modId);
    const yy = String(new Date().getFullYear() % 100).padStart(2, "0");
    const prefix = ((m?.name ?? "DOC").replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g, "").slice(0, 3) || "DOC").toLocaleUpperCase("tr");
    const nums = (m?.records ?? []).map((r) => { const mm = String((r as Record<string, unknown>).evrak_no ?? (r as Record<string, unknown>).masraf_no ?? (r as Record<string, unknown>).hareket_id ?? "").match(/(\d+)\s*$/); return mm ? parseInt(mm[1], 10) : 0; });
    return `${prefix}-${yy}-${String((nums.length ? Math.max(0, ...nums) : 0) + 1 + offset).padStart(4, "0")}`;
  };

  // Bir kuralı çalıştır: catchUp=true vadesi gelenlerin hepsini, false tek sefer.
  const run = (r: DynamicRecord, catchUp: boolean): number => {
    const occ: string[] = [];
    let next = String(r.sonraki_tarih);
    if (catchUp) {
      let guard = 0;
      while (next <= td && (!r.bitis || next <= String(r.bitis)) && guard < 24) { occ.push(next); next = addPeriod(next, String(r.periyot)); guard++; }
    } else { occ.push(next); next = addPeriod(next, String(r.periyot)); }
    if (!occ.length) return 0;
    const tgt = TARGETS[String(r.islem_tipi)];
    if (tgt) occ.forEach((d, i) => addRecord(tgt.modId, tgt.build(r, genDocNo(tgt.modId, i), d)));
    const bitti = r.bitis && next > String(r.bitis);
    updateRecord(MOD, String(r.id), { sonraki_tarih: next, son_uretim: occ[occ.length - 1], durum: bitti ? "Bitti" : r.durum });
    return occ.length;
  };

  const runAllDue = () => {
    let total = 0;
    rules.filter(isDue).forEach((r) => (total += run(r, true)));
    setNote(total ? `${total} işlem üretildi ve ilgili evrak/tablolara yazıldı ✓` : "Vadesi gelen işlem yok.");
  };

  return (
    <div className="mx-auto max-w-[1300px] space-y-6 p-4 py-8 md:p-8">
      <button onClick={() => onNavigate("finans-merkezi")} className="inline-flex items-center gap-1 text-xs text-muted transition hover:text-ink"><ChevronLeft size={14} /> Entegre Finans & İş Akışı Yönetimi</button>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-neon-blue">Otomasyon</p>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold text-ink md:text-3xl"><Repeat size={24} className="text-neon-blue" /> Tekrarlayan İşlemler</h1>
          <p className="mt-2 text-sm text-muted">Periyodik fatura/tahsilat/ödeme/masraf kuralları. Vadesi gelince ilgili evrak/tabloya otomatik kayıt üretir.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={runAllDue} disabled={dueCount === 0} className={`flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition ${dueCount ? "bg-good hover:opacity-90" : "cursor-not-allowed bg-faint/40"}`}>
            <Zap size={15} /> Vadesi Gelenleri Üret{dueCount ? ` (${dueCount})` : ""}
          </button>
          <button onClick={() => setModal("new")} className="flex items-center gap-1.5 rounded-lg bg-neon-blue px-3 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"><Plus size={15} /> Kural Ekle</button>
        </div>
      </header>

      {note && <div className="rounded-xl border border-good/30 bg-good/10 px-3 py-2 text-xs text-good">{note}</div>}
      <p className="text-[11px] text-faint">Not: Canlı/sunucu sürümünde bu üretim <b>otomatik (cron)</b> çalışır; prototipte "Vadesi Gelenleri Üret" ile tetiklenir.</p>

      <div className="card overflow-x-auto p-0">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              {["Tanım", "İşlem", "Cari", "Tutar", "Periyot", "Sonraki Çalışma", "Durum", ""].map((h) => <th key={h} className="whitespace-nowrap px-3 py-2.5 font-medium text-muted">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => {
              const due = isDue(r);
              const accent = TIP_ACCENT[String(r.islem_tipi)] ?? "#0A4EA2";
              return (
                <tr key={r.id} className="border-b border-line/60 transition hover:bg-white/[0.02]">
                  <td className="px-3 py-2.5 font-medium text-ink">{String(r.baslik ?? "—")}</td>
                  <td className="px-3 py-2.5"><span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: `${accent}14`, color: accent }}>{String(r.islem_tipi)}</span></td>
                  <td className="px-3 py-2.5 text-muted">{r.cari ? String(r.cari) : "—"}</td>
                  <td className="px-3 py-2.5 nums font-semibold text-ink">{money(r.tutar)}</td>
                  <td className="px-3 py-2.5 text-muted">{String(r.periyot)}</td>
                  <td className={`px-3 py-2.5 nums ${due ? "font-semibold text-critical" : "text-ink"}`}>{dmy(String(r.sonraki_tarih))}{due && " ⚠"}</td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${String(r.durum) === "Aktif" ? "bg-good/10 text-good" : String(r.durum) === "Bitti" ? "bg-faint/15 text-faint" : "bg-warning/10 text-warning"}`}>{String(r.durum)}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      {String(r.durum) !== "Bitti" && (
                        <button onClick={() => run(r, false)} className="rounded-md p-1 text-muted transition hover:text-good" title="Şimdi bir kez üret"><Play size={14} /></button>
                      )}
                      {String(r.durum) !== "Bitti" && (
                        <button onClick={() => updateRecord(MOD, String(r.id), { durum: String(r.durum) === "Aktif" ? "Duraklatıldı" : "Aktif" })} className="rounded-md p-1 text-muted transition hover:text-warning" title={String(r.durum) === "Aktif" ? "Duraklat" : "Aktifleştir"}>
                          {String(r.durum) === "Aktif" ? <Pause size={14} /> : <Play size={14} />}
                        </button>
                      )}
                      <button onClick={() => setModal(r)} className="rounded-md p-1 text-muted transition hover:text-neon-blue" title="Düzenle"><Pencil size={14} /></button>
                      <button onClick={() => deleteRecord(MOD, String(r.id))} className="rounded-md p-1 text-muted transition hover:text-critical" title="Sil"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {rules.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-sm text-muted">Henüz tekrarlayan işlem kuralı yok.</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-10 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="w-full max-w-2xl rounded-2xl border border-line bg-panel shadow-card animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <h3 className="text-sm font-semibold text-ink">{modal === "new" ? "Yeni Tekrarlayan Kural" : String((modal as DynamicRecord).baslik ?? "Kural")}</h3>
              <button onClick={() => setModal(null)} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-elevated"><X size={16} /></button>
            </div>
            <div className="p-4">
              <RecordForm mod={mod} initial={modal === "new" ? undefined : (modal as DynamicRecord)} onClose={() => setModal(null)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
