import { useState } from "react";
import { LayoutGrid, Table2, Plus, X, Trash2, GripVertical } from "lucide-react";
import { useModules } from "@/context/ModulesContext";
import { fmtNum } from "@/lib/format";
import ProjectTableCard, { RecordForm } from "@/components/projects/ProjectTableCard";
import type { DynamicRecord } from "@/types/modules";

const MOD_ID = "mod-T-0011";

// Aşama → vurgu rengi (banka/kurumsal paleti).
const STAGE_ACCENT: Record<string, string> = {
  "Yeni / Lead": "#8795A8",
  "İletişim Kuruldu": "#0A4EA2",
  "Teklif Verildi": "#4B3FB0",
  "Müzakere": "#B5731A",
  "Kazanıldı": "#1E7A46",
  "Kaybedildi": "#C1292E",
};

const money = (v: unknown) => `${fmtNum(Number(v) || 0)} ₺`;
const initials = (s: string) => s.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export default function PipelineBoard() {
  const { getModule, updateRecord, deleteRecord } = useModules();
  const mod = getModule(MOD_ID);
  const [view, setView] = useState<"pano" | "tablo">("pano");
  const [modal, setModal] = useState<DynamicRecord | "new" | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);

  if (!mod) return <div className="card p-5 text-sm text-muted">Satış Fırsatları tablosu bulunamadı.</div>;

  const stages = (mod.fields.find((f) => f.code === "asama")?.options ?? []) as string[];
  const records = mod.records as DynamicRecord[];
  const byStage = (st: string) => records.filter((r) => String(r.asama ?? "") === st);
  const stageTotal = (st: string) => byStage(st).reduce((a, r) => a + (Number(r.deger) || 0), 0);
  const toplamPipeline = records.filter((r) => !["Kazanıldı", "Kaybedildi"].includes(String(r.asama))).reduce((a, r) => a + (Number(r.deger) || 0), 0);
  const kazanilan = stageTotal("Kazanıldı");

  const drop = (st: string) => {
    if (dragId) updateRecord(MOD_ID, dragId, { asama: st });
    setDragId(null); setOverStage(null);
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 p-4 md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-ink"><LayoutGrid size={20} className="text-neon-blue" /> Satış Fırsatları — Pipeline</h2>
          <p className="mt-1 text-sm text-muted">
            Açık pipeline: <b className="text-ink">{money(toplamPipeline)}</b> · Kazanılan: <b className="text-good">{money(kazanilan)}</b> · {records.length} fırsat
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-line">
            <button onClick={() => setView("pano")} className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition ${view === "pano" ? "bg-neon-blue text-white" : "text-muted hover:bg-elevated"}`}><LayoutGrid size={14} /> Pano</button>
            <button onClick={() => setView("tablo")} className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition ${view === "tablo" ? "bg-neon-blue text-white" : "text-muted hover:bg-elevated"}`}><Table2 size={14} /> Tablo</button>
          </div>
          <button onClick={() => setModal("new")} className="flex items-center gap-1.5 rounded-lg bg-neon-blue px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90"><Plus size={15} /> Fırsat Ekle</button>
        </div>
      </header>

      {view === "tablo" ? (
        <ProjectTableCard moduleId={MOD_ID} />
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-3">
          {stages.map((st) => {
            const accent = STAGE_ACCENT[st] ?? "#0A4EA2";
            const cards = byStage(st);
            return (
              <div
                key={st}
                onDragOver={(e) => { e.preventDefault(); setOverStage(st); }}
                onDragLeave={() => setOverStage((s) => (s === st ? null : s))}
                onDrop={() => drop(st)}
                className={`flex w-[260px] shrink-0 flex-col rounded-xl border bg-base/60 transition ${overStage === st ? "border-neon-blue ring-2 ring-neon-blue/30" : "border-line"}`}
              >
                <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2" style={{ borderTopColor: accent, borderTopWidth: 3 }}>
                  <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <span className="h-2 w-2 rounded-full" style={{ background: accent }} /> {st}
                  </span>
                  <span className="rounded-full bg-elevated px-1.5 text-[11px] font-medium text-muted">{cards.length}</span>
                </div>
                <div className="px-3 py-1 text-[11px] font-medium text-muted">{money(stageTotal(st))}</div>
                <div className="flex min-h-[80px] flex-1 flex-col gap-2 p-2">
                  {cards.map((r) => (
                    <button
                      key={r.id}
                      draggable
                      onDragStart={() => setDragId(String(r.id))}
                      onDragEnd={() => { setDragId(null); setOverStage(null); }}
                      onClick={() => setModal(r)}
                      className={`group rounded-lg border border-line bg-panel p-3 text-left shadow-sm transition hover:border-neon-blue/50 hover:shadow ${dragId === String(r.id) ? "opacity-40" : ""}`}
                    >
                      <div className="flex items-start gap-1.5">
                        <GripVertical size={13} className="mt-0.5 shrink-0 text-faint opacity-0 transition group-hover:opacity-100" />
                        <span className="text-sm font-semibold leading-tight text-ink">{String(r.baslik ?? "—")}</span>
                      </div>
                      {r.cari ? <p className="mt-1 truncate text-xs text-muted">{String(r.cari)}</p> : null}
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-sm font-bold" style={{ color: accent }}>{money(r.deger)}</span>
                        <span className="flex items-center gap-1.5">
                          {r.olasilik != null && r.olasilik !== "" ? <span className="rounded bg-elevated px-1.5 py-0.5 text-[10px] font-medium text-muted">%{String(r.olasilik)}</span> : null}
                          {r.sorumlu ? <span className="grid h-6 w-6 place-items-center rounded-full bg-neon-blue/10 text-[10px] font-semibold text-neon-blue" title={String(r.sorumlu)}>{initials(String(r.sorumlu))}</span> : null}
                        </span>
                      </div>
                    </button>
                  ))}
                  {cards.length === 0 && <p className="grid flex-1 place-items-center text-[11px] text-faint">Buraya sürükleyin</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Detay / Ekle Modalı (Pipedrive tarzı) ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-10 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="w-full max-w-2xl rounded-2xl border border-line bg-panel shadow-card animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <h3 className="text-sm font-semibold text-ink">{modal === "new" ? "Yeni Fırsat" : String((modal as DynamicRecord).baslik ?? "Fırsat")}</h3>
              <div className="flex items-center gap-1">
                {modal !== "new" && (
                  <button onClick={() => { deleteRecord(MOD_ID, String((modal as DynamicRecord).id)); setModal(null); }} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-critical/10 hover:text-critical" title="Sil"><Trash2 size={15} /></button>
                )}
                <button onClick={() => setModal(null)} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-elevated" title="Kapat"><X size={16} /></button>
              </div>
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
