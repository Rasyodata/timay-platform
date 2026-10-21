import { useState } from "react";
import { ChevronLeft, ListChecks, LayoutGrid, Table2, Plus, X, Trash2, UserPlus, Clock, Bot, Play, Check, Loader2 } from "lucide-react";
import { useModules } from "@/context/ModulesContext";
import { useUsers } from "@/context/UsersContext";
import ProjectTableCard, { RecordForm } from "@/components/projects/ProjectTableCard";
import type { DynamicRecord } from "@/types/modules";
import type { View } from "@/App";

const MOD = "mod-T-0056";
const STAGE_ACCENT: Record<string, string> = {
  "Yapılacak": "#8795A8", "Devam Ediyor": "#0A4EA2", "Beklemede": "#B5731A", "Tamamlandı": "#1E7A46", "Gecikti": "#C1292E",
};
const ONCELIK_ACCENT: Record<string, string> = { "Düşük": "#8795A8", "Orta": "#0A4EA2", "Yüksek": "#B5731A", "Acil": "#C1292E" };
const initials = (s: string) => s.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

// ── C) Claude AI Otomasyon pipeline'ı (prototipte simülasyon) ──
const AI_STEPS = ["Görevi analiz et", "Alt görevlere böl", "Kod geliştir", "Test et", "Sonucu doğrula", "Tamamla & raporla"];

function AIOtomasyon({ task, onApply }: { task: DynamicRecord; onApply: (patch: Record<string, unknown>) => void }) {
  const [step, setStep] = useState(-1); // -1 bekliyor, 0..n çalışıyor/bitti
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const run = () => {
    if (running) return;
    setRunning(true); setDone(false); setStep(0);
    let i = 0;
    const tick = () => {
      i += 1;
      if (i < AI_STEPS.length) { setStep(i); setTimeout(tick, 900); }
      else { setStep(AI_STEPS.length); setRunning(false); setDone(true); onApply({ durum: "Tamamlandı", ilerleme: 100, harcanan_saat: Number(task.tahmini_saat) || task.harcanan_saat }); }
    };
    setTimeout(tick, 900);
  };

  return (
    <div className="mt-4 rounded-xl border border-neon-blue/30 bg-neon-blue/5 p-4">
      <div className="flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-1.5 text-sm font-semibold text-ink"><Bot size={16} className="text-neon-blue" /> Claude AI Görev Otomasyonu</h4>
        <button onClick={run} disabled={running} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition ${running ? "cursor-wait bg-faint/50" : "bg-neon-blue hover:opacity-90"}`}>
          {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />} {running ? "Çalışıyor…" : done ? "Tekrar Çalıştır" : "Claude ile Çalıştır"}
        </button>
      </div>
      <ol className="mt-3 space-y-1.5">
        {AI_STEPS.map((s, i) => {
          const state = step > i || done ? "done" : step === i && running ? "run" : "wait";
          return (
            <li key={s} className="flex items-center gap-2 text-xs">
              <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${state === "done" ? "bg-good text-white" : state === "run" ? "bg-neon-blue text-white" : "border border-line text-faint"}`}>
                {state === "done" ? <Check size={11} /> : state === "run" ? <Loader2 size={11} className="animate-spin" /> : i + 1}
              </span>
              <span className={state === "wait" ? "text-muted" : "text-ink"}>{s}</span>
            </li>
          );
        })}
      </ol>
      {done && <p className="mt-2 rounded-lg bg-good/10 px-2 py-1 text-[11px] text-good">✓ Görev Claude tarafından tamamlandı ve doğrulandı (simülasyon).</p>}
      <p className="mt-2 text-[10px] text-faint">Prototipte simülasyon. Canlıda: Claude API + sandbox (kod/test çalıştırma) + CI ile gerçek otomasyon; her adım loglanır ve insan onayına sunulur.</p>
    </div>
  );
}

