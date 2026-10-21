import { useMemo, useState } from "react";
import { FileText, Plus, Scale, Trash2, Wallet } from "lucide-react";
import { useModules } from "@/context/ModulesContext";
import { useUsers } from "@/context/UsersContext";
import { fmtTL } from "@/lib/format";
import { openTableReport } from "@/lib/tableReport";

const BUDGET_ID = "mod-T-0048";
const KATEGORI = ["Geliştirme", "Pazarlama", "Donanım", "Personel", "Lisans", "Diğer"];
const input =
  "w-full rounded-lg border border-line bg-base/60 px-3 py-2 text-sm text-ink outline-none transition focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/40";
const money = (n: number) => fmtTL(n);

function Tile({ label, value, tone, icon }: { label: string; value: string; tone: string; icon: React.ReactNode }) {
  return (
    <div className={`rounded-xl border p-4 ${tone}`}>
      <p className="flex items-center gap-1.5 text-xs text-muted">{icon} {label}</p>
      <p className="mt-1 text-lg font-bold nums tabular-nums">{value}</p>
    </div>
  );
}

export default function ProjectBudgetCompare() {
  const { getModule, addRecord, deleteRecord } = useModules();
  const { canViewField } = useUsers();
  const mod = getModule(BUDGET_ID);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, unknown>>({ kategori: "Geliştirme" });
  const [err, setErr] = useState("");

  const rows = (mod?.records ?? []) as Record<string, unknown>[];
  const showAmounts = canViewField("ONLY_MANAGERS");

  const totals = useMemo(() => {
    let butce = 0, ger = 0;
    for (const r of rows) { butce += Number(r.butce) || 0; ger += Number(r.gerceklesen) || 0; }
    return { butce, ger, fark: ger - butce, sapma: butce ? Math.round(((ger - butce) / butce) * 1000) / 10 : 0 };
  }, [rows]);

  const maxVal = Math.max(1, ...rows.flatMap((r) => [Number(r.butce) || 0, Number(r.gerceklesen) || 0]));

  if (!mod) return <div className="card p-5 text-sm text-muted">Bütçe-Gerçekleşen tablosu bulunamadı.</div>;

  const save = () => {
    if (!String(draft.kalem ?? "").trim()) return setErr("Kalem zorunlu.");
    if (!draft.butce) return setErr("Bütçe zorunlu.");
    addRecord(BUDGET_ID, { ...draft, butce: Number(draft.butce) || 0, gerceklesen: Number(draft.gerceklesen) || 0 });
    setDraft({ kategori: "Geliştirme" }); setOpen(false); setErr("");
  };

  return (
    <section className="card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-1.5 text-base font-semibold text-ink"><Scale size={16} className="text-neon-blue" /> Bütçe-Gerçekleşen Karşılaştırma</h3>
          <p className="text-[11px] text-muted"><span className="nums">{mod.code}</span> · {rows.length} kalem · fark & sapma analizi</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => openTableReport(mod, showAmounts ? [
            { label: "Toplam Bütçe", value: money(totals.butce) },
            { label: "Toplam Gerçekleşen", value: money(totals.ger) },
            { label: "Fark", value: money(totals.fark) },
          ] : undefined, "Bütçe Raporu")} className="chip border-neon-violet/40 bg-neon-violet/10 text-neon-violet transition hover:bg-neon-violet/20">
            <FileText size={14} /> Rapor Al
          </button>
          <button onClick={() => setOpen((v) => !v)} className="chip border-neon-blue/40 bg-neon-blue/10 text-neon-blue transition hover:bg-neon-blue/20">
            <Plus size={14} /> Kalem Ekle
          </button>
        </div>
      </div>

      {/* Özet */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Toplam Bütçe" tone="border-neon-blue/30 bg-neon-blue/10 text-neon-blue" icon={<Wallet size={13} />} value={showAmounts ? money(totals.butce) : "•••••"} />
        <Tile label="Toplam Gerçekleşen" tone="border-neon-violet/30 bg-neon-violet/10 text-neon-violet" icon={<Wallet size={13} />} value={showAmounts ? money(totals.ger) : "•••••"} />
        <Tile label={totals.fark > 0 ? "Bütçe Aşımı" : "Tasarruf"} tone={totals.fark > 0 ? "border-critical/30 bg-critical/10 text-critical" : "border-good/30 bg-good/10 text-good"} icon={<Scale size={13} />} value={showAmounts ? money(Math.abs(totals.fark)) : "•••••"} />
        <Tile label="Sapma" tone={totals.fark > 0 ? "border-critical/30 bg-critical/10 text-critical" : "border-good/30 bg-good/10 text-good"} icon={<Scale size={13} />} value={showAmounts ? `${totals.sapma > 0 ? "+" : ""}%${totals.sapma}` : "•••••"} />
      </div>

      {open && (
        <div className="mb-4 rounded-xl border border-line bg-white/[0.02] p-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block"><span className="mb-1 block text-xs text-muted">Kalem *</span>
              <input className={input} value={String(draft.kalem ?? "")} onChange={(e) => setDraft((d) => ({ ...d, kalem: e.target.value }))} /></label>
            <label className="block"><span className="mb-1 block text-xs text-muted">Kategori</span>
              <select className={input} value={String(draft.kategori)} onChange={(e) => setDraft((d) => ({ ...d, kategori: e.target.value }))}>
                {KATEGORI.map((o) => <option key={o} value={o}>{o}</option>)}
              </select></label>
            <label className="block"><span className="mb-1 block text-xs text-muted">Bütçe (₺) *</span>
              <input type="number" className={input} value={String(draft.butce ?? "")} onChange={(e) => setDraft((d) => ({ ...d, butce: e.target.valueAsNumber || "" }))} /></label>
            <label className="block"><span className="mb-1 block text-xs text-muted">Gerçekleşen (₺)</span>
              <input type="number" className={input} value={String(draft.gerceklesen ?? "")} onChange={(e) => setDraft((d) => ({ ...d, gerceklesen: e.target.valueAsNumber || "" }))} /></label>
          </div>
          {err && <p className="mt-2 text-xs text-critical">{err}</p>}
          <div className="mt-3 flex gap-2">
            <button onClick={save} className="rounded-lg bg-neon-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-neon-blue/90">Kaydet</button>
            <button onClick={() => setOpen(false)} className="rounded-lg border border-line px-4 py-2 text-sm text-ink transition hover:bg-elevated">Vazgeç</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="px-3 py-2 font-medium text-muted">Kalem</th>
              <th className="px-3 py-2 font-medium text-muted">Kategori</th>
              <th className="px-3 py-2 text-right font-medium text-muted">Bütçe</th>
              <th className="px-3 py-2 text-right font-medium text-muted">Gerçekleşen</th>
              <th className="px-3 py-2 text-right font-medium text-muted">Fark</th>
              <th className="px-3 py-2 text-right font-medium text-muted">Sapma</th>
              <th className="px-3 py-2 font-medium text-muted">Karşılaştırma</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const b = Number(r.butce) || 0, g = Number(r.gerceklesen) || 0, fark = g - b;
              const sapma = b ? Math.round((fark / b) * 1000) / 10 : 0;
              return (
                <tr key={String(r.id)} className="border-b border-line/60 transition hover:bg-white/[0.02]">
                  <td className="px-3 py-2.5 font-medium text-ink">{String(r.kalem ?? "—")}</td>
                  <td className="px-3 py-2.5"><span className="chip border-line text-muted">{String(r.kategori || "—")}</span></td>
                  <td className="px-3 py-2.5 text-right text-ink nums">{showAmounts ? money(b) : "•••••"}</td>
                  <td className="px-3 py-2.5 text-right text-ink nums">{showAmounts ? money(g) : "•••••"}</td>
                  <td className={`px-3 py-2.5 text-right font-semibold nums ${fark > 0 ? "text-critical" : "text-good"}`}>{showAmounts ? `${fark > 0 ? "+" : fark < 0 ? "−" : ""}${money(Math.abs(fark))}` : "•••••"}</td>
                  <td className={`px-3 py-2.5 text-right font-semibold nums ${fark > 0 ? "text-critical" : "text-good"}`}>{showAmounts ? `${sapma > 0 ? "+" : ""}%${sapma}` : "•••••"}</td>
                  <td className="px-3 py-2.5">
                    <div className="w-40 space-y-1">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5" title="Bütçe">
                        <div className="h-full rounded-full bg-neon-blue" style={{ width: `${(b / maxVal) * 100}%` }} />
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5" title="Gerçekleşen">
                        <div className={`h-full rounded-full ${g > b ? "bg-critical" : "bg-good"}`} style={{ width: `${(g / maxVal) * 100}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button onClick={() => deleteRecord(BUDGET_ID, String(r.id))} className="rounded-md p-1 text-muted transition hover:text-critical" aria-label="Sil"><Trash2 size={14} /></button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-sm text-muted">Kalem yok.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="mt-3 flex items-center gap-2 text-[11px] text-faint">
        <span className="inline-flex items-center gap-1"><span className="h-1.5 w-3 rounded-full bg-neon-blue" /> Bütçe</span>
        <span className="inline-flex items-center gap-1"><span className="h-1.5 w-3 rounded-full bg-good" /> Gerçekleşen (bütçe içinde)</span>
        <span className="inline-flex items-center gap-1"><span className="h-1.5 w-3 rounded-full bg-critical" /> Gerçekleşen (aşım)</span>
      </p>
    </section>
  );
}
