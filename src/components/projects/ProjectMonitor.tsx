import { useMemo } from "react";
import { AlertTriangle, CalendarDays, Clock, Flag, GanttChartSquare, Milestone, TrendingUp, UserCheck } from "lucide-react";
import { useModules } from "@/context/ModulesContext";
import {
  PRIORITY_META,
  TASK_STATUS_META,
  TASK_STATUS_ORDER,
  type Priority,
  type Project,
  type TaskStatus,
} from "@/types/projects";

const DAY = 86_400_000;
const TODAY = "2026-10-14";
const diffDays = (from: string, to: string) => Math.round((new Date(to).getTime() - new Date(from).getTime()) / DAY);
const dmy = (iso: string) => (iso ? iso.split("-").reverse().join(".") : "—");
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function Card({ title, icon, children, className = "" }: { title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`card p-5 ${className}`}>
      <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted">{icon} {title}</h3>
      {children}
    </section>
  );
}

const MS_COLOR: Record<string, string> = { "Planlandı": "#9699a6", "Devam Ediyor": "#fdab3d", "Tamamlandı": "#00c875", "Gecikti": "#e2445c" };

export default function ProjectMonitor({ project: p }: { project: Project }) {
  const { getModule } = useModules();
  const milestones = (getModule("mod-T-0047")?.records ?? []) as Record<string, unknown>[];
  const m = useMemo(() => {
    const tasks = p.tasks;
    const kalanGun = diffDays(TODAY, p.endDate);
    const tamamlanma = tasks.length ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / tasks.length) : 0;
    const byStatus = TASK_STATUS_ORDER.map((k) => ({ k, n: tasks.filter((t) => t.status === k).length }));
    const geciken = tasks.filter((t) => diffDays(TODAY, t.end) < 0 && t.status !== "tamamlandi");
    const byOwner = Object.entries(tasks.reduce<Record<string, number>>((a, t) => ((a[t.owner] = (a[t.owner] || 0) + 1), a), {}));
    const byPriority = (Object.keys(PRIORITY_META) as Priority[]).map((k) => ({ k, n: tasks.filter((t) => t.priority === k).length })).filter((x) => x.n > 0);
    const range = Math.max(1, diffDays(p.startDate, p.endDate));
    const efektif = Math.round((p.effort * tamamlanma) / 100);
    return { kalanGun, tamamlanma, byStatus, geciken, byOwner, byPriority, range, efektif, taskCount: tasks.length };
  }, [p]);

  const PRIORITY_COLOR: Record<Priority, string> = { dusuk: "#9699a6", orta: "#3b82f6", yuksek: "#f59e0b", kritik: "#ef4444" };

  // Gantt bar konumları (bağımlılık okları için y merkezleri dahil)
  const ROW = 30;
  const bars = p.tasks.map((t, i) => {
    const left = clamp((diffDays(p.startDate, t.start) / m.range) * 100, 0, 100);
    const width = clamp((diffDays(t.start, t.end) / m.range) * 100, 2, 100 - left);
    return { t, i, left, width, y: i * ROW + ROW / 2 };
  });

  return (
    <div className="space-y-6">
      {/* 1 — Zaman ve Planlama */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Zaman ve Planlama" icon={<CalendarDays size={15} />}>
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between"><span className="text-muted">Başlangıç</span><span className="text-ink nums">{dmy(p.startDate)}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted">Bitiş (Deadline)</span><span className="text-ink nums">{dmy(p.endDate)}</span></div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-muted"><Clock size={13} /> Kalan Süre</span>
              <span className={`font-semibold nums ${m.kalanGun < 0 ? "text-critical" : m.kalanGun < 30 ? "text-warning" : "text-good"}`}>
                {m.kalanGun < 0 ? `${Math.abs(m.kalanGun)} gün gecikti` : `${m.kalanGun} gün`}
              </span>
            </div>
          </div>
        </Card>

        {/* Durum & İlerleme özet */}
        <Card title="Durum ve İlerleme" icon={<TrendingUp size={15} />}>
          <div className="mb-2 flex items-end justify-between">
            <span className="text-xs text-muted">Tamamlanma Oranı</span>
            <span className="text-2xl font-bold text-ink nums">%{m.tamamlanma}</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/5">
            <div className="h-full rounded-full bg-gradient-to-r from-neon-blue to-neon-emeraldGlow" style={{ width: `${m.tamamlanma}%` }} />
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <AlertTriangle size={14} className={m.geciken.length ? "text-critical" : "text-muted"} />
            <span className="text-muted">Geciken Görev:</span>
            <span className={`font-semibold nums ${m.geciken.length ? "text-critical" : "text-ink"}`}>{m.geciken.length}</span>
          </div>
        </Card>

        {/* Efor */}
        <Card title="Kaynak — Adam/Saat (Efor)" icon={<UserCheck size={15} />}>
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between"><span className="text-muted">Tahmini Efor</span><span className="text-ink nums">{p.effort.toLocaleString("tr-TR")} a/s</span></div>
            <div className="flex items-center justify-between"><span className="text-muted">Gerçekleşen (tahmini)</span><span className="text-ink nums">{m.efektif.toLocaleString("tr-TR")} a/s</span></div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
              <div className="h-full rounded-full bg-gradient-to-r from-neon-violet to-neon-blue" style={{ width: `${clamp((m.efektif / Math.max(1, p.effort)) * 100, 0, 100)}%` }} />
            </div>
          </div>
        </Card>
      </div>

      {/* Gantt / Zaman Çizelgesi — bağımlılık oklarıyla */}
      <Card title="Gantt / Zaman Çizelgesi" icon={<GanttChartSquare size={15} />}>
        {m.taskCount === 0 ? (
          <p className="text-sm text-muted">Görev yok.</p>
        ) : (
          <>
            <div className="relative" style={{ height: bars.length * ROW }}>
              {bars.map((b) => (
                <div key={b.t.id} className="grid grid-cols-[180px_1fr] items-center gap-3" style={{ height: ROW }}>
                  <span className="truncate text-xs text-ink">{b.t.name}</span>
                  <div className="relative h-5 rounded-md bg-white/5">
                    <div className="absolute top-0.5 h-4 rounded-md" style={{ left: `${b.left}%`, width: `${b.width}%`, backgroundColor: TASK_STATUS_META[b.t.status].color }} title={`${dmy(b.t.start)} → ${dmy(b.t.end)} · %${b.t.progress}`} />
                  </div>
                </div>
              ))}

              {/* Bağımlılık okları (ardışık: her görev bir öncekine bağlı) */}
              <svg className="pointer-events-none absolute inset-y-0" style={{ left: 192, right: 0, width: "calc(100% - 192px)" }} preserveAspectRatio="none">
                <defs>
                  <marker id="dep-arrow" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M0 0 L8 4 L0 8 z" fill="#8b5cf6" />
                  </marker>
                </defs>
                {bars.flatMap((succ) =>
                  (succ.t.dependsOn ?? []).map((predId) => {
                    const pred = bars.find((x) => x.t.id === predId);
                    if (!pred) return null;
                    const px = pred.left + pred.width; // öncülün bitişi
                    const sx = succ.left;              // ardılın başlangıcı
                    const mx = Math.max(px + 1.5, (px + sx) / 2);
                    const stroke = "#8b5cf6";
                    return (
                      <g key={`${predId}-${succ.t.id}`} opacity="0.75">
                        <line x1={`${px}%`} y1={pred.y} x2={`${mx}%`} y2={pred.y} stroke={stroke} strokeWidth="1.5" />
                        <line x1={`${mx}%`} y1={pred.y} x2={`${mx}%`} y2={succ.y} stroke={stroke} strokeWidth="1.5" />
                        <line x1={`${mx}%`} y1={succ.y} x2={`${Math.max(sx, mx)}%`} y2={succ.y} stroke={stroke} strokeWidth="1.5" markerEnd="url(#dep-arrow)" />
                      </g>
                    );
                  }),
                )}
              </svg>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[10px] text-faint nums">{dmy(p.startDate)}</span>
              <span className="flex items-center gap-1 text-[10px] text-faint"><span className="h-px w-4 bg-neon-violet" />→ bağımlılık (önce bitmeli)</span>
              <span className="text-[10px] text-faint nums">{dmy(p.endDate)}</span>
            </div>
          </>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Görev Statüleri */}
        <Card title="Görev Statüleri" icon={<Flag size={15} />} className="lg:col-span-1">
          <div className="space-y-2">
            {m.byStatus.map(({ k, n }) => (
              <div key={k} className="flex items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: TASK_STATUS_META[k as TaskStatus].color }} />
                <span className="flex-1 text-sm text-muted">{TASK_STATUS_META[k as TaskStatus].label}</span>
                <span className="text-sm font-semibold text-ink nums">{n}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Kilometre Taşları (T-0047 tablosundan) */}
        <Card title="Kilometre Taşları" icon={<Milestone size={15} />}>
          <ol className="space-y-2.5">
            {[...milestones].sort((a, b) => String(a.hedef_tarih ?? "").localeCompare(String(b.hedef_tarih ?? ""))).map((ms) => (
              <li key={String(ms.id)} className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: MS_COLOR[String(ms.durum)] ?? "#9699a6" }} />
                <div className="min-w-0">
                  <p className="truncate text-sm text-ink">{String(ms.ad)}</p>
                  <p className="text-[11px] text-muted nums">{dmy(String(ms.hedef_tarih ?? ""))} · {String(ms.durum)} · %{Number(ms.tamamlanma) || 0}</p>
                </div>
              </li>
            ))}
            {milestones.length === 0 && <li className="text-sm text-muted">Kilometre taşı yok — aşağıdaki tablodan ekleyin.</li>}
          </ol>
        </Card>

        {/* Sorumlu & Öncelik */}
        <Card title="Sorumlu & Öncelik" icon={<UserCheck size={15} />}>
          <p className="mb-1 text-[11px] font-semibold uppercase text-faint">Atanan Kişi</p>
          <div className="mb-3 space-y-1.5">
            {m.byOwner.map(([owner, n]) => (
              <div key={owner} className="flex items-center justify-between text-sm">
                <span className="truncate text-ink">{owner}</span>
                <span className="text-muted nums">{n} görev</span>
              </div>
            ))}
            {m.byOwner.length === 0 && <p className="text-sm text-muted">—</p>}
          </div>
          <p className="mb-1 text-[11px] font-semibold uppercase text-faint">Öncelik</p>
          <div className="space-y-1.5">
            {m.byPriority.map(({ k, n }) => (
              <div key={k}>
                <div className="mb-0.5 flex items-center justify-between text-xs"><span className="text-muted">{PRIORITY_META[k].label}</span><span className="text-ink nums">{n}</span></div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full" style={{ width: `${(n / Math.max(1, m.taskCount)) * 100}%`, backgroundColor: PRIORITY_COLOR[k] }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {m.geciken.length > 0 && (
        <Card title="Geciken Görevler (Kritik)" icon={<AlertTriangle size={15} />}>
          <ul className="space-y-1.5">
            {m.geciken.map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded-lg border border-critical/30 bg-critical/5 px-3 py-2 text-sm">
                <span className="text-ink">{t.name} <span className="text-muted">· {t.owner}</span></span>
                <span className="text-critical nums">Bitiş: {dmy(t.end)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