export default function GorevYonetimi({ onNavigate }: { onNavigate: (v: View) => void }) {
  const { getModule, updateRecord, deleteRecord } = useModules();
  const { currentUser, users } = useUsers();
  const mod = getModule(MOD);
  const [view, setView] = useState<"pano" | "tablo">("pano");
  const [modal, setModal] = useState<DynamicRecord | "new" | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [fAtanan, setFAtanan] = useState(""); // "", "me", or user name
  const [fOncelik, setFOncelik] = useState("");

  if (!mod) return <div className="card p-5 text-sm text-muted">Görev tablosu bulunamadı.</div>;
  const stages = (mod.fields.find((f) => f.code === "durum")?.options ?? []) as string[];
  const oncelikler = (mod.fields.find((f) => f.code === "oncelik")?.options ?? []) as string[];
  const all = mod.records as DynamicRecord[];
  const records = all.filter((r) =>
    (!fAtanan || (fAtanan === "me" ? String(r.atanan) === currentUser.name : String(r.atanan) === fAtanan)) &&
    (!fOncelik || String(r.oncelik) === fOncelik));
  const byStage = (st: string) => records.filter((r) => String(r.durum ?? "") === st);

  const drop = (st: string) => { if (dragId) updateRecord(MOD, dragId, { durum: st }); setDragId(null); setOver(null); };
  const banaAta = (r: DynamicRecord) => updateRecord(MOD, String(r.id), { atanan: currentUser.name });
  const benimAcik = all.filter((r) => String(r.atanan) === currentUser.name && String(r.durum) !== "Tamamlandı").length;

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 p-4 md:p-6">
      <button onClick={() => onNavigate("buro-merkezi")} className="inline-flex items-center gap-1 text-xs text-muted transition hover:text-ink"><ChevronLeft size={14} /> Büro Yönetimi</button>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-ink"><ListChecks size={22} className="text-neon-blue" /> Görev Yönetimi <span className="rounded-md border border-line bg-base/60 px-1.5 py-0.5 font-mono text-[11px] font-normal text-muted">T-0056</span></h1>
          <p className="mt-1 text-sm text-muted">Jira/ClickUp tarzı · çalışanlar görev alır · süre takibi · Claude AI otomasyonu. Üzerinizde <b className="text-ink">{benimAcik}</b> açık görev.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={fAtanan} onChange={(e) => setFAtanan(e.target.value)} className="rounded-lg border border-line bg-base/60 px-2.5 py-1.5 text-sm text-ink outline-none">
            <option value="">Tüm atananlar</option>
            <option value="me">Bana Atananlar</option>
            {users.filter((u) => u.active).map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
          </select>
          <select value={fOncelik} onChange={(e) => setFOncelik(e.target.value)} className="rounded-lg border border-line bg-base/60 px-2.5 py-1.5 text-sm text-ink outline-none">
            <option value="">Tüm öncelikler</option>
            {oncelikler.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <div className="flex overflow-hidden rounded-lg border border-line">
            <button onClick={() => setView("pano")} className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition ${view === "pano" ? "bg-neon-blue text-white" : "text-muted hover:bg-elevated"}`}><LayoutGrid size={14} /> Pano</button>
            <button onClick={() => setView("tablo")} className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition ${view === "tablo" ? "bg-neon-blue text-white" : "text-muted hover:bg-elevated"}`}><Table2 size={14} /> Tablo</button>
          </div>
          <button onClick={() => setModal("new")} className="flex items-center gap-1.5 rounded-lg bg-neon-blue px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90"><Plus size={15} /> Görev</button>
        </div>
      </header>

      {view === "tablo" ? (
        <ProjectTableCard moduleId={MOD} />
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-3">
          {stages.map((st) => {
            const accent = STAGE_ACCENT[st] ?? "#0A4EA2";
            const cards = byStage(st);
            return (
              <div key={st} onDragOver={(e) => { e.preventDefault(); setOver(st); }} onDragLeave={() => setOver((s) => (s === st ? null : s))} onDrop={() => drop(st)}
                className={`flex w-[290px] shrink-0 flex-col rounded-xl border bg-base/60 transition ${over === st ? "border-neon-blue ring-2 ring-neon-blue/30" : "border-line"}`}>
                <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2" style={{ borderTopColor: accent, borderTopWidth: 3 }}>
                  <span className="flex items-center gap-2 text-sm font-semibold text-ink"><span className="h-2 w-2 rounded-full" style={{ background: accent }} /> {st}</span>
                  <span className="rounded-full bg-elevated px-1.5 text-[11px] font-medium text-muted">{cards.length}</span>
                </div>
                <div className="flex min-h-[80px] flex-1 flex-col gap-2 p-2">
                  {cards.map((r) => {
                    const onc = ONCELIK_ACCENT[String(r.oncelik)] ?? "#8795A8";
                    const atanmis = String(r.atanan || "");
                    const pct = Math.min(100, Math.max(0, Number(r.ilerleme) || 0));
                    return (
                      <div key={r.id} draggable onDragStart={() => setDragId(String(r.id))} onDragEnd={() => { setDragId(null); setOver(null); }}
                        className={`rounded-lg border border-line bg-panel p-3 shadow-sm transition hover:border-neon-blue/50 ${dragId === String(r.id) ? "opacity-40" : ""}`}>
                        <button onClick={() => setModal(r)} className="block w-full text-left text-sm font-semibold leading-tight text-ink">{String(r.baslik ?? "—")}</button>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {r.oncelik ? <span className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ background: `${onc}14`, color: onc }}>{String(r.oncelik)}</span> : null}
                          {String(r.etiket || "").split(",").map((t) => t.trim()).filter(Boolean).slice(0, 2).map((t) => <span key={t} className="rounded bg-elevated px-1.5 py-0.5 text-[10px] text-muted">{t}</span>)}
                          {(r.tahmini_saat || r.harcanan_saat) ? <span className="inline-flex items-center gap-0.5 text-[10px] text-faint"><Clock size={9} />{Number(r.harcanan_saat) || 0}/{Number(r.tahmini_saat) || 0}s</span> : null}
                        </div>
                        {pct > 0 && <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-elevated"><div className="h-full rounded-full bg-neon-blue" style={{ width: `${pct}%` }} /></div>}
                        <div className="mt-2 flex items-center justify-between">
                          {atanmis
                            ? <span className="inline-flex items-center gap-1 text-[11px] text-muted"><span className="grid h-5 w-5 place-items-center rounded-full bg-neon-blue/10 text-[9px] font-semibold text-neon-blue">{initials(atanmis)}</span>{atanmis.split(" ")[0]}</span>
                            : <span className="text-[11px] text-faint">Atanmadı</span>}
                          {atanmis !== currentUser.name && <button onClick={() => banaAta(r)} className="inline-flex items-center gap-0.5 rounded border border-neon-blue/40 px-1.5 py-0.5 text-[10px] font-medium text-neon-blue transition hover:bg-neon-blue/10"><UserPlus size={10} /> Bana Ata</button>}
                        </div>
                      </div>
                    );
                  })}
                  {cards.length === 0 && <p className="grid flex-1 place-items-center text-[11px] text-faint">Buraya sürükleyin</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-10 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="w-full max-w-2xl rounded-2xl border border-line bg-panel shadow-card animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <h3 className="text-sm font-semibold text-ink">{modal === "new" ? "Yeni Görev" : String((modal as DynamicRecord).baslik ?? "Görev")}</h3>
              <div className="flex items-center gap-1">
                {modal !== "new" && <button onClick={() => { deleteRecord(MOD, String((modal as DynamicRecord).id)); setModal(null); }} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-critical/10 hover:text-critical"><Trash2 size={15} /></button>}
                <button onClick={() => setModal(null)} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-elevated"><X size={16} /></button>
              </div>
            </div>
            <div className="p-4">
              <RecordForm mod={mod} initial={modal === "new" ? undefined : (modal as DynamicRecord)} onClose={() => setModal(null)} />
              {modal !== "new" && <AIOtomasyon task={modal as DynamicRecord} onApply={(patch) => updateRecord(MOD, String((modal as DynamicRecord).id), patch)} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
